import axios from 'axios';
import { API } from '../config';

const getToken = () => localStorage.getItem('token');

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API.BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

const log = (msg, ...args) => {
  const ts = new Date().toISOString();
  console.log(`[API] ${ts} ${msg}`, ...args);
};

axiosInstance.interceptors.request.use((config) => {
  const url = (config.baseURL || '') + (config.url || '');
  log('REQUEST', config.method?.toUpperCase(), url);
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    log('RESPONSE', response.status, response.config.method?.toUpperCase(), response.config.url);
    return response;
  },
  (error) => {
    if (error.response) {
      log('API Error', error.response.status, error.response.data);
      const status = error.response.status;
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-logout'));
        window.dispatchEvent(new CustomEvent('api-toast', { detail: { type: 'error', message: 'Session expirée. Veuillez vous reconnecter.' } }));
      } else if (status >= 500) {
        window.dispatchEvent(new CustomEvent('api-toast', { detail: { type: 'error', message: 'Erreur serveur. Réessayez plus tard.' } }));
      }
    } else {
      log('API Error (no response)', error.message, error.code || '');
      window.dispatchEvent(new CustomEvent('api-toast', { detail: { type: 'error', message: 'Connexion au serveur impossible.' } }));
    }
    return Promise.reject(error);
  }
);

// API Service
export const apiService = {
  // Health check
  async checkHealth() {
    const response = await axiosInstance.get(API.ENDPOINTS.HEALTH);
    return response.data;
  },

  // OpenStack status
  async getOpenstackStatus() {
    const response = await axiosInstance.get(API.ENDPOINTS.OPENSTACK_STATUS);
    return response.data;
  },

  // VMs
  async getVMs() {
    const response = await axiosInstance.get(API.ENDPOINTS.VMS);
    return response.data;
  },

  async getVM(id) {
    const response = await axiosInstance.get(API.ENDPOINTS.VM_BY_ID(id));
    return response.data;
  },

  async createVM(vmData) {
    const response = await axiosInstance.post(API.ENDPOINTS.VMS, vmData);
    return response.data;
  },

  async getVmTemplates() {
    const response = await axiosInstance.get(API.ENDPOINTS.VM_TEMPLATES);
    return response.data;
  },

  async getVmScalingPolicy(vmId) {
    const response = await axiosInstance.get(API.ENDPOINTS.VM_SCALING_POLICY(vmId));
    return response.data;
  },
  async putVmScalingPolicy(vmId, policy) {
    const response = await axiosInstance.put(API.ENDPOINTS.VM_SCALING_POLICY(vmId), policy);
    return response.data;
  },

  async deleteVM(id) {
    const response = await axiosInstance.delete(API.ENDPOINTS.VM_BY_ID(id));
    return response.data;
  },

  async vmAction(id, action) {
    const response = await axiosInstance.post(API.ENDPOINTS.VM_ACTION(id), { action });
    return response.data;
  },

  // Flavors
  async getFlavors() {
    const response = await axiosInstance.get(API.ENDPOINTS.FLAVORS);
    return response.data;
  },

  async getFlavor(id) {
    const response = await axiosInstance.get(API.ENDPOINTS.FLAVOR_BY_ID(id));
    return response.data;
  },

  // Images
  async getImages() {
    const response = await axiosInstance.get(API.ENDPOINTS.IMAGES);
    return response.data;
  },

  async getImage(id) {
    const response = await axiosInstance.get(API.ENDPOINTS.IMAGE_BY_ID(id));
    return response.data;
  },

  // Networks
  async getNetworks() {
    const response = await axiosInstance.get(API.ENDPOINTS.NETWORKS);
    return response.data;
  },

  async getFloatingIPs() {
    const response = await axiosInstance.get(API.ENDPOINTS.FLOATING_IPS);
    return response.data;
  },

  // Auth
  async register(data) {
    const response = await axiosInstance.post(API.ENDPOINTS.AUTH_REGISTER, data);
    return response.data;
  },
  async login(email, password) {
    const response = await axiosInstance.post(API.ENDPOINTS.AUTH_LOGIN, { email, password });
    return response.data;
  },
  async logout() {
    await axiosInstance.post(API.ENDPOINTS.AUTH_LOGOUT);
  },
  async getMe() {
    const response = await axiosInstance.get(API.ENDPOINTS.AUTH_ME);
    return response.data;
  },

  // Invoices
  async getInvoices() {
    const response = await axiosInstance.get(API.ENDPOINTS.INVOICES);
    return response.data;
  },
  async getInvoice(id) {
    const response = await axiosInstance.get(API.ENDPOINTS.INVOICE_BY_ID(id));
    return response.data;
  },
  getInvoiceDownloadUrl(id) {
    return `${API.ENDPOINTS.INVOICE_DOWNLOAD(id)}?token=${getToken()}`;
  },
  async payInvoice(id) {
    const response = await axiosInstance.post(API.ENDPOINTS.INVOICE_PAY(id));
    return response.data;
  },
  async getPricingRules() {
    const response = await axiosInstance.get(API.ENDPOINTS.PRICING_RULES);
    return response.data;
  },
  async getBillingPreferences() {
    const response = await axiosInstance.get(API.ENDPOINTS.INVOICE_PREFERENCES);
    return response.data;
  },
  async updateBillingPreferences(preferences) {
    const response = await axiosInstance.put(API.ENDPOINTS.INVOICE_PREFERENCES, preferences);
    return response.data;
  },

  // Admin
  async getAdminVmTemplates() {
    const response = await axiosInstance.get(API.ENDPOINTS.ADMIN_VM_TEMPLATES);
    return response.data;
  },
  async createAdminVmTemplate(data) {
    const response = await axiosInstance.post(API.ENDPOINTS.ADMIN_VM_TEMPLATES, data);
    return response.data;
  },
  async updateAdminVmTemplate(id, data) {
    const response = await axiosInstance.put(API.ENDPOINTS.ADMIN_VM_TEMPLATE_BY_ID(id), data);
    return response.data;
  },
  async deleteAdminVmTemplate(id) {
    const response = await axiosInstance.delete(API.ENDPOINTS.ADMIN_VM_TEMPLATE_BY_ID(id));
    return response.data;
  },
  async getAdminScaleUpRule() {
    const response = await axiosInstance.get(API.ENDPOINTS.ADMIN_SCALE_UP_RULE);
    return response.data;
  },
  async putAdminScaleUpRule(data) {
    const response = await axiosInstance.put(API.ENDPOINTS.ADMIN_SCALE_UP_RULE, data);
    return response.data;
  },
};

export default apiService;
export { getToken };

