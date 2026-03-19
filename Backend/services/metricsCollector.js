const { Op } = require('sequelize');
const VM = require('../models/VM');
const ResourceUsage = require('../models/ResourceUsage');
const openstack = require('../config/openstack');
const gnocchi = require('./gnocchi');
const { normalizeMetricValue } = require('./metricsContract');

const DEFAULT_INTERVAL_MS = 120000; // 2 minutes

async function insertMetric(vmId, metricType, value, timestamp) {
  if (value == null || Number.isNaN(Number(value))) return;
  await ResourceUsage.create({
    vmId,
    metricType,
    value: Number(value),
    timestamp
  });
}

async function getVmCapacity(vm, projectId) {
  try {
    const data = await openstack.getServer(vm.instanceId, projectId);
    const server = data?.server ?? data;
    const flavorId = server?.flavor?.id ?? vm.flavorId;
    if (!flavorId) return { ramMb: null, diskGb: null };
    const flavorData = await openstack.getFlavor(flavorId, projectId);
    const flavor = flavorData?.flavor ?? flavorData;
    return {
      ramMb: Number(flavor?.ram) || null,
      diskGb: Number(flavor?.disk) || null
    };
  } catch {
    return { ramMb: null, diskGb: null };
  }
}

async function collectFromGnocchi(vm) {
  const instanceId = vm.instanceId || vm.openstack_id;
  if (!instanceId) return false;
  const projectId = vm.User?.openstackProjectId || null;
  const capacity = await getVmCapacity(vm, projectId);
  const metrics = await gnocchi.getInstanceMetrics(instanceId, projectId, { capacity });
  if (!metrics) return false;

  const hasAnySeries =
    (metrics.cpu_util && metrics.cpu_util.length) ||
    (metrics.memory_usage && metrics.memory_usage.length) ||
    (metrics.disk_usage && metrics.disk_usage.length) ||
    (metrics.network_incoming_bytes && metrics.network_incoming_bytes.length) ||
    (metrics.network_outgoing_bytes && metrics.network_outgoing_bytes.length);

  // Si Gnocchi renvoie une structure mais sans points, on bascule en heuristique pour alimenter la DB.
  if (!hasAnySeries) return false;
  const ts = new Date();

  if (metrics.cpu_util?.length) {
    const last = metrics.cpu_util[metrics.cpu_util.length - 1];
    await insertMetric(vm.id, 'cpu_util', last.value, last.timestamp || ts);
  }
  if (metrics.memory_usage?.length) {
    const last = metrics.memory_usage[metrics.memory_usage.length - 1];
    await insertMetric(vm.id, 'memory_usage', last.value, last.timestamp || ts);
  }
  if (metrics.disk_usage?.length) {
    const last = metrics.disk_usage[metrics.disk_usage.length - 1];
    await insertMetric(vm.id, 'disk_usage', last.value, last.timestamp || ts);
  }
  if (metrics.network_incoming_bytes?.length) {
    const last = metrics.network_incoming_bytes[metrics.network_incoming_bytes.length - 1];
    await insertMetric(vm.id, 'network_incoming_bytes', last.value, last.timestamp || ts);
  }
  if (metrics.network_outgoing_bytes?.length) {
    const last = metrics.network_outgoing_bytes[metrics.network_outgoing_bytes.length - 1];
    await insertMetric(vm.id, 'network_outgoing_bytes', last.value, last.timestamp || ts);
  }

  return true;
}

async function collectFallbackHeuristics(vm) {
  const instanceId = vm.instanceId || vm.openstack_id;
  if (!instanceId) return;
  const projectId = vm.User?.openstackProjectId || null;
  let data;
  try {
    data = await openstack.getServer(instanceId, projectId);
  } catch {
    return;
  }
  const instance = data?.server ?? data;
  if (!instance) return;

  const flavorId = instance.flavor?.id ?? vm.flavorId;
  if (!flavorId) return;

  let flavorData;
  try {
    flavorData = await openstack.getFlavor(flavorId, projectId);
  } catch {
    return;
  }
  const flavor = flavorData?.flavor ?? flavorData;
  if (!flavor) return;

  const status = (instance.status || '').toUpperCase();
  const isActive = status === 'ACTIVE';

  const cpu_util = isActive ? 15 : 0;
  const ramMb = flavor.ram || 0;
  const memory_usage = 50; // heuristique explicite en pourcentage
  const disk_usage = normalizeMetricValue('disk_usage', 5, { diskGb: Number(flavor.disk) || null });
  const ts = new Date();

  await Promise.all([
    insertMetric(vm.id, 'cpu_util', cpu_util, ts),
    insertMetric(vm.id, 'memory_usage', memory_usage, ts),
    insertMetric(vm.id, 'disk_usage', disk_usage ?? 0, ts),
    insertMetric(vm.id, 'network_incoming_bytes', 0, ts),
    insertMetric(vm.id, 'network_outgoing_bytes', 0, ts)
  ]);
}

async function runOnce() {
  try {
    const vms = await VM.findAll({
      where: { instanceId: { [Op.ne]: null } },
      include: [{ association: 'User', attributes: ['openstackProjectId'] }]
    });

    for (const vm of vms) {
      try {
        const usedGnocchi = await collectFromGnocchi(vm);
        if (!usedGnocchi) {
          await collectFallbackHeuristics(vm);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[metricsCollector] VM error', vm.id, vm.instanceId || vm.openstack_id, err.message);
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[metricsCollector] runOnce failed:', err);
  }
}

function start(intervalMs = DEFAULT_INTERVAL_MS) {
  // eslint-disable-next-line no-console
  console.log('[metricsCollector] config:', JSON.stringify({
    intervalMs,
    GNOCCHI_URL: process.env.GNOCCHI_URL || null,
    CEILOMETER_URL: process.env.CEILOMETER_URL || null,
    OPENSTACK_CACHE_TTL_MS: process.env.OPENSTACK_CACHE_TTL_MS,
    OPENSTACK_TIMEOUT_MS: process.env.OPENSTACK_TIMEOUT_MS
  }, null, 2));
  setTimeout(() => {
    runOnce();
  }, 5000);

  setInterval(() => {
    runOnce();
  }, intervalMs);

  // eslint-disable-next-line no-console
  console.log(`[metricsCollector] started (interval=${intervalMs}ms)`);
}

module.exports = { start, runOnce };
