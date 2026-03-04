const axios = require('axios');

// Éviter de spammer les logs quand OpenStack est indisponible (une fois par minute par type)
const lastConnectionErrorLog = { nova: 0, neutron: 0, glance: 0, keystone: 0 };
const THROTTLE_MS = 60 * 1000;

function logConnectionErrorOnce(key, message) {
  const now = Date.now();
  if (now - lastConnectionErrorLog[key] < THROTTLE_MS) return;
  lastConnectionErrorLog[key] = now;
  console.warn(`[OpenStack] ${message} (indisponible; prochain log dans ${THROTTLE_MS / 1000}s)`);
}

class OpenStackClient {
  constructor() {
    this.authToken = null;
    this.tokenExpiry = null;
    this.projectId = null;
    this.tokenCache = {};
  }

  async getAuthToken(projectId = null) {
    const cacheKey = projectId || 'default';
    const cached = this.tokenCache[cacheKey];
    if (cached && cached.expiry && new Date() < cached.expiry) {
      return cached.token;
    }

    try {
      const scope = projectId
        ? { project: { id: projectId } }
        : { project: { name: process.env.OS_PROJECT_NAME, domain: { id: 'default' } } };
      const response = await axios.post(`${process.env.KEYSTONE_URL}/auth/tokens`, {
        auth: {
          identity: {
            methods: ['password'],
            password: {
              user: {
                name: process.env.OS_USERNAME,
                domain: { id: 'default' },
                password: process.env.OS_PASSWORD
              }
            }
          },
          scope
        }
      });

      const token = response.headers['x-subject-token'];
      const expiry = new Date(Date.now() + 55 * 60 * 1000);
      this.tokenCache[cacheKey] = { token, expiry };
      if (!projectId) {
        this.authToken = token;
        this.tokenExpiry = expiry;
        this.projectId = response.data.token.project.id;
      }
      return token;
    } catch (error) {
      logConnectionErrorOnce('keystone', 'Auth: ' + (error.message || error.code || 'failed'));
      throw new Error('Failed to authenticate with OpenStack');
    }
  }

  async makeRequest(method, url, data = null, projectId = null) {
    try {
      const token = await this.getAuthToken(projectId);
      const config = {
        method,
        url,
        headers: {
          'X-Auth-Token': token,
          'Content-Type': 'application/json'
        }
      };
      if (data) config.data = data;
      const response = await axios(config);
      return response.data;
    } catch (error) {
      const msg = error.message || error.code || 'API error';
      logConnectionErrorOnce('nova', msg);
      throw error;
    }
  }

  // Nova (Compute) API methods
  async listServers() {
    return this.makeRequest('GET', `${process.env.NOVA_URL}/servers/detail`);
  }

  async getServer(serverId, projectId = null) {
    return this.makeRequest('GET', `${process.env.NOVA_URL}/servers/${serverId}`, null, projectId);
  }

  async createServer(serverData, projectId = null) {
    return this.makeRequest('POST', `${process.env.NOVA_URL}/servers`, {
      server: serverData
    }, projectId);
  }

  async deleteServer(serverId, projectId = null) {
    return this.makeRequest('DELETE', `${process.env.NOVA_URL}/servers/${serverId}`, null, projectId);
  }

  async serverAction(serverId, action, projectId = null) {
    return this.makeRequest('POST', `${process.env.NOVA_URL}/servers/${serverId}/action`, action, projectId);
  }

  async resizeServer(serverId, flavorRef, projectId = null) {
    return this.serverAction(serverId, { resize: { flavorRef } }, projectId);
  }

  async confirmResize(serverId, projectId = null) {
    return this.serverAction(serverId, { 'confirmResize': null }, projectId);
  }

  async getConsoleUrl(serverId, projectId = null) {
    const result = await this.makeRequest('POST', `${process.env.NOVA_URL}/servers/${serverId}/remote-consoles`, {
      remote_console: {
        protocol: 'vnc',
        type: 'novnc'
      }
    }, projectId);
    return result.remote_console?.url || null;
  }

  async createImageFromServer(serverId, imageName, projectId = null) {
    await this.serverAction(serverId, { createImage: { name: imageName } }, projectId);
    return { created: true, name: imageName };
  }

  async listFlavors() {
    return this.makeRequest('GET', `${process.env.NOVA_URL}/flavors/detail`);
  }

  async getFlavor(flavorId, projectId = null) {
    return this.makeRequest('GET', `${process.env.NOVA_URL}/flavors/${flavorId}`, null, projectId);
  }

  // Glance (Images) API methods
  async listImages() {
    try {
      const token = await this.getAuthToken();
      const response = await axios.get(`${process.env.GLANCE_URL}/v2/images`, {
        headers: { 'X-Auth-Token': token }
      });
      return { images: response.data.images };
    } catch (error) {
      // Fallback to Nova images API if Glance is not available
      return this.makeRequest('GET', `${process.env.NOVA_URL}/images/detail`);
    }
  }

  async getImage(imageId) {
    try {
      const token = await this.getAuthToken();
      const response = await axios.get(`${process.env.GLANCE_URL}/v2/images/${imageId}`, {
        headers: { 'X-Auth-Token': token }
      });
      return { image: response.data };
    } catch (error) {
      return this.makeRequest('GET', `${process.env.NOVA_URL}/images/${imageId}`);
    }
  }

  // Neutron (Network) API methods
  async listNetworks() {
    try {
      const token = await this.getAuthToken();
      const response = await axios.get(`${process.env.NEUTRON_URL}/v2.0/networks`, {
        headers: { 'X-Auth-Token': token }
      });
      return response.data;
    } catch (error) {
      logConnectionErrorOnce('neutron', 'Networks: ' + (error.message || error.code));
      return { networks: [] };
    }
  }

  async listFloatingIPs() {
    try {
      const token = await this.getAuthToken();
      const response = await axios.get(`${process.env.NEUTRON_URL}/v2.0/floatingips`, {
        headers: { 'X-Auth-Token': token }
      });
      return response.data;
    } catch (error) {
      logConnectionErrorOnce('neutron', 'Floating IPs: ' + (error.message || error.code));
      return { floatingips: [] };
    }
  }
}

// Export a singleton instance
module.exports = new OpenStackClient();

