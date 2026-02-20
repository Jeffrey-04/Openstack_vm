// Configuration de l'API
// En navigateur : on utilise toujours l'origine de la page (même hôte), pour que ça marche
// quand on ouvre http://IP:3000 sans dépendre de REACT_APP_API_URL sur le serveur.
// Les ENDPOINTS sont des chemins relatifs (/api/...) ; le proxy (setupProxy) envoie /api vers le backend.
const API_BASE_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.REACT_APP_API_URL ?? '');

export const API = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    HEALTH: '/api/health',
    OPENSTACK_STATUS: '/api/openstack/status',
    NETWORKS: '/api/openstack/networks',
    FLOATING_IPS: '/api/openstack/floatingips',
    VMS: '/api/vms',
    VM_BY_ID: (id) => `/api/vms/${id}`,
    VM_ACTION: (id) => `/api/vms/${id}/action`,
    VM_SCALING_POLICY: (id) => `/api/vms/${id}/scaling-policy`,
    VM_METRICS: (id) => `/api/vms/${id}/metrics`,
    VM_SCALING_HISTORY: (id) => `/api/vms/${id}/scaling-history`,
    VM_CONSOLE: (id) => `/api/vms/${id}/console`,
    VM_TEMPLATES: '/api/vm-templates',
    FLAVORS: '/api/flavors',
    FLAVOR_BY_ID: (id) => `/api/flavors/${id}`,
    IMAGES: '/api/images',
    IMAGE_BY_ID: (id) => `/api/images/${id}`,
    AUTH_REGISTER: '/api/auth/register',
    AUTH_LOGIN: '/api/auth/login',
    AUTH_LOGOUT: '/api/auth/logout',
    AUTH_ME: '/api/auth/me',
    AUTH_CHANGE_PASSWORD: '/api/auth/change-password',
    INVOICES: '/api/invoices',
    INVOICE_BY_ID: (id) => `/api/invoices/${id}`,
    INVOICE_DOWNLOAD: (id) => `/api/invoices/${id}/download`,
    INVOICE_PAY: (id) => `/api/invoices/${id}/pay`,
    INVOICE_PREFERENCES: '/api/invoices/preferences',
    PRICING_RULES: '/api/pricing-rules',
    ADMIN_VM_TEMPLATES: '/api/admin/vm-templates',
    ADMIN_VM_TEMPLATE_BY_ID: (id) => `/api/admin/vm-templates/${id}`,
    ADMIN_SCALE_UP_RULE: '/api/admin/scale-up-rule',
    ADMIN_STATS: '/api/admin/stats',
    ADMIN_USERS: '/api/admin/users',
    ADMIN_INVOICES: '/api/admin/invoices',
  }
};

export default API;

