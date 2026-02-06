const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VM = sequelize.define('VM', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    field: 'user_id'
  },
  instanceId: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'OpenStack server UUID',
    field: 'instance_id'
  },
  flavorId: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'flavor_id'
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: true,
    defaultValue: 'UNKNOWN'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'vms',
  underscored: true,
  timestamps: true
});

module.exports = VM;
