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
        REACT_APP_API_URL: 'http://localhost:3001',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        REACT_APP_API_URL: 'http://VOTRE_IP_VPS/api',
      },
    },
  ],
};

