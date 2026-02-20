const { ScalingPolicy, ScalingEvent, ResourceUsage, VM } = require('../models');
const { Op } = require('sequelize');
const { getInstanceMetrics } = require('../services/ceilometer');

async function ensureVmOwnership(req, res) {
  const paramId = req.params.id;
  if (!paramId || !req.userId) {
    res.status(404).json({ error: { message: 'VM not found', status: 404 } });
    return null;
  }
  let vm = await VM.findOne({ where: { instanceId: paramId, userId: req.userId } });
  if (!vm) vm = await VM.findOne({ where: { id: paramId, userId: req.userId } });
  if (!vm) {
    res.status(404).json({ error: { message: 'VM not found', status: 404 } });
    return null;
  }
  req.vmInstanceId = vm.instanceId;
  return vm;
}

async function getScalingPolicy(req, res, next) {
  try {
    if (await ensureVmOwnership(req, res) === null) return;
    const instanceId = req.vmInstanceId;
    const policy = await ScalingPolicy.findOne({
      where: { instanceId, isActive: true }
    });
    if (!policy) {
      return res.status(404).json({
        error: { message: 'No scaling policy for this VM', status: 404 }
      });
    }
    res.json({
      success: true,
      policy: {
        id: policy.id,
        instanceId: policy.instanceId,
        metricType: policy.metricType,
        thresholdHigh: Number(policy.thresholdHigh),
        thresholdLow: Number(policy.thresholdLow),
        actionType: policy.actionType,
        isActive: policy.isActive,
        cooldownMinutes: policy.cooldownMinutes,
        baseFlavorId: policy.baseFlavorId || null
      }
    });
  } catch (err) {
    next(err);
  }
}

async function putScalingPolicy(req, res, next) {
  try {
    if (await ensureVmOwnership(req, res) === null) return;
    const instanceId = req.vmInstanceId;
    const { metricType, thresholdHigh, thresholdLow, isActive, cooldownMinutes, baseFlavorId } = req.body;
    let policy = await ScalingPolicy.findOne({ where: { instanceId } });
    if (policy) {
      await policy.update({
        metricType: metricType ?? policy.metricType,
        thresholdHigh: thresholdHigh ?? policy.thresholdHigh,
        thresholdLow: thresholdLow ?? policy.thresholdLow,
        isActive: isActive !== undefined ? isActive : policy.isActive,
        cooldownMinutes: cooldownMinutes ?? policy.cooldownMinutes,
        ...(baseFlavorId !== undefined && { baseFlavorId })
      });
    } else {
      policy = await ScalingPolicy.create({
        instanceId,
        metricType: metricType || 'cpu_util',
        thresholdHigh: thresholdHigh ?? 80,
        thresholdLow: thresholdLow ?? 20,
        isActive: isActive !== false,
        cooldownMinutes: cooldownMinutes ?? 5,
        baseFlavorId: baseFlavorId || null
      });
    }
    res.json({
      success: true,
      policy: {
        id: policy.id,
        instanceId: policy.instanceId,
        metricType: policy.metricType,
        thresholdHigh: Number(policy.thresholdHigh),
        thresholdLow: Number(policy.thresholdLow),
        isActive: policy.isActive,
        cooldownMinutes: policy.cooldownMinutes,
        baseFlavorId: policy.baseFlavorId || null
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getMetrics(req, res, next) {
  try {
    const vm = await ensureVmOwnership(req, res);
    if (vm === null) return;
    const instanceId = req.vmInstanceId;
    const projectId = req.user?.openstackProjectId || null;
    const byType = {};

    const ceilometerMetrics = await getInstanceMetrics(instanceId, projectId);
    if (ceilometerMetrics) {
      if (ceilometerMetrics.cpu_util?.length) byType.cpu_util = ceilometerMetrics.cpu_util;
      if (ceilometerMetrics.memory_usage?.length) byType.memory_usage = ceilometerMetrics.memory_usage;
      if (ceilometerMetrics.disk_usage?.length) byType.disk_usage = ceilometerMetrics.disk_usage;
      if (ceilometerMetrics.network_incoming_bytes?.length) byType.network_incoming_bytes = ceilometerMetrics.network_incoming_bytes;
      if (ceilometerMetrics.network_outgoing_bytes?.length) byType.network_outgoing_bytes = ceilometerMetrics.network_outgoing_bytes;
    }

    const usages = await ResourceUsage.findAll({
      where: { vmId: vm.id },
      order: [['timestamp', 'DESC']],
      limit: 100
    });
    for (const u of usages) {
      if (!byType[u.metricType]) byType[u.metricType] = [];
      byType[u.metricType].push({ value: Number(u.value), timestamp: u.timestamp });
    }
    for (const key of Object.keys(byType)) {
      byType[key].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    if (!byType.cpu_util) byType.cpu_util = [];
    if (!byType.memory_usage) byType.memory_usage = [];
    if (!byType.mem_util) byType.mem_util = [];
    if (!byType.disk_usage) byType.disk_usage = [];
    if (!byType.network_incoming_bytes) byType.network_incoming_bytes = [];
    if (!byType.network_outgoing_bytes) byType.network_outgoing_bytes = [];
    res.json({ success: true, metrics: byType, instanceId });
  } catch (err) {
    next(err);
  }
}

async function getScalingHistory(req, res, next) {
  try {
    if (await ensureVmOwnership(req, res) === null) return;
    const instanceId = req.vmInstanceId;
    const events = await ScalingEvent.findAll({
      where: { instanceId },
      order: [['timestamp', 'DESC']],
      limit: 50
    });
    res.json({
      success: true,
      history: events.map(e => ({
        id: e.id,
        action: e.action,
        oldFlavorId: e.oldFlavorId,
        newFlavorId: e.newFlavorId,
        triggerMetric: e.triggerMetric,
        triggerValue: e.triggerValue ? Number(e.triggerValue) : null,
        timestamp: e.timestamp
      }))
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getScalingPolicy,
  putScalingPolicy,
  getMetrics,
  getScalingHistory
};
