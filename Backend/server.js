const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection, syncDatabase } = require('./models');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - stricter for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: { message: 'Too many auth attempts', status: 429 } }
});
app.use('/api/auth', authLimiter);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', apiLimiter);

// Routes
const authRoutes = require('./routes/auth');
const openstackRoutes = require('./routes/openstack');
const vmRoutes = require('./routes/vms');
const flavorRoutes = require('./routes/flavors');
const imageRoutes = require('./routes/images');
const invoicesRoutes = require('./routes/invoices');
const pricingRulesRoutes = require('./routes/pricingRules');

app.use('/api/auth', authRoutes);
app.use('/api/openstack', openstackRoutes);
app.use('/api/vms', vmRoutes);
app.use('/api/flavors', flavorRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/pricing-rules', pricingRulesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'VM Marketplace Backend'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  const ok = await testConnection();
  if (!ok && process.env.NODE_ENV !== 'test') {
    console.warn('Database connection failed; auth will not work. Set DATABASE_URL or use SQLite.');
  }
  await syncDatabase();
  if (process.env.NODE_ENV === 'test') return;
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   VM Marketplace Backend Server            ║
║   Running on port ${PORT}                     ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   Time: ${new Date().toLocaleString()}          ║
╚════════════════════════════════════════════╝
  `);
  });
};

const serverReady = startServer().catch((err) => {
  if (require.main === module) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
});

if (require.main === module) {
  serverReady.catch(() => {});
}

module.exports = app;
module.exports.serverReady = serverReady;

