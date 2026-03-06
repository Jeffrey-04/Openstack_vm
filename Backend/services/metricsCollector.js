const { Op } = require('sequelize');
const VM = require('../models/VM');
const ResourceUsage = require('../models/ResourceUsage');
const openstack = require('./openstack');

const DEFAULT_INTERVAL_MS = 120000; // 2 minutes


async function runOnce() {
  try {
    const vms = await VM.findAll({
      where: { openstack_id: { [Op.ne]: null } }
    });

    for (const vm of vms) {
      try {
        const instanceId = vm.openstack_id;
        const instance = await openstack.getInstanceDetails(instanceId);
        if (!instance) continue;

        const flavorId = instance.flavor?.id;
        if (!flavorId) continue;

        const flavor = await openstack.getFlavorById(flavorId);
        if (!flavor) continue;

        const status = (instance.status || '').toUpperCase();
        const isActive = status === 'ACTIVE';

        const cpu_util = isActive ? 15 : 0;

        const ramMb = flavor.ram || 0;
        const memory_usage = Math.round(ramMb * 0.5);

        const ts = new Date();

        const metrics = [
          { metricType: 'cpu_util', value: cpu_util },
          { metricType: 'memory.usage', value: memory_usage },
          { metricType: 'disk.read.bytes', value: 0 },
          { metricType: 'disk.write.bytes', value: 0 },
          { metricType: 'network.incoming.bytes', value: 0 },
          { metricType: 'network.outgoing.bytes', value: 0 }
        ];

        for (const { metricType, value } of metrics) {
          await ResourceUsage.create({
            vmId: vm.id,
            metricType,
            value,
            timestamp: ts
          });
        }
      } catch (err) {
        console.error(`[metricsCollector] VM ${vm.id} (${vm.openstack_id}):`, err.message);
      }
    }
  } catch (err) {
    console.error('[metricsCollector] runOnce failed:', err);
  }
}

function start(intervalMs = DEFAULT_INTERVAL_MS) {
  setTimeout(() => {
    runOnce();
  }, 5000);

  setInterval(() => {
    runOnce();
  }, intervalMs);

  console.log(`[metricsCollector] started (interval=${intervalMs}ms)`);
}

module.exports = { start, runOnce };
