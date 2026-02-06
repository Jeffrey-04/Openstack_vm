const axios = require('axios');

class OpenStackClient {
  constructor() {
    this.authToken = null;
    this.tokenExpiry = null;
    this.projectId = null;
  }

  async getAuthToken() {
    // Check if we have a valid token
    if (this.authToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.authToken;
    }

    try {
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
          scope: {
            project: {
              name: process.env.OS_PROJECT_NAME,
              domain: { id: 'default' }
            }
          }
        }
      });

      this.authToken = response.headers['x-subject-token'];
      this.projectId = response.data.token.project.id;
      
      // Set expiry to 1 hour from now (OpenStack tokens typically last 1 hour)
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000); // 55 minutes to be safe

      return this.authToken;
    } catch (error) {
      console.error('Authentication error:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with OpenStack');
    }
  }

  async makeRequest(method, url, data = null) {
    try {
      const token = await this.getAuthToken();
      
      const config = {
        method,
        url,
        headers: {
          'X-Auth-Token': token,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('OpenStack API error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Nova (Compute) API methods
  async listServers() {
    return this.makeRequest('GET', `${process.env.NOVA_URL}/servers/detail`);
  }

  async getServer(serverId) {
    return this.makeRequest('GET', `${process.env.NOVA_URL}/servers/${serverId}`);
  }

  async createServer(serverData) {
    return this.makeRequest('POST', `${process.env.NOVA_URL}/servers`, {
      server: serverData
    });
  }

  async deleteServer(serverId) {
    return this.makeRequest('DELETE', `${process.env.NOVA_URL}/servers/${serverId}`);
  }

  async serverAction(serverId, action) {
    return this.makeRequest('POST', `${process.env.NOVA_URL}/servers/${serverId}/action`, action);
  }

  async resizeServer(serverId, flavorRef) {
    return this.serverAction(serverId, { resize: { flavorRef } });
  }

  async confirmResize(serverId) {
    return this.serverAction(serverId, { 'confirmResize': null });
  }

  async listFlavors() {
    return this.makeRequest('GET', `${process.env.NOVA_URL}/flavors/detail`);
  }

  async getFlavor(flavorId) {
    return this.makeRequest('GET', `${process.env.NOVA_URL}/flavors/${flavorId}`);
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
      console.error('Network listing error:', error.message);
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
      console.error('Floating IP listing error:', error.message);
      return { floatingips: [] };
    }
  }
}

// Export a singleton instance
module.exports = new OpenStackClient();

