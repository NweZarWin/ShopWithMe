import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveDatabaseToFile, sequelize } from './models/index.js';
import { DataTypes, Op } from 'sequelize';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import deliveryOptionRoutes from './routes/deliveryOptions.js';
import cartItemRoutes from './routes/cartItems.js';
import orderRoutes from './routes/orders.js';
import adminOrderRoutes from './routes/adminOrders.js';
import resetRoutes from './routes/reset.js';
import paymentSummaryRoutes from './routes/paymentSummary.js';
import { Product } from './models/Product.js';
import { DeliveryOption } from './models/DeliveryOption.js';
import { CartItem } from './models/CartItem.js';
import { Order } from './models/Order.js';
import { requireAuth } from './middleware/requireAuth.js';
import { requireAdmin } from './middleware/requireAdmin.js';
import { defaultProducts } from './defaultData/defaultProducts.js';
import { defaultDeliveryOptions } from './defaultData/defaultDeliveryOptions.js';
import { defaultCart } from './defaultData/defaultCart.js';
import { defaultOrders } from './defaultData/defaultOrders.js';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json({ limit: '3mb' }));

// Serve images from the images folder
app.use('/images', express.static(path.join(__dirname, 'images')));

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/delivery-options', deliveryOptionRoutes);
app.use('/api/cart-items', requireAuth, cartItemRoutes);
app.use('/api/orders', requireAuth, orderRoutes);
app.use('/api/admin/orders', requireAuth, requireAdmin, adminOrderRoutes);
app.use('/api/reset', resetRoutes);
app.use('/api/payment-summary', requireAuth, paymentSummaryRoutes);

// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route to serve index.html for any unmatched routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

// Error handling middleware
/* eslint-disable no-unused-vars */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
/* eslint-enable no-unused-vars */

// Sync database and load default data if none exist
await sequelize.sync();

const queryInterface = sequelize.getQueryInterface();
const schemaColumns = {
  CartItems: {
    userId: { type: DataTypes.UUID, allowNull: true },
    selected: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  },
  Orders: {
    userId: { type: DataTypes.UUID, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
    customerName: { type: DataTypes.STRING, allowNull: true },
    customerEmail: { type: DataTypes.STRING, allowNull: true },
    customerPhone: { type: DataTypes.STRING, allowNull: true },
    shippingAddress: { type: DataTypes.TEXT, allowNull: true },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'cash_on_hand'
    },
    paymentStatus: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'unpaid'
    },
    deliveredAt: { type: DataTypes.DATE(3), allowNull: true }
  },
  Users: {
    phone: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'customer'
    }
  },
  Products: {
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Other'
    }
  },
  ReturnRequests: {
    refundAmountCents: { type: DataTypes.INTEGER, allowNull: true },
    refundProvider: { type: DataTypes.STRING, allowNull: true },
    refundReference: { type: DataTypes.STRING(128), allowNull: true },
    refundProofDataUrl: { type: DataTypes.TEXT('long'), allowNull: true },
    refundIssuedAt: { type: DataTypes.DATE(3), allowNull: true }
  }
};

for (const [tableName, columnsToEnsure] of Object.entries(schemaColumns)) {
  const columns = await queryInterface.describeTable(tableName);
  for (const [columnName, definition] of Object.entries(columnsToEnsure)) {
    if (!columns[columnName]) {
      await queryInterface.addColumn(tableName, columnName, definition);
    }
  }
}

const deliveredOrders = await Order.unscoped().findAll({
  where: { status: 'delivered' },
  attributes: ['id', 'paymentStatus', 'deliveredAt', 'updatedAt', 'orderTimeMs']
});
for (const order of deliveredOrders) {
  const updates = {};
  if (order.paymentStatus === 'unpaid') {
    updates.paymentStatus = 'paid';
  }
  if (!order.deliveredAt) {
    const deliveredAt = order.updatedAt || order.orderTimeMs;
    const parsedDeliveredAt = new Date(deliveredAt);
    if (Number.isFinite(parsedDeliveredAt.getTime())) {
      updates.deliveredAt = parsedDeliveredAt;
    }
  }
  if (Object.keys(updates).length > 0) {
    await Order.unscoped().update(updates, {
      where: { id: order.id },
      silent: true
    });
  }
}

await Order.update(
  { paymentMethod: 'cash_on_hand' },
  { where: { paymentMethod: 'cash_on_delivery' } }
);

for (const defaultProduct of defaultProducts) {
  await queryInterface.bulkUpdate(
    'Products',
    { category: defaultProduct.category },
    {
      id: defaultProduct.id,
      [Op.or]: [{ category: 'Other' }, { category: null }]
    },
    {}
  );
}

await queryInterface.bulkUpdate('Products', { category: 'Other' }, { category: null }, {});

if (sequelize.getDialect() === 'sqlite') {
  await saveDatabaseToFile();
}

const productCount = await Product.count();
if (productCount === 0) {
  const timestamp = Date.now();

  const productsWithTimestamps = defaultProducts.map((product, index) => ({
    ...product,
    createdAt: new Date(timestamp + index),
    updatedAt: new Date(timestamp + index)
  }));

  const deliveryOptionsWithTimestamps = defaultDeliveryOptions.map((option, index) => ({
    ...option,
    createdAt: new Date(timestamp + index),
    updatedAt: new Date(timestamp + index)
  }));

  const cartItemsWithTimestamps = defaultCart.map((item, index) => ({
    ...item,
    createdAt: new Date(timestamp + index),
    updatedAt: new Date(timestamp + index)
  }));

  const ordersWithTimestamps = defaultOrders.map((order, index) => ({
    ...order,
    createdAt: new Date(timestamp + index),
    updatedAt: new Date(timestamp + index)
  }));

  await Product.bulkCreate(productsWithTimestamps);
  await DeliveryOption.bulkCreate(deliveryOptionsWithTimestamps);
  await CartItem.bulkCreate(cartItemsWithTimestamps);
  await Order.bulkCreate(ordersWithTimestamps);

  console.log('Default data added to the database.');
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
