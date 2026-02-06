const { sequelize, testConnection } = require('../config/database');
const User = require('./User');
const VM = require('./VM');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');
const ScalingPolicy = require('./ScalingPolicy');
const ScalingEvent = require('./ScalingEvent');
const ResourceUsage = require('./ResourceUsage');
const PricingRule = require('./PricingRule');

// Associations
User.hasMany(VM, { foreignKey: 'userId' });
VM.belongsTo(User, { foreignKey: 'userId' });
VM.hasMany(ResourceUsage, { foreignKey: 'vmId' });
ResourceUsage.belongsTo(VM, { foreignKey: 'vmId' });

User.hasMany(Invoice, { foreignKey: 'userId' });
Invoice.belongsTo(User, { foreignKey: 'userId', as: 'User' });
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'InvoiceItems' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId' });

const models = {
  User,
  VM,
  Invoice,
  InvoiceItem,
  ScalingPolicy,
  ScalingEvent,
  ResourceUsage,
  PricingRule
};

const syncDatabase = async (options = { alter: true }) => {
  await sequelize.sync(options);
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
  PricingRule
};
