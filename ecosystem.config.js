module.exports = {
  apps: [
    {
      name: 'vm-marketplace-backend',
      cwd: './Backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'vm-marketplace-frontend',
      cwd: './Frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        REACT_APP_API_URL: '',  // URLs relatives /api/ → Nginx proxy vers le backend
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        REACT_APP_API_URL: '',  // idem : même origine, Nginx proxy /api/ vers backend:3001
      },
    },
  ],
};

