const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { logEnvSnapshot, logSensitiveRuntimeHints } = require('./utils/envDebug');
logEnvSnapshot();
logSensitiveRuntimeHints();

const { testConnection, runMigrations, VM, User, ScalingEvent, VmRuntime } = require('./models');
const { Op } = require('sequelize');
const openstack = require('./config/openstack');
const { runThirtyMinuteBillingJob, runDailyPaymentJob } = require('./services/billingEngine');
const { MetricsMonitor } = require('./services/metricsMonitor');
const { AutoScaler } = require('./services/autoScaler');
const metricsCollector = require('./services/metricsCollector');

const BILLING_JOB_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const DAILY_PAYMENT_JOB_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 heures
const SCALING_CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const CONFIRM_RESIZE_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes - confirmer la resize de la VM
const EXPIRED_VM_CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const VM_RUNTIME_SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

const app = express();
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

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
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: process.env.AUTH_RATE_LIMIT_SKIP_SUCCESS !== 'false',
  message: { error: { message: 'Too many auth attempts', status: 429 } }
});
app.use('/api/auth', authLimiter);

const apiLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.API_RATE_LIMIT_MAX || 1200),
  standardHeaders: true,
  legacyHeaders: false,
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
const notificationsRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/openstack', openstackRoutes);
app.use('/api/vms', vmRoutes);
app.use('/api/vm-templates', vmTemplatesRoutes);
app.use('/api/flavors', flavorRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/pricing-rules', pricingRulesRoutes);
app.use('/api/notifications', notificationsRoutes);
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
  const runBilling = () => runThirtyMinuteBillingJob().then((r) => {
    if (r.invoicesCreated > 0) {
      console.log(`Billing job: ${r.invoicesCreated} facture(s) créée(s).`);
    }
    return r;
  }).catch((err) => {
    console.error('Billing job error:', err.message);
    throw err;
  });
  runBilling();
  setInterval(runBilling, BILLING_JOB_INTERVAL_MS);

  runDailyPaymentJob().catch((err) => console.error('Daily payment job error:', err.message));
  setInterval(() => {
    runDailyPaymentJob().catch((err) => console.error('Daily payment job error:', err.message));
  }, DAILY_PAYMENT_JOB_INTERVAL_MS);

  const metricsMonitor = new MetricsMonitor();
  metricsMonitor.attach(new AutoScaler());
  setInterval(() => {
    metricsMonitor.checkThresholds().catch((err) => console.error('Scaling check error:', err.message));
  }, SCALING_CHECK_INTERVAL_MS);

  // Confirmer les resize Nova : après resize, la VM passe en VERIFY_RESIZE jusqu'à confirmResize
  const runConfirmResizeJob = async () => {
    try {
      const vms = await VM.findAll({
        where: { instanceId: { [Op.ne]: null } },
        include: [{ model: User, attributes: ['openstackProjectId'] }]
      });
      for (const vm of vms) {
        const projectId = vm.User?.openstackProjectId || null;
        try {
          const data = await openstack.getServer(vm.instanceId, projectId);
          const server = data.server || data;
          const status = (server.status || '').toUpperCase();
          if (status === 'VERIFY_RESIZE') {
            await openstack.confirmResize(vm.instanceId, projectId);
            const refreshedData = await openstack.getServer(vm.instanceId, projectId).catch(() => null);
            const refreshedServer = refreshedData?.server || refreshedData;
            const actualFlavorId = refreshedServer?.flavor?.id || null;
            if (actualFlavorId && vm.flavorId !== actualFlavorId) {
              await vm.update({ flavorId: actualFlavorId });
            }

            const lastRequested = await ScalingEvent.findOne({
              where: {
                instanceId: vm.instanceId,
                action: { [Op.in]: ['resize_requested_up', 'resize_requested_down'] }
              },
              order: [['timestamp', 'DESC']]
            });

            if (lastRequested) {
              await ScalingEvent.create({
                instanceId: vm.instanceId,
                action: lastRequested.action === 'resize_requested_up' ? 'scale_up' : 'scale_down',
                oldFlavorId: lastRequested.oldFlavorId,
                newFlavorId: actualFlavorId || lastRequested.newFlavorId,
                triggerMetric: lastRequested.triggerMetric,
                triggerValue: lastRequested.triggerValue
              });
            }
            logger.info('Confirm resize', { instanceId: vm.instanceId, actualFlavorId });
          }
        } catch (e) {
          logger.warn('Confirm resize vm error', vm.instanceId, e.message);
        }
      }
    } catch (err) {
      logger.error('Confirm resize job error', err.message);
    }
  };
  setInterval(runConfirmResizeJob, CONFIRM_RESIZE_INTERVAL_MS);
  runConfirmResizeJob().catch((e) => logger.error('Confirm resize job', e.message));

  // Sync runtimes with real OpenStack states (ACTIVE opens, stopped-like states close)
  const runVmRuntimeSyncJob = async () => {
    try {
      const vms = await VM.findAll({
        where: { instanceId: { [Op.ne]: null } },
        include: [{ model: User, attributes: ['openstackProjectId'] }]
      });
      const closeStatuses = new Set(['SHUTOFF', 'PAUSED', 'SUSPENDED', 'ERROR', 'DELETED']);
      for (const vm of vms) {
        const projectId = vm.User?.openstackProjectId || null;
        try {
          const data = await openstack.getServer(vm.instanceId, projectId);
          const server = data.server || data;
          const status = String(server.status || '').toUpperCase();
          const openRuntime = await VmRuntime.findOne({
            where: { instanceId: vm.instanceId, userId: vm.userId, stoppedAt: null },
            order: [['startedAt', 'DESC']]
          });
          if (status === 'ACTIVE' && !openRuntime) {
            await VmRuntime.create({
              instanceId: vm.instanceId,
              userId: vm.userId,
              startedAt: new Date(),
              stoppedAt: null
            });
          } else if (closeStatuses.has(status) && openRuntime) {
            openRuntime.stoppedAt = new Date();
            await openRuntime.save();
          }
        } catch (e) {
          logger.warn('VM runtime sync error', vm.instanceId, e.message);
        }
      }
    } catch (err) {
      logger.error('VM runtime sync job error', err.message);
    }
  };
  setInterval(runVmRuntimeSyncJob, VM_RUNTIME_SYNC_INTERVAL_MS);
  runVmRuntimeSyncJob().catch((e) => logger.error('VM runtime sync', e.message));

  // Collecte périodique des métriques (Gnocchi / Ceilometer) vers ResourceUsage
  try {
    metricsCollector.start();
  } catch (err) {
    console.error('metricsCollector start error:', err.message);
  }

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
        await VmRuntime.update(
          { stoppedAt: new Date() },
          { where: { instanceId: vm.instanceId, userId: vm.userId, stoppedAt: null } }
        );
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

