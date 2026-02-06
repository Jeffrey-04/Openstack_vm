const spec = {
    openapi: '3.0.0',
    info: {
      title: 'VM Marketplace API',
      version: '1.0.0',
      description: 'API for VM Marketplace - OpenStack VM management, billing, and scaling',
    },
    servers: [{ url: '/', description: 'Server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    paths: {
      '/api/health': {
        get: { summary: 'Health check', tags: ['System'], responses: { 200: { description: 'OK' } } },
      },
      '/api/auth/register': {
        post: {
          summary: 'Register',
          tags: ['Auth'],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' } }, required: ['email', 'password'] } } } },
          responses: { 201: { description: 'Created' }, 400: { description: 'Validation error' }, 409: { description: 'Email already registered' } },
        },
      },
      '/api/auth/login': {
        post: {
          summary: 'Login',
          tags: ['Auth'],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } }, required: ['email', 'password'] } } } },
          responses: { 200: { description: 'Returns token and user' }, 401: { description: 'Invalid credentials' } },
        },
      },
      '/api/auth/me': {
        get: { summary: 'Current user', tags: ['Auth'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'User' }, 401: { description: 'Unauthorized' } } },
      },
      '/api/vms': {
        get: { summary: 'List VMs', tags: ['VMs'], responses: { 200: { description: 'List of servers' } } },
        post: { summary: 'Create VM', tags: ['VMs'], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: {}, flavorRef: {}, imageRef: {}, networkId: {}, keyName: {} }, required: ['name', 'flavorRef', 'imageRef'] } } } }, responses: { 201: { description: 'Created' } } },
      },
      '/api/vms/{id}': {
        get: { summary: 'Get VM', tags: ['VMs'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: {}, 404: {} } },
        delete: { summary: 'Delete VM', tags: ['VMs'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: {} } },
      },
      '/api/vms/{id}/action': {
        post: { summary: 'VM action (start, stop, reboot, etc.)', tags: ['VMs'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { action: { type: 'string', enum: ['start', 'stop', 'reboot', 'pause', 'unpause', 'suspend', 'resume'] } } } } }, responses: { 200: {} } },
      },
      '/api/vms/{id}/scaling-policy': {
        get: { summary: 'Get scaling policy', tags: ['Scaling'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: {}, 404: {} } },
        put: { summary: 'Set scaling policy', tags: ['Scaling'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { metricType: {}, thresholdHigh: {}, thresholdLow: {}, isActive: {}, cooldownMinutes: {} } } } } }, responses: { 200: {} } },
      },
      '/api/vms/{id}/metrics': {
        get: { summary: 'Get VM metrics', tags: ['Scaling'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: {} } },
      },
      '/api/vms/{id}/scaling-history': {
        get: { summary: 'Scaling history', tags: ['Scaling'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: {} } },
      },
      '/api/flavors': {
        get: { summary: 'List flavors', tags: ['Flavors'], responses: { 200: {} } },
      },
      '/api/flavors/{id}': {
        get: { summary: 'Get flavor', tags: ['Flavors'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: {} } },
      },
      '/api/images': {
        get: { summary: 'List images', tags: ['Images'], responses: { 200: {} } },
      },
      '/api/invoices': {
        get: { summary: 'List invoices', tags: ['Billing'], security: [{ bearerAuth: [] }], responses: { 200: {} } },
        post: { summary: 'Create invoice', tags: ['Billing'], security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { periodStart: {}, periodEnd: {} }, required: ['periodStart', 'periodEnd'] } } } }, responses: { 201: {} } },
      },
      '/api/invoices/{id}': {
        get: { summary: 'Get invoice', tags: ['Billing'], security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: {}, 404: {} } },
      },
      '/api/invoices/{id}/download': {
        get: { summary: 'Download invoice PDF', tags: ['Billing'], security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { content: { 'application/pdf': {} } }, 404: {} } },
      },
      '/api/pricing-rules': {
        get: { summary: 'Get pricing rules', tags: ['Billing'], responses: { 200: {} } },
        put: { summary: 'Update pricing rules (admin)', tags: ['Billing'], security: [{ bearerAuth: [] }], responses: { 200: {} } },
      },
    },
};

module.exports = spec;
