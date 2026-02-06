const { Op } = require('sequelize');
const { ResourceUsage, PricingRule, VM } = require('../models');

const DEFAULT_CURRENCY = 'XAF';

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
  const cpuPerHour = Number(pricingRules.cpu?.unitPrice ?? 10);
  const ramPerGbHour = Number(pricingRules.ram?.unitPrice ?? 2);
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
  const cpuPerHour = Number(pricingRules.cpu?.unitPrice ?? 10);
  const ramPerGbHour = Number(pricingRules.ram?.unitPrice ?? 2);
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

module.exports = {
  getPricingRules,
  calculateConsumptionCost,
  calculateHourlyCost,
  aggregateMetricsForVM,
  calculateInvoiceForPeriod
};
