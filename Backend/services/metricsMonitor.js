const { ScalingPolicy, ResourceUsage, VM } = require('../models');

class Observer {
  async update(instanceId, metricType, currentValue, policy) {
    throw new Error('Observer.update must be implemented');
  }
}

class MetricsMonitor {
  constructor() {
    this._observers = [];
  }

  attach(observer) {
    if (observer && typeof observer.update === 'function') {
      this._observers.push(observer);
    }
  }

  detach(observer) {
    this._observers = this._observers.filter(o => o !== observer);
  }

  async notify(instanceId, metricType, currentValue, policy) {
    for (const observer of this._observers) {
      try {
        await observer.update(instanceId, metricType, currentValue, policy);
      } catch (err) {
        console.error('Observer error:', err.message);
      }
    }
  }

  async getCurrentMetricByInstanceId(instanceId, metricType) {
    const vm = await VM.findOne({ where: { instanceId } });
    if (!vm) return null;
    const u = await ResourceUsage.findOne({
      where: { vmId: vm.id, metricType },
      order: [['timestamp', 'DESC']]
    });
    return u ? Number(u.value) : null;
  }

  async checkThresholds() {
    const policies = await ScalingPolicy.findAll({ where: { isActive: true } });
    for (const policy of policies) {
      const value = await this.getCurrentMetricByInstanceId(policy.instanceId, policy.metricType);
      if (value == null) continue;
      const high = Number(policy.thresholdHigh);
      const low = Number(policy.thresholdLow);
      if (value >= high || value <= low) {
        await this.notify(policy.instanceId, policy.metricType, value, policy);
      }
    }
  }
}

module.exports = { MetricsMonitor, Observer };
