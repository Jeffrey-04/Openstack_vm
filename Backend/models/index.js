const { sequelize, testConnection } = require('../config/database');
const User = require('./User');
const VM = require('./VM');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');
const ScalingPolicy = require('./ScalingPolicy');
const ScalingEvent = require('./ScalingEvent');
const ResourceUsage = require('./ResourceUsage');
const PricingRule = require('./PricingRule');
const VmRuntime = require('./VmRuntime');
const VMTemplate = require('./VMTemplate');
const GlobalScaleUpRule = require('./GlobalScaleUpRule');
const PaymentMethod = require('./PaymentMethod');
const UsageSlice = require('./UsageSlice');

// Associations
User.hasMany(VM, { foreignKey: 'userId' });
VM.belongsTo(User, { foreignKey: 'userId' });
VM.hasMany(ResourceUsage, { foreignKey: 'vmId' });
ResourceUsage.belongsTo(VM, { foreignKey: 'vmId' });

User.hasMany(Invoice, { foreignKey: 'userId' });
Invoice.belongsTo(User, { foreignKey: 'userId', as: 'User' });
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'InvoiceItems' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId' });

User.hasMany(VmRuntime, { foreignKey: 'userId' });
VmRuntime.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(PaymentMethod, { foreignKey: 'userId' });
PaymentMethod.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(UsageSlice, { foreignKey: 'userId' });
UsageSlice.belongsTo(User, { foreignKey: 'userId' });
Invoice.hasMany(UsageSlice, { foreignKey: 'invoiceId' });
UsageSlice.belongsTo(Invoice, { foreignKey: 'invoiceId' });

const models = {
  User,
  VM,
  Invoice,
  InvoiceItem,
  ScalingPolicy,
  ScalingEvent,
  ResourceUsage,
  PricingRule,
  VmRuntime,
  VMTemplate,
  GlobalScaleUpRule,
  PaymentMethod,
  UsageSlice
};

// alter: true on SQLite can fail when changing columns (backup table gets UNIQUE violation
// if users table has duplicate emails). Use alter: false by default so the server starts.
const syncDatabase = async (options = {}) => {
  const dialect = sequelize.getDialect();
  const useAlter = options.alter ?? (process.env.DB_ALTER === 'true' && dialect !== 'sqlite');
  await sequelize.sync({ ...options, alter: useAlter });
  return sequelize;
};

module.exports = {
  sequelize,
  models,
  syncDatabase,
  testConnection,
  User,
  VM,
  Invoice,
  InvoiceItem,
  ScalingPolicy,
  ScalingEvent,
  ResourceUsage,
  PricingRule,
  VmRuntime,
  VMTemplate,
  GlobalScaleUpRule,
  PaymentMethod,
  UsageSlice
};
