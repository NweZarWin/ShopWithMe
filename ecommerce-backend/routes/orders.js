import express from 'express';
import { Order } from '../models/Order.js';
import { OrderReview } from '../models/OrderReview.js';
import { ReturnRequest } from '../models/ReturnRequest.js';
import { Product } from '../models/Product.js';
import { DeliveryOption } from '../models/DeliveryOption.js';
import { CartItem } from '../models/CartItem.js';
import { serializeReturnRequest } from '../utils/refundProof.js';

const router = express.Router();
const returnWindowMs = 7 * 24 * 60 * 60 * 1000;

async function expandOrder(order) {
  const orderData = order.toJSON();
  const [reviews, returnRequests] = await Promise.all([
    OrderReview.findAll({ where: { orderId: order.id } }),
    ReturnRequest.findAll({ where: { orderId: order.id } })
  ]);
  const reviewsByLine = new Map(reviews.map((review) => [review.lineIndex, review.toJSON()]));
  const returnsByLine = new Map(
    returnRequests.map((request) => [request.lineIndex, serializeReturnRequest(request)])
  );
  const deliveredAt = orderData.deliveredAt || orderData.updatedAt;
  const deliveredTime = deliveredAt ? new Date(deliveredAt).getTime() : NaN;
  const returnWindowEndsAt = deliveredTime + returnWindowMs;
  const isWithinReturnWindow = Number.isFinite(deliveredTime) && Date.now() <= returnWindowEndsAt;

  const products = await Promise.all((orderData.products || []).map(async (item, lineIndex) => {
    const product = await Product.findByPk(item.productId);
    const returnRequest = returnsByLine.get(lineIndex) || null;

    return {
      ...item,
      lineIndex,
      product,
      review: reviewsByLine.get(lineIndex) || null,
      returnRequest,
      canRequestReturn: order.status === 'delivered'
        && isWithinReturnWindow
        && (!returnRequest || returnRequest.status === 'rejected'),
      returnWindowExpired: order.status === 'delivered'
        && !isWithinReturnWindow
        && !returnRequest
    };
  }));

  return { ...orderData, products };
}

router.get('/', async (req, res) => {
  const orders = await Order.unscoped().findAll({
    where: { userId: req.user.id },
    order: [['orderTimeMs', 'DESC']]
  });

  if (req.query.expand === 'products') {
    return res.json(await Promise.all(orders.map(expandOrder)));
  }

  return res.json(orders);
});

router.post('/', async (req, res) => {
  const paymentMethod = req.body?.paymentMethod;
  if (paymentMethod !== 'cash_on_hand') {
    return res.status(400).json({ error: 'Select the cash on hand payment method.' });
  }

  const cartItems = await CartItem.findAll({
    where: { userId: req.user.id, selected: true }
  });

  if (cartItems.length === 0) {
    return res.status(400).json({ error: 'Select at least one cart item to place your order.' });
  }

  if (!req.user.phone || !req.user.address) {
    return res.status(400).json({ error: 'Please save your phone number and delivery address first.' });
  }

  let productCostCents = 0;
  let shippingCostCents = 0;
  const products = await Promise.all(cartItems.map(async (item) => {
    const product = await Product.findByPk(item.productId);
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }
    const deliveryOption = await DeliveryOption.findByPk(item.deliveryOptionId);
    if (!deliveryOption) {
      throw new Error(`Invalid delivery option: ${item.deliveryOptionId}`);
    }
    productCostCents += product.priceCents * item.quantity;
    shippingCostCents += deliveryOption.priceCents;
    const estimatedDeliveryTimeMs = Date.now() + deliveryOption.deliveryDays * 24 * 60 * 60 * 1000;
    return {
      productId: item.productId,
      productName: product.name,
      unitPriceCents: product.priceCents,
      quantity: item.quantity,
      shippingCostCents: deliveryOption.priceCents,
      estimatedDeliveryTimeMs
    };
  }));

  const taxCents = Math.round((productCostCents + shippingCostCents) * 0.1);
  const totalCostCents = productCostCents + shippingCostCents + taxCents;
  const order = await Order.create({
    userId: req.user.id,
    status: 'pending',
    paymentStatus: 'unpaid',
    customerName: req.user.name,
    customerEmail: req.user.email,
    customerPhone: req.user.phone,
    shippingAddress: req.user.address,
    paymentMethod,
    orderTimeMs: Date.now(),
    totalCostCents,
    products
  });

  await CartItem.destroy({ where: { userId: req.user.id, selected: true } });

  return res.status(201).json(order);
});

router.post('/:orderId/returns', async (req, res) => {
  const order = await Order.unscoped().findOne({
    where: { id: req.params.orderId, userId: req.user.id }
  });
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  if (order.status !== 'delivered') {
    return res.status(400).json({ error: 'Products can only be returned after delivery.' });
  }

  const lineIndex = Number(req.body?.lineIndex);
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  const item = order.products?.[lineIndex];
  if (!Number.isInteger(lineIndex) || lineIndex < 0 || !item) {
    return res.status(400).json({ error: 'Select a valid product from this order.' });
  }
  if (reason.length < 3 || reason.length > 1000) {
    return res.status(400).json({ error: 'Return reason must be between 3 and 1000 characters.' });
  }

  const deliveredAt = order.deliveredAt || order.updatedAt;
  const deliveredTime = deliveredAt ? new Date(deliveredAt).getTime() : NaN;
  if (!Number.isFinite(deliveredTime) || Date.now() > deliveredTime + returnWindowMs) {
    return res.status(400).json({ error: 'The 7-day return window has expired.' });
  }

  const existingRequest = await ReturnRequest.findOne({
    where: { orderId: order.id, lineIndex }
  });
  if (existingRequest && existingRequest.status !== 'rejected') {
    return res.status(409).json({
      error: existingRequest.status === 'approved'
        ? 'This product has already been returned.'
        : 'A return request for this product is already under review.'
    });
  }

  const values = {
    userId: req.user.id,
    productId: item.productId,
    quantity: item.quantity,
    reason,
    status: 'requested',
    reviewedAt: null,
    reviewedBy: null,
    refundAmountCents: null,
    refundProvider: null,
    refundReference: null,
    refundProofDataUrl: null,
    refundIssuedAt: null
  };
  const returnRequest = existingRequest
    ? await existingRequest.update(values)
    : await ReturnRequest.create({ orderId: order.id, lineIndex, ...values });

  return res.status(existingRequest ? 200 : 201).json({
    returnRequest: returnRequest.toJSON()
  });
});

router.get('/:orderId', async (req, res) => {
  const order = await Order.unscoped().findOne({
    where: { id: req.params.orderId, userId: req.user.id }
  });
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  if (req.query.expand === 'products') {
    return res.json(await expandOrder(order));
  }

  return res.json(order);
});

router.get('/:orderId/returns/:returnId/refund-proof', async (req, res) => {
  const order = await Order.unscoped().findOne({
    where: { id: req.params.orderId, userId: req.user.id }
  });
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const returnRequest = await ReturnRequest.findOne({
    where: { id: req.params.returnId, orderId: order.id }
  });
  if (!returnRequest?.refundProofDataUrl) {
    return res.status(404).json({ error: 'Refund screenshot not found.' });
  }

  return res.json({ dataUrl: returnRequest.refundProofDataUrl });
});

export default router;
