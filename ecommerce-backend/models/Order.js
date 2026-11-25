import { DataTypes } from 'sequelize';
import { sequelize } from './index.js';

export const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'packed', 'shipped', 'delivered', 'cancelled']]
    }
  },
  paymentStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'unpaid',
    validate: {
      isIn: [['unpaid', 'paid', 'partially_refunded', 'refunded']]
    }
  },
  deliveredAt: {
    type: DataTypes.DATE(3),
    allowNull: true
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customerEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customerPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shippingAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'cash_on_hand',
    validate: {
      isIn: [['cash_on_hand']]
    }
  },
  orderTimeMs: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  totalCostCents: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  products: {
    type: DataTypes.JSON,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE(3)
  },
  updatedAt: {
    type: DataTypes.DATE(3)
  },
}, {
  defaultScope: {
    order: [['createdAt', 'ASC']]
  }
});
