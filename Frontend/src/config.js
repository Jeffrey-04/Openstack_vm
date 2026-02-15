// Configuration de l'API
// En production ou derrière Nginx : utiliser '' pour des URLs relatives (/api/...) proxyfiées par Nginx.
// En dev local (npm start sur ta machine) : mettre REACT_APP_API_URL=http://localhost:3001 dans .env
const API_BASE_URL = process.env.REACT_APP_API_URL ?? '';

export const API = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    // Health check
    HEALTH: `${API_BASE_URL}/api/health`,
    
    // OpenStack
    OPENSTACK_STATUS: `${API_BASE_URL}/api/openstack/status`,
    NETWORKS: `${API_BASE_URL}/api/openstack/networks`,
    FLOATING_IPS: `${API_BASE_URL}/api/openstack/floatingips`,
    
// VMs
    VMS: `${API_BASE_URL}/api/vms`,
    VM_BY_ID: (id) => `${API_BASE_URL}/api/vms/${id}`,
    VM_ACTION: (id) => `${API_BASE_URL}/api/vms/${id}/action`,
    VM_SCALING_POLICY: (id) => `${API_BASE_URL}/api/vms/${id}/scaling-policy`,

    // VM Templates (for preconfigured VM creation)
    VM_TEMPLATES: `${API_BASE_URL}/api/vm-templates`,

    // Flavors
    FLAVORS: `${API_BASE_URL}/api/flavors`,
    FLAVOR_BY_ID: (id) => `${API_BASE_URL}/api/flavors/${id}`,
    
    // Images
    IMAGES: `${API_BASE_URL}/api/images`,
    IMAGE_BY_ID: (id) => `${API_BASE_URL}/api/images/${id}`,

    // Auth
    AUTH_REGISTER: `${API_BASE_URL}/api/auth/register`,
    AUTH_LOGIN: `${API_BASE_URL}/api/auth/login`,
    AUTH_LOGOUT: `${API_BASE_URL}/api/auth/logout`,
    AUTH_ME: `${API_BASE_URL}/api/auth/me`,

    // Invoices
    INVOICES: `${API_BASE_URL}/api/invoices`,
    INVOICE_BY_ID: (id) => `${API_BASE_URL}/api/invoices/${id}`,
    INVOICE_DOWNLOAD: (id) => `${API_BASE_URL}/api/invoices/${id}/download`,
    INVOICE_PAY: (id) => `${API_BASE_URL}/api/invoices/${id}/pay`,
    INVOICE_PREFERENCES: `${API_BASE_URL}/api/invoices/preferences`,
    PRICING_RULES: `${API_BASE_URL}/api/pricing-rules`,

    // Admin
    ADMIN_VM_TEMPLATES: `${API_BASE_URL}/api/admin/vm-templates`,
    ADMIN_VM_TEMPLATE_BY_ID: (id) => `${API_BASE_URL}/api/admin/vm-templates/${id}`,
    ADMIN_SCALE_UP_RULE: `${API_BASE_URL}/api/admin/scale-up-rule`,
  }
};

export default API;

