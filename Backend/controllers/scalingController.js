const { ScalingPolicy, ScalingEvent, ResourceUsage, VM } = require('../models');
const { Op } = require('sequelize');
const { getInstanceMetrics } = require('../services/ceilometer');

async function ensureVmOwnership(req, res) {
  const vm = await VM.findOne({
    where: { instanceId: req.params.id, userId: req.userId }
  });
  if (!vm) {
    res.status(404).json({ error: { message: 'VM not found', status: 404 } });
    return null;
  }
  return vm;
}

async function getScalingPolicy(req, res, next) {
  try {
    if (await ensureVmOwnership(req, res) === null) return;
    const instanceId = req.params.id;
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
    const instanceId = req.params.id;
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
    const instanceId = req.params.id;
    const projectId = req.user?.openstackProjectId || null;
    const byType = {};

    const ceilometerMetrics = await getInstanceMetrics(instanceId, projectId);
    if (ceilometerMetrics) {
      if (ceilometerMetrics.cpu_util?.length) byType.cpu_util = ceilometerMetrics.cpu_util;
      if (ceilometerMetrics.memory_usage?.length) byType.memory_usage = ceilometerMetrics.memory_usage;
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
    res.json({ success: true, metrics: byType, instanceId });
  } catch (err) {
    next(err);
  }
}

async function getScalingHistory(req, res, next) {
  try {
    if (await ensureVmOwnership(req, res) === null) return;
    const instanceId = req.params.id;
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
