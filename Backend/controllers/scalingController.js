const { ScalingPolicy, ScalingEvent, ResourceUsage, VM } = require('../models');
const { Op } = require('sequelize');

async function getScalingPolicy(req, res, next) {
  try {
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
        cooldownMinutes: policy.cooldownMinutes
      }
    });
  } catch (err) {
    next(err);
  }
}

async function putScalingPolicy(req, res, next) {
  try {
    const instanceId = req.params.id;
    const { metricType, thresholdHigh, thresholdLow, isActive, cooldownMinutes } = req.body;
    let policy = await ScalingPolicy.findOne({ where: { instanceId } });
    if (policy) {
      await policy.update({
        metricType: metricType ?? policy.metricType,
        thresholdHigh: thresholdHigh ?? policy.thresholdHigh,
        thresholdLow: thresholdLow ?? policy.thresholdLow,
        isActive: isActive !== undefined ? isActive : policy.isActive,
        cooldownMinutes: cooldownMinutes ?? policy.cooldownMinutes
      });
    } else {
      policy = await ScalingPolicy.create({
        instanceId,
        metricType: metricType || 'cpu_util',
        thresholdHigh: thresholdHigh ?? 80,
        thresholdLow: thresholdLow ?? 20,
        isActive: isActive !== false,
        cooldownMinutes: cooldownMinutes ?? 5
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
        cooldownMinutes: policy.cooldownMinutes
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getMetrics(req, res, next) {
  try {
    const instanceId = req.params.id;
    const vm = await VM.findOne({ where: { instanceId } });
    if (!vm) {
      return res.json({ success: true, metrics: [], instanceId });
    }
    const usages = await ResourceUsage.findAll({
      where: { vmId: vm.id },
      order: [['timestamp', 'DESC']],
      limit: 100
    });
    const byType = {};
    for (const u of usages) {
      if (!byType[u.metricType]) byType[u.metricType] = [];
      byType[u.metricType].push({ value: Number(u.value), timestamp: u.timestamp });
    }
    res.json({ success: true, metrics: byType, instanceId });
  } catch (err) {
    next(err);
  }
}

async function getScalingHistory(req, res, next) {
  try {
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
