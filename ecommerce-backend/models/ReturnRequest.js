import { DataTypes } from 'sequelize';
import { sequelize } from './index.js';

export const ReturnRequest = sequelize.define('ReturnRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  lineIndex: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'requested',
    validate: {
      isIn: [['requested', 'approved', 'rejected']]
    }
  },
  reviewedAt: {
    type: DataTypes.DATE(3),
    allowNull: true
  },
  reviewedBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  refundAmountCents: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  refundProvider: {
    type: DataTypes.STRING,
    allowNull: true
  },
  refundReference: {
    type: DataTypes.STRING(128),
    allowNull: true
  },
  refundProofDataUrl: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  refundIssuedAt: {
    type: DataTypes.DATE(3),
    allowNull: true
  }
}, {
  indexes: [{
    unique: true,
    fields: ['orderId', 'lineIndex']
  }]
});
