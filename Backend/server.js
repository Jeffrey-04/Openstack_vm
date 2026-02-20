const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection, runMigrations, VM, User } = require('./models');
const { Op } = require('sequelize');
const openstack = require('./config/openstack');
const { runThirtyMinuteBillingJob, runDailyPaymentJob } = require('./services/billingEngine');
const { MetricsMonitor } = require('./services/metricsMonitor');
const { AutoScaler } = require('./services/autoScaler');

const BILLING_JOB_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const DAILY_PAYMENT_JOB_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SCALING_CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const EXPIRED_VM_CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

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
  max: 500,
  message: { error: { message: 'Trop de requêtes, réessayez plus tard.', status: 429 } }
});
app.use('/api/', apiLimiter);

// Log de toutes les requêtes API (pour diagnostic)
const logger = require('./utils/logger');
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    const meta = { host: req.get('host'), origin: req.get('origin'), path: req.path };
    logger.request(req.method, req.path, req.method !== 'GET' ? req.body : undefined);
    logger.info('Request meta', JSON.stringify(meta));
  }
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const openstackRoutes = require('./routes/openstack');
const vmRoutes = require('./routes/vms');
const flavorRoutes = require('./routes/flavors');
const imageRoutes = require('./routes/images');
const invoicesRoutes = require('./routes/invoices');
const pricingRulesRoutes = require('./routes/pricingRules');
const adminRoutes = require('./routes/admin');
const vmTemplatesRoutes = require('./routes/vmTemplates');

app.use('/api/auth', authRoutes);
app.use('/api/openstack', openstackRoutes);
app.use('/api/vms', vmRoutes);
app.use('/api/vm-templates', vmTemplatesRoutes);
app.use('/api/flavors', flavorRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/pricing-rules', pricingRulesRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'VM Marketplace Backend'
  });
});

// Error handling middleware (logger déjà requis plus haut)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const bodySummary = req.body && typeof req.body === 'object'
    ? { ...req.body, password: req.body.password ? '[REDACTED]' : undefined }
    : undefined;
  logger.error('Unhandled error', err.message, err.stack);
  logger.error('Error context', {
    method: req.method,
    path: req.originalUrl,
    query: Object.keys(req.query || {}).length ? req.query : undefined,
    bodySummary: status >= 500 ? bodySummary : undefined
  });
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      status
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404', req.method, req.originalUrl);
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
  await runMigrations();
  if (process.env.NODE_ENV === 'test') return;

  // 30-min billing job: run for last slice, then every 30 min
  runThirtyMinuteBillingJob().then((r) => {
    if (r.invoicesCreated > 0) {
      console.log(`Billing job: ${r.invoicesCreated} invoice(s) created for last slice.`);
    }
  }).catch((err) => console.error('Billing job error:', err.message));
  setInterval(() => {
    runThirtyMinuteBillingJob().catch((err) => console.error('Billing job error:', err.message));
  }, BILLING_JOB_INTERVAL_MS);

  runDailyPaymentJob().catch((err) => console.error('Daily payment job error:', err.message));
  setInterval(() => {
    runDailyPaymentJob().catch((err) => console.error('Daily payment job error:', err.message));
  }, DAILY_PAYMENT_JOB_INTERVAL_MS);

  const metricsMonitor = new MetricsMonitor();
  metricsMonitor.attach(new AutoScaler());
  setInterval(() => {
    metricsMonitor.checkThresholds().catch((err) => console.error('Scaling check error:', err.message));
  }, SCALING_CHECK_INTERVAL_MS);

  const runExpiredVmCleanup = async () => {
    try {
      const expired = await VM.findAll({
        where: { expiresAt: { [Op.lt]: new Date() } },
        include: [{ model: User, attributes: ['openstackProjectId'] }]
      });
      for (const vm of expired) {
        const projectId = vm.User?.openstackProjectId || null;
        try {
          await openstack.deleteServer(vm.instanceId, projectId);
        } catch (e) {
          logger.warn('Expired VM delete OpenStack', vm.instanceId, e.message);
        }
        await vm.destroy();
      }
      if (expired.length > 0) logger.info('Expired VM cleanup', { count: expired.length });
    } catch (err) {
      logger.error('Expired VM cleanup error', err.message);
    }
  };
  setInterval(runExpiredVmCleanup, EXPIRED_VM_CLEANUP_INTERVAL_MS);
  runExpiredVmCleanup().catch((e) => logger.error('Expired VM cleanup', e.message));

  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   VM Marketplace Backend Server            ║
║   Running on port ${PORT}                     ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   Time: ${new Date().toLocaleString()}          ║
╚════════════════════════════════════════════╝
  `);
    logger.info('Backend started', { PORT, CORS_ORIGIN: process.env.CORS_ORIGIN || '*', hint: 'Frontend: REACT_APP_API_URL=http://localhost:' + PORT });
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

