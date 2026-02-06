const { ScalingPolicy, ScalingEvent } = require('../models');
const openstack = require('../config/openstack');
const { Op } = require('sequelize');

const COOLDOWN_MINUTES = 5;

async function isInCooldown(instanceId) {
  const last = await ScalingEvent.findOne({
    where: { instanceId },
    order: [['timestamp', 'DESC']]
  });
  if (!last) return false;
  const elapsed = (Date.now() - new Date(last.timestamp).getTime()) / (60 * 1000);
  return elapsed < COOLDOWN_MINUTES;
}

async function findNextFlavor(currentFlavorId, direction) {
  const data = await openstack.listFlavors();
  const flavors = (data.flavors || []).slice();
  flavors.sort((a, b) => (a.vcpus * 1024 + a.ram) - (b.vcpus * 1024 + b.ram));
  const idx = flavors.findIndex(f => f.id === currentFlavorId);
  if (idx < 0) return null;
  if (direction === 'up' && idx < flavors.length - 1) return flavors[idx + 1];
  if (direction === 'down' && idx > 0) return flavors[idx - 1];
  return null;
}

async function scaleUp(instanceId, policy, currentValue) {
  if (await isInCooldown(instanceId)) return;
  let server;
  try {
    server = await openstack.getServer(instanceId);
  } catch (e) {
    console.error('getServer failed:', e.message);
    return;
  }
  const sid = server.server?.id || server.id;
  const currentFlavorId = server.server?.flavor?.id || server.flavor?.id;
  if (!currentFlavorId) return;
  const nextFlavor = await findNextFlavor(currentFlavorId, 'up');
  if (!nextFlavor) return;
  try {
    await openstack.resizeServer(sid, nextFlavor.id);
    await ScalingEvent.create({
      instanceId: sid,
      action: 'scale_up',
      oldFlavorId: currentFlavorId,
      newFlavorId: nextFlavor.id,
      triggerMetric: policy.metricType,
      triggerValue: currentValue
    });
    console.log(`Scale up: ${sid} -> ${nextFlavor.name}`);
  } catch (err) {
    console.error('Scale up error:', err.message);
  }
}

async function scaleDown(instanceId, policy, currentValue) {
  if (await isInCooldown(instanceId)) return;
  let server;
  try {
    server = await openstack.getServer(instanceId);
  } catch (e) {
    console.error('getServer failed:', e.message);
    return;
  }
  const sid = server.server?.id || server.id;
  const currentFlavorId = server.server?.flavor?.id || server.flavor?.id;
  if (!currentFlavorId) return;
  const nextFlavor = await findNextFlavor(currentFlavorId, 'down');
  if (!nextFlavor) return;
  try {
    await openstack.resizeServer(sid, nextFlavor.id);
    await ScalingEvent.create({
      instanceId: sid,
      action: 'scale_down',
      oldFlavorId: currentFlavorId,
      newFlavorId: nextFlavor.id,
      triggerMetric: policy.metricType,
      triggerValue: currentValue
    });
    console.log(`Scale down: ${sid} -> ${nextFlavor.name}`);
  } catch (err) {
    console.error('Scale down error:', err.message);
  }
}

class AutoScaler {
  async update(instanceId, metricType, currentValue, policy) {
    if (!policy || !policy.isActive) return;
    const high = Number(policy.thresholdHigh);
    const low = Number(policy.thresholdLow);
    if (currentValue >= high) {
      await scaleUp(instanceId, policy, currentValue);
    } else if (currentValue <= low) {
      await scaleDown(instanceId, policy, currentValue);
    }
  }
}

module.exports = { AutoScaler, scaleUp, scaleDown, isInCooldown, findNextFlavor };
