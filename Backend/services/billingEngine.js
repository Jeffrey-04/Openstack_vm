const { Op } = require('sequelize');
const { ResourceUsage, PricingRule, VM, VmRuntime, Invoice, InvoiceItem, UsageSlice, User, PaymentMethod, ScalingEvent } = require('../models');
const { createNotification } = require('./notificationService');
const openstack = require('../config/openstack');
const logger = require('../utils/logger');

const DEFAULT_CURRENCY = 'XAF';
const SLICE_MINUTES = 30;

/**
 * Facturation par tranche de 30 min (slice).
 * Montant = durationHours × ( vcpus × cpuPerHour + ramGb × ramPerGbHour + diskGb × storagePerGbHour ).
 * Tarifs par défaut (table pricing_rules, modifiables en admin) : cpu 200 XAF/vCPU/h, ram 50 XAF/GB/h, storage 0.01 XAF/GB/h.
 * Ex. 30 min (0,5 h), 1 vCPU, 1 GB RAM, 20 GB disque : 0,5 × (200 + 50 + 0,2) = 125,1 XAF.
 */

async function getPricingRules(effectiveDate = new Date()) {
  const dateStr = effectiveDate.toISOString().slice(0, 10);
  const rules = await PricingRule.findAll({
    where: { effectiveDate: { [Op.lte]: dateStr } },
    order: [['effectiveDate', 'DESC']]
  });
  const byResource = {};
  for (const r of rules) {
    if (!byResource[r.resourceType]) byResource[r.resourceType] = r;
  }
  return byResource;
}

function calculateConsumptionCost(metrics, pricingRules) {
  const breakdown = {};
  let total = 0;
  const cpuPerHour = Number(pricingRules.cpu?.unitPrice ?? 200);
  const ramPerGbHour = Number(pricingRules.ram?.unitPrice ?? 50);
  const storagePerGbMonth = Number(pricingRules.storage?.unitPrice ?? 0.5);
  const uptimeHours = Number(metrics.uptimeHours ?? 0);
  const cpuUtil = Number(metrics.cpu_util ?? 0) / 100;
  const ramGb = Number(metrics.ram_gb ?? 0);
  const diskGb = Number(metrics.disk_gb ?? 0);
  const cpuCost = uptimeHours * cpuUtil * (metrics.vcpus ?? 1) * cpuPerHour;
  breakdown.cpu = Math.round(cpuCost * 100) / 100;
  total += breakdown.cpu;
  const ramCost = uptimeHours * ramGb * ramPerGbHour;
  breakdown.memory = Math.round(ramCost * 100) / 100;
  total += breakdown.memory;
  const storageCost = diskGb * storagePerGbMonth * (uptimeHours / 730);
  breakdown.storage = Math.round(storageCost * 100) / 100;
  total += breakdown.storage;
  return { total: Math.round(total * 100) / 100, breakdown, currency: DEFAULT_CURRENCY };
}

function calculateHourlyCost(metrics, pricingRules) {
  const uptimeHours = Number(metrics.uptimeHours ?? 0);
  const vcpus = Number(metrics.vcpus ?? 1);
  const ramGb = Number(metrics.ram_gb ?? 0);
  const diskGb = Number(metrics.disk_gb ?? 0);
  const cpuPerHour = Number(pricingRules.cpu?.unitPrice ?? 200);
  const ramPerGbHour = Number(pricingRules.ram?.unitPrice ?? 50);
  const storagePerGbHour = Number(pricingRules.storage?.unitPrice ?? 0.01);
  const total =
    uptimeHours * (
      vcpus * cpuPerHour +
      ramGb * ramPerGbHour +
      diskGb * storagePerGbHour
    );
  return {
    total: Math.round(total * 100) / 100,
    breakdown: {
      cpu: Math.round(uptimeHours * vcpus * cpuPerHour * 100) / 100,
      memory: Math.round(uptimeHours * ramGb * ramPerGbHour * 100) / 100,
      storage: Math.round(uptimeHours * diskGb * storagePerGbHour * 100) / 100
    },
    currency: DEFAULT_CURRENCY
  };
}

async function aggregateMetricsForVM(vmId, periodStart, periodEnd) {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const usages = await ResourceUsage.findAll({
    where: { vmId, timestamp: { [Op.between]: [start, end] } },
    order: [['timestamp', 'ASC']]
  });
  const byType = {};
  for (const u of usages) {
    if (!byType[u.metricType]) byType[u.metricType] = [];
    byType[u.metricType].push(Number(u.value));
  }
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const uptimeHours = (end - start) / (1000 * 60 * 60);
  return {
    uptimeHours,
    cpu_util: avg(byType.cpu_util || []),
    memory_usage: avg(byType.memory_usage || []),
    disk_usage: avg(byType.disk_usage || []),
    vcpus: 1,
    ram_gb: 2,
    disk_gb: 20
  };
}

async function calculateInvoiceForPeriod(userId, periodStart, periodEnd) {
  const { VM } = require('../models');
  const vms = await VM.findAll({ where: { userId } });
  const pricingRules = await getPricingRules(new Date(periodEnd));
  const items = [];
  let totalAmount = 0;
  for (const vm of vms) {
    const metrics = await aggregateMetricsForVM(vm.id, periodStart, periodEnd);
    const cost = calculateHourlyCost(metrics, pricingRules);
    totalAmount += cost.total;
    items.push({
      description: `VM ${vm.instanceId} - Compute`,
      quantity: metrics.uptimeHours,
      unitPrice: cost.total / (metrics.uptimeHours || 1),
      total: cost.total
    });
  }
  return { totalAmount, items, currency: DEFAULT_CURRENCY };
}

/** Get flavor vcpus, ram (MB), disk (GB) from OpenStack (with simple cache to avoid hammering API). */
const flavorCache = new Map();
async function getFlavorSpecs(flavorId) {
  if (flavorCache.has(flavorId)) {
    return flavorCache.get(flavorId);
  }
  try {
    const data = await openstack.getFlavor(flavorId);
    const f = data.flavor || data;
    const specs = {
      vcpus: Number(f.vcpus) || 1,
      ramMb: Number(f.ram) || 512,
      diskGb: Number(f.disk) || 0
    };
    flavorCache.set(flavorId, specs);
    return specs;
  } catch (err) {
    return { vcpus: 1, ramMb: 512, diskGb: 20 };
  }
}

/** Cost for a given duration (hours) based on flavor and pricing rules. */
async function calculateSliceAmount(flavorId, durationHours) {
  const rules = await getPricingRules(new Date());
  const specs = await getFlavorSpecs(flavorId);
  const cpuPerHour = Number(rules.cpu?.unitPrice ?? 200);
  const ramPerGbHour = Number(rules.ram?.unitPrice ?? 50);
  const storagePerGbHour = Number(rules.storage?.unitPrice ?? 0.01);
  const ramGb = specs.ramMb / 1024;
  const total =
    durationHours *
    (specs.vcpus * cpuPerHour + ramGb * ramPerGbHour + specs.diskGb * storagePerGbHour);
  return Math.round(total * 100) / 100;
}

/** Last 30-min slice boundary ending at or before `now`. */
function getLastSliceEnd(now = new Date()) {
  const ms = now.getTime();
  const sliceMs = SLICE_MINUTES * 60 * 1000;
  return new Date(Math.floor(ms / sliceMs) * sliceMs);
}

/** Build usage per (userId, instanceId) for the slice [sliceStart, sliceEnd] from VmRuntime. Returns items with durationHours and intervals for prorata. */
async function getRuntimeOverlapsForSlice(sliceStart, sliceEnd) {
  const runtimes = await VmRuntime.findAll({
    where: {
      startedAt: { [Op.lt]: sliceEnd },
      [Op.or]: [
        { stoppedAt: null },
        { stoppedAt: { [Op.gt]: sliceStart } }
      ]
    }
  });
  const byKey = {};
  for (const r of runtimes) {
    const start = new Date(Math.max(r.startedAt.getTime(), sliceStart.getTime()));
    const end = r.stoppedAt
      ? new Date(Math.min(r.stoppedAt.getTime(), sliceEnd.getTime()))
      : new Date(sliceEnd.getTime());
    const durationHours = Math.max(0, (end - start) / (1000 * 60 * 60));
    if (durationHours <= 0) continue;
    const key = `${r.userId}:${r.instanceId}`;
    if (!byKey[key]) {
      byKey[key] = { userId: r.userId, instanceId: r.instanceId, durationHours: 0, intervals: [] };
    }
    byKey[key].durationHours += durationHours;
    byKey[key].intervals.push({ start, end });
  }
  return Object.values(byKey);
}

/**
 * Split [intervalStart, intervalEnd] into segments by flavor using ScalingEvents.
 * flavorAtEnd = flavor at intervalEnd (current VM flavor if no event at end).
 * Returns [{ start, end, flavorId }] with start/end as Date.
 */
async function getFlavorSegmentsForInterval(instanceId, intervalStart, intervalEnd, flavorAtEnd) {
  const events = await ScalingEvent.findAll({
    where: {
      instanceId,
      timestamp: { [Op.between]: [intervalStart, intervalEnd] }
    },
    order: [['timestamp', 'ASC']]
  });
  if (!events.length) {
    return [{ start: new Date(intervalStart.getTime()), end: new Date(intervalEnd.getTime()), flavorId: flavorAtEnd }];
  }
  const segments = [];
  let t = intervalStart.getTime();
  for (const ev of events) {
    const evTs = new Date(ev.timestamp).getTime();
    if (t < evTs) {
      segments.push({
        start: new Date(t),
        end: new Date(evTs),
        flavorId: ev.oldFlavorId || flavorAtEnd
      });
    }
    t = evTs;
  }
  if (t < intervalEnd.getTime()) {
    segments.push({
      start: new Date(t),
      end: new Date(intervalEnd.getTime()),
      flavorId: events[events.length - 1].newFlavorId || flavorAtEnd
    });
  }
  return segments;
}

/** Generate invoices for the last 30-min slice (only for ACTIVE runtime). Idempotent. */
async function runBillingJobForSlice(sliceEnd) {
  const sliceStart = new Date(sliceEnd.getTime() - SLICE_MINUTES * 60 * 1000);
  const overlaps = await getRuntimeOverlapsForSlice(sliceStart, sliceEnd);
  logger.info('Billing job slice', {
    sliceStart: sliceStart.toISOString(),
    sliceEnd: sliceEnd.toISOString(),
    overlapsCount: overlaps.length
  });
  if (overlaps.length === 0) return { invoicesCreated: 0 };

  const byUser = {};
  for (const o of overlaps) {
    if (!byUser[o.userId]) byUser[o.userId] = [];
    byUser[o.userId].push(o);
  }

  const MIN_USAGE_HOURS_FOR_INVOICE = 0.5; // 30 min d'utilisation effective pour générer une facture (éviter factures 0 FCFA)
  let invoicesCreated = 0;
  for (const [userId, userOverlaps] of Object.entries(byUser)) {
    const existing = await Invoice.findOne({
      where: { userId, periodStart: sliceStart, periodEnd: sliceEnd }
    });
    if (existing) continue;

    const totalDurationHours = userOverlaps.reduce((sum, o) => sum + (o.durationHours || 0), 0);
    if (totalDurationHours < MIN_USAGE_HOURS_FOR_INVOICE) {
      logger.info('Billing job: skip invoice (usage < 30 min)', { userId, totalDurationHours });
      continue;
    }

    const slices = [];
    let totalAmount = 0;
    for (const o of userOverlaps) {
      const vm = await VM.findOne({ where: { instanceId: o.instanceId, userId: o.userId } });
      const flavorAtEnd = vm?.flavorId || null;
      let amount = 0;
      const intervals = o.intervals || [];
      for (const { start: intStart, end: intEnd } of intervals) {
        const segments = await getFlavorSegmentsForInterval(o.instanceId, intStart, intEnd, flavorAtEnd);
        for (const seg of segments) {
          if (!seg.flavorId) continue;
          const segHours = (seg.end.getTime() - seg.start.getTime()) / (1000 * 60 * 60);
          if (segHours <= 0) continue;
          amount += await calculateSliceAmount(seg.flavorId, segHours);
        }
      }
      amount = Math.round(amount * 100) / 100;
      totalAmount += amount;
      slices.push({
        userId: o.userId,
        instanceId: o.instanceId,
        sliceStart,
        sliceEnd,
        amount,
        durationHours: o.durationHours
      });
    }

    const count = await Invoice.count();
    const invoiceNumber = `INV-${sliceEnd.getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const invoice = await Invoice.create({
      userId,
      invoiceNumber,
      periodStart: sliceStart,
      periodEnd: sliceEnd,
      totalAmount: Math.round(totalAmount * 100) / 100,
      currency: DEFAULT_CURRENCY,
      status: 'pending'
    });

    for (const s of slices) {
      await UsageSlice.create({
        userId: s.userId,
        instanceId: s.instanceId,
        sliceStart: s.sliceStart,
        sliceEnd: s.sliceEnd,
        amount: s.amount,
        currency: DEFAULT_CURRENCY,
        invoiceId: invoice.id
      });
      const unitPrice = s.durationHours > 0 ? s.amount / s.durationHours : 0;
      await InvoiceItem.create({
        invoiceId: invoice.id,
        description: `VM ${s.instanceId} - Compute (${(s.durationHours * 60).toFixed(0)} min)`,
        quantity: s.durationHours,
        unitPrice: Math.round(unitPrice * 100) / 100,
        total: Math.round(s.amount * 100) / 100
      });
    }
    await createNotification(userId, {
      type: 'invoice',
      title: 'Nouvelle facture',
      message: `Facture ${invoice.invoiceNumber} : ${Number(invoice.totalAmount).toLocaleString('fr-FR')} ${invoice.currency}`,
      link: '/client/billing'
    });
    invoicesCreated += 1;
  }
  if (invoicesCreated > 0) {
    logger.info('Billing job: invoices created', { count: invoicesCreated, sliceEnd: sliceEnd.toISOString() });
  }
  return { invoicesCreated };
}

/** Run the 30-min billing job for the last completed slice. */
async function runThirtyMinuteBillingJob() {
  const sliceEnd = getLastSliceEnd(new Date());
  return runBillingJobForSlice(sliceEnd);
}

/** Mark pending invoices for today as paid for users with paymentMode 'auto' and a payment method. */
async function runDailyPaymentJob() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const users = await User.findAll({
    where: { paymentMode: 'auto' },
    attributes: ['id']
  });
  let marked = 0;
  for (const u of users) {
    const hasCard = await PaymentMethod.findOne({ where: { userId: u.id }, attributes: ['id'] });
    if (!hasCard) continue;
    const [n] = await Invoice.update(
      { status: 'paid' },
      {
        where: {
          userId: u.id,
          status: 'pending',
          generatedAt: { [Op.gte]: todayStart, [Op.lt]: todayEnd }
        }
      }
    );
    marked += n;
  }
  return { usersProcessed: users.length, invoicesMarkedPaid: marked };
}

module.exports = {
  getPricingRules,
  calculateConsumptionCost,
  calculateHourlyCost,
  aggregateMetricsForVM,
  calculateInvoiceForPeriod,
  getFlavorSpecs,
  calculateSliceAmount,
  getLastSliceEnd,
  runBillingJobForSlice,
  runThirtyMinuteBillingJob,
  runDailyPaymentJob
};
