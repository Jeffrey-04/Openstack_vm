const axios = require('axios');
const openstack = require('../config/openstack');

/**
 * Fetch Ceilometer samples for a Nova instance (resource_id = serverId).
 * Requires CEILOMETER_URL to be set (e.g. http://host:8777).
 * cpu_util is typically 0-100 (%). memory.usage may be in MB depending on the meter; frontend may need to normalize for %.
 * @param {string} resourceId - Nova server UUID (instance id)
 * @param {string} [projectId] - Optional Keystone project ID for token scope
 * @returns {Promise<{ cpu_util: Array<{value, timestamp}>, memory_usage?: Array<{value, timestamp}> }>}
 */
async function getInstanceMetrics(resourceId, projectId = null) {
  const baseUrl = process.env.CEILOMETER_URL;
  if (!baseUrl) return null;
  try {
    const token = await openstack.getAuthToken(projectId);
    const limit = 60;
    const q = `q.field=resource_id&q.op=eq&q.value=${resourceId}`;
    const [cpuRes, memRes] = await Promise.all([
      axios.get(`${baseUrl}/v2/meters/cpu_util?${q}&limit=${limit}`, {
        headers: { 'X-Auth-Token': token }
      }).catch(() => ({ data: [] })),
      axios.get(`${baseUrl}/v2/meters/memory.usage?${q}&limit=${limit}`, {
        headers: { 'X-Auth-Token': token }
      }).catch(() => ({ data: [] }))
    ]);
    const toArray = (data) => {
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.samples)) return data.samples;
      return [];
    };
    const cpuSamples = toArray(cpuRes.data);
    const memSamples = toArray(memRes.data);
    const cpu_util = cpuSamples.map((s) => ({
      value: Number(s.counter_volume ?? s.volume ?? 0),
      timestamp: s.timestamp || s.recorded_at
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const memory_usage = memSamples.map((s) => ({
      value: Number(s.counter_volume ?? s.volume ?? 0),
      timestamp: s.timestamp || s.recorded_at
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return { cpu_util, memory_usage };
  } catch (err) {
    return null;
  }
}

module.exports = { getInstanceMetrics };
