import express from 'express';
import { Order } from '../models/Order.js';
import { ReturnRequest } from '../models/ReturnRequest.js';
import { Product } from '../models/Product.js';
import { parseRefundProofDataUrl, serializeReturnRequest } from '../utils/refundProof.js';

const router = express.Router();
const allowedNextStatuses = {
  pending: ['packed', 'cancelled'],
  packed: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
};

router.get('/', async (req, res) => {
  try {
    const orders = await Order.unscoped().findAll({
      order: [['orderTimeMs', 'DESC']]
    });

    const ordersWithProducts = await Promise.all(orders.map(async (order) => {
      const orderData = order.toJSON();
      const returnRequests = await ReturnRequest.findAll({
        where: { orderId: order.id }
      });
      const returnsByLine = new Map(
        returnRequests.map((request) => [request.lineIndex, serializeReturnRequest(request)])
      );
      const products = await Promise.all((orderData.products || []).map(async (item, lineIndex) => {
        const product = await Product.findByPk(item.productId);
        return {
          ...item,
          lineIndex,
          returnRequest: returnsByLine.get(lineIndex) || null,
          product: product
            ? {
                id: product.id,
                name: product.name,
                image: product.image,
                category: product.category,
                priceCents: product.priceCents
              }
            : null
        };
      }));

      return { ...orderData, products };
    }));

    return res.json(ordersWithProducts);
  } catch (error) {
    console.error('Could not load admin orders:', error);
    return res.status(500).json({ error: 'Could not load orders.' });
  }
});

router.get('/:orderId/returns/:returnId/refund-proof', async (req, res) => {
  const returnRequest = await ReturnRequest.findOne({
    where: { id: req.params.returnId, orderId: req.params.orderId }
  });
  if (!returnRequest?.refundProofDataUrl) {
    return res.status(404).json({ error: 'Refund screenshot not found.' });
  }

  return res.json({ dataUrl: returnRequest.refundProofDataUrl });
});

router.put('/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const requestedStatus = req.body?.status;

  try {
    const order = await Order.unscoped().findByPk(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const allowedStatuses = Object.hasOwn(allowedNextStatuses, order.status)
      ? allowedNextStatuses[order.status]
      : [];
    if (!allowedStatuses.includes(requestedStatus)) {
      return res.status(400).json({
        error: allowedStatuses.length
          ? `Order status can only move from ${order.status} to ${allowedStatuses.join(' or ')}.`
          : `A ${order.status} order cannot be changed.`
      });
    }

    const updatedAt = new Date();
    const updateValues = { status: requestedStatus, updatedAt };
    if (requestedStatus === 'delivered') {
      updateValues.paymentStatus = 'paid';
      updateValues.deliveredAt = updatedAt;
    }
    const [updatedRows] = await Order.unscoped().update(updateValues, {
      where: { id: orderId, status: order.status }
    });

    if (updatedRows === 0) {
      return res.status(409).json({ error: 'This order was updated by another admin. Refresh and try again.' });
    }
    const updatedOrder = await Order.unscoped().findByPk(orderId);

    return res.json({
      order: updatedOrder.toJSON()
    });
  } catch (error) {
    console.error('Could not update admin order status:', error);
    return res.status(500).json({ error: 'Could not update the order status.' });
  }
});

router.put('/:orderId/returns/:returnId/status', async (req, res) => {
  const { orderId, returnId } = req.params;
  const requestedStatus = req.body?.status;
  if (!['approved', 'rejected'].includes(requestedStatus)) {
    return res.status(400).json({ error: 'Choose approved or rejected for this return request.' });
  }

  const refundAmountCents = Number(req.body?.refundAmountCents);
  const refundReference = typeof req.body?.refundReference === 'string'
    ? req.body.refundReference.trim()
    : '';
  const hasRefundProof = req.body?.refundProofDataUrl !== undefined
    && req.body.refundProofDataUrl !== null
    && req.body.refundProofDataUrl !== '';
  const refundProofDataUrl = hasRefundProof
    ? parseRefundProofDataUrl(req.body.refundProofDataUrl)
    : null;
  if (requestedStatus === 'approved') {
    if (!Number.isSafeInteger(refundAmountCents) || refundAmountCents <= 0) {
      return res.status(400).json({ error: 'Enter a valid refund amount.' });
    }
    if (!refundReference || refundReference.length > 128) {
      return res.status(400).json({ error: 'Enter a KPay transfer reference (up to 128 characters).' });
    }
    if (hasRefundProof && !refundProofDataUrl) {
      return res.status(400).json({
        error: 'Upload a valid PNG, JPEG, or WebP screenshot no larger than 2 MB.'
      });
    }
  }

  try {
    const order = await Order.unscoped().findByPk(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (requestedStatus === 'approved' && order.status !== 'delivered') {
      return res.status(400).json({ error: 'A return can only be refunded after the order is delivered.' });
    }

    const returnRequest = await ReturnRequest.findOne({
      where: { id: returnId, orderId }
    });
    if (!returnRequest) {
      return res.status(404).json({ error: 'Return request not found.' });
    }
    const isRecordingLegacyRefund = returnRequest.status === 'approved'
      && requestedStatus === 'approved'
      && (!returnRequest.refundAmountCents || !returnRequest.refundReference);
    if (returnRequest.status !== 'requested' && !isRecordingLegacyRefund) {
      return res.status(400).json({ error: 'This return request has already been reviewed.' });
    }

    if (requestedStatus === 'approved') {
      const approvedReturns = await ReturnRequest.findAll({
        where: { orderId, status: 'approved' },
        attributes: ['id', 'refundAmountCents']
      });
      const totalCostCents = Number(order.totalCostCents);
      const alreadyRefundedCents = approvedReturns
        .filter((request) => request.id !== returnRequest.id)
        .reduce(
          (total, request) => total + (Number(request.refundAmountCents) || 0),
          0
        );
      if (!Number.isSafeInteger(totalCostCents) || refundAmountCents > totalCostCents - alreadyRefundedCents) {
        return res.status(400).json({ error: 'Refund amount exceeds the remaining order balance.' });
      }
    }

    const reviewedAt = returnRequest.reviewedAt || new Date().toISOString();
    const refundIssuedAt = new Date().toISOString();
    await returnRequest.update({
      status: requestedStatus,
      reviewedAt,
      reviewedBy: returnRequest.reviewedBy || req.user.id,
      ...(requestedStatus === 'approved' && {
        refundAmountCents,
        refundProvider: 'KPay',
        refundReference,
        refundProofDataUrl,
        refundIssuedAt
      })
    });

    let paymentStatus = order.paymentStatus;
    if (requestedStatus === 'approved') {
      const allReturnRequests = await ReturnRequest.findAll({ where: { orderId } });
      const totalRefundedCents = allReturnRequests
        .filter((request) => request.status === 'approved')
        .reduce((total, request) => total + (Number(request.refundAmountCents) || 0), 0);
      paymentStatus = totalRefundedCents >= Number(order.totalCostCents)
        ? 'refunded'
        : 'partially_refunded';
      await order.update({ paymentStatus });
    }

    return res.json({
      returnRequest: serializeReturnRequest(returnRequest),
      paymentStatus
    });
  } catch (error) {
    console.error('Could not review return request:', error);
    return res.status(500).json({ error: 'Could not update this return request.' });
  }
});

export default router;
