import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Header } from '../components/Header';
import { RefundProofImage } from '../components/RefundProofImage';
import { formatMoney } from '../utils/money';
import { getImageUrl } from '../utils/imageUrl';
import api from '../utils/api';
import './AdminOrdersPage.css';

const nextOrderStatus = {
  pending: { status: 'packed', label: 'Confirm order' },
  packed: { status: 'shipped', label: 'Mark as shipped' },
  shipped: { status: 'delivered', label: 'Mark as delivered' }
};

const statusLabels = {
  pending: 'Pending',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const paymentStatusLabels = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded'
};

export function AdminOrdersPage({ cart, authUser, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [updatingReturnId, setUpdatingReturnId] = useState(null);
  const [refundDrafts, setRefundDrafts] = useState({});

  useEffect(() => {
    let active = true;

    api.get('/api/admin/orders')
      .then(({ data }) => {
        if (active) setOrders(data);
      })
      .catch((error) => {
        console.error('Failed to load admin orders:', error);
        if (active) setLoadError(error.response?.data?.error || 'Could not load orders.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateOrderStatus = async (order, status) => {
    setUpdatingOrderId(order.id);
    setActionError('');

    try {
      const { data } = await api.put(`/api/admin/orders/${order.id}/status`, {
        status
      });
      setOrders((currentOrders) => currentOrders.map((currentOrder) => (
        currentOrder.id === order.id
          ? {
              ...currentOrder,
              status: data.order.status,
              paymentStatus: data.order.paymentStatus,
              deliveredAt: data.order.deliveredAt,
              updatedAt: data.order.updatedAt
            }
          : currentOrder
      )));
    } catch (error) {
      console.error('Failed to update order status:', error);
      setActionError(error.response?.data?.error || 'Could not update this order.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const advanceOrder = (order) => {
    const nextStep = nextOrderStatus[order.status];
    if (nextStep) updateOrderStatus(order, nextStep.status);
  };

  const rejectOrder = (order) => {
    if (order.status === 'pending' && window.confirm('Reject and cancel this order?')) {
      updateOrderStatus(order, 'cancelled');
    }
  };

  const reviewReturnRequest = async (order, returnRequest, status) => {
    const refundDraft = refundDrafts[returnRequest.id] || {};
    const refundAmount = Number(refundDraft.amount);
    const refundAmountCents = Math.round(refundAmount * 100);
    const refundReference = refundDraft.reference?.trim() || '';
    if (status === 'approved' && (
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0 ||
      !Number.isSafeInteger(refundAmountCents) ||
      !refundReference ||
      refundReference.length > 128
    )) {
      setActionError('Enter a valid refund amount and KPay transfer reference.');
      return;
    }

    setUpdatingReturnId(returnRequest.id);
    setActionError('');

    try {
      const { data } = await api.put(
        `/api/admin/orders/${order.id}/returns/${returnRequest.id}/status`,
        {
          status,
          ...(status === 'approved' && {
            refundAmountCents,
            refundReference,
            refundProofDataUrl: refundDraft.proofDataUrl || null
          })
        }
      );
      setRefundDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[returnRequest.id];
        return nextDrafts;
      });
      setOrders((currentOrders) => currentOrders.map((currentOrder) => (
        currentOrder.id === order.id
          ? {
              ...currentOrder,
              paymentStatus: data.paymentStatus,
              products: currentOrder.products.map((item, lineIndex) => (
                lineIndex === data.returnRequest.lineIndex
                  ? { ...item, returnRequest: data.returnRequest }
                  : item
              ))
            }
          : currentOrder
      )));
    } catch (error) {
      console.error('Failed to review return request:', error);
      setActionError(error.response?.data?.error || 'Could not update this return request.');
    } finally {
      setUpdatingReturnId(null);
    }
  };

  const handleRefundProofChange = (returnId, event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!acceptedTypes.includes(file.type) || file.size > 2 * 1024 * 1024) {
      setActionError('Choose a PNG, JPEG, or WebP screenshot no larger than 2 MB.');
      event.currentTarget.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setActionError('Could not read the selected screenshot.');
        return;
      }
      setRefundDrafts((current) => ({
        ...current,
        [returnId]: {
          ...current[returnId],
          proofDataUrl: reader.result
        }
      }));
      setActionError('');
    };
    reader.onerror = () => {
      setActionError('Could not read the selected screenshot.');
    };
    reader.readAsDataURL(file);
  };

  const orderCounts = orders.reduce((counts, order) => ({
    ...counts,
    [order.status]: (counts[order.status] || 0) + 1
  }), {});

  return (
    <>
      <title>Admin - Orders</title>
      <Header cart={cart} authUser={authUser} onLogout={onLogout} />
      <main className="admin-orders-page">
        <header className="admin-orders-heading">
          <div>
            <p className="admin-orders-eyebrow">Store management</p>
            <h1>Customer orders</h1>
          </div>
          <div className="admin-order-counts" aria-label="Order counts by status">
            {Object.entries(statusLabels).map(([status, label]) => (
              <span key={status} className={`admin-order-count admin-order-count--${status}`}>
                {label}: {orderCounts[status] || 0}
              </span>
            ))}
          </div>
        </header>

        {actionError && <p className="admin-orders-error" role="alert">{actionError}</p>}
        {isLoading ? (
          <p className="admin-orders-message">Loading orders...</p>
        ) : loadError ? (
          <p className="admin-orders-error" role="alert">{loadError}</p>
        ) : orders.length === 0 ? (
          <p className="admin-orders-message">There are no customer orders yet.</p>
        ) : (
          <div className="admin-order-list">
            {orders.map((order) => {
              const nextStep = nextOrderStatus[order.status];

              return (
                <article className="admin-order-card" key={order.id}>
                  <header className="admin-order-card-header">
                    <div>
                      <span className="admin-order-label">Order</span>
                      <strong>{order.id}</strong>
                    </div>
                    <div>
                      <span className="admin-order-label">Placed</span>
                      <strong>{dayjs(order.orderTimeMs).format('MMM D, YYYY h:mm A')}</strong>
                    </div>
                    <div>
                      <span className="admin-order-label">Status</span>
                      <span className={`admin-order-status admin-order-status--${order.status}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    <div>
                      <span className="admin-order-label">Order total</span>
                      <strong>{formatMoney(order.totalCostCents)}</strong>
                    </div>
                  </header>

                  <div className="admin-order-card-body">
                    <section className="admin-customer-details">
                      <h2>Customer</h2>
                      <p><strong>{order.customerName || 'Name not provided'}</strong></p>
                      <p>{order.customerEmail || 'Email not provided'}</p>
                      <p>{order.customerPhone || 'Phone not provided'}</p>
                      <p>{order.shippingAddress || 'Address not provided'}</p>
                      <p>
                        Payment: Cash on delivery (COD) —{' '}
                        {paymentStatusLabels[order.paymentStatus] || order.paymentStatus || 'Unpaid'}
                      </p>
                    </section>

                    <section className="admin-ordered-products">
                      <h2>Items</h2>
                      {order.products.map((item, lineIndex) => (
                        <div className="admin-ordered-product-row" key={`${order.id}-${lineIndex}`}>
                          <div className="admin-ordered-product">
                            {item.product?.image && (
                              <img src={getImageUrl(item.product.image)} alt="" />
                            )}
                            <div>
                              <strong>{item.product?.name || 'Product no longer available'}</strong>
                              <span>Quantity: {item.quantity}</span>
                            </div>
                          </div>
                          {item.returnRequest && (
                            <div className="admin-return-request">
                              <p>
                                Return {item.returnRequest.status}: {item.returnRequest.reason}
                              </p>
                              {item.returnRequest.status === 'approved' && item.returnRequest.refundReference && (
                                <p className="admin-return-refund-details">
                                  Refunded {formatMoney(item.returnRequest.refundAmountCents)} via{' '}
                                  {item.returnRequest.refundProvider}. KPay reference:{' '}
                                  {item.returnRequest.refundReference}
                                </p>
                              )}
                              {item.returnRequest.hasRefundProof && (
                                <RefundProofImage
                                  src={`/api/admin/orders/${order.id}/returns/${item.returnRequest.id}/refund-proof`}
                                />
                              )}
                              {(item.returnRequest.status === 'requested' ||
                                (item.returnRequest.status === 'approved' && !item.returnRequest.refundReference)) && (
                                <form
                                  className="admin-return-refund-form"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    reviewReturnRequest(order, item.returnRequest, 'approved');
                                  }}
                                >
                                  <p>
                                    {item.returnRequest.status === 'requested'
                                      ? 'Confirm the item has been received and the KPay refund has been sent, then record its transfer details.'
                                      : 'This return was approved earlier. Verify the KPay refund has been sent, then record its transfer details.'}
                                  </p>
                                  <label>
                                    Refund amount ($)
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      required
                                      value={refundDrafts[item.returnRequest.id]?.amount || ''}
                                      onChange={(event) => setRefundDrafts((current) => ({
                                        ...current,
                                        [item.returnRequest.id]: {
                                          ...current[item.returnRequest.id],
                                          amount: event.target.value
                                        }
                                      }))}
                                    />
                                  </label>
                                  <label>
                                    KPay transfer reference
                                    <input
                                      type="text"
                                      maxLength={128}
                                      required
                                      value={refundDrafts[item.returnRequest.id]?.reference || ''}
                                      onChange={(event) => setRefundDrafts((current) => ({
                                        ...current,
                                        [item.returnRequest.id]: {
                                          ...current[item.returnRequest.id],
                                          reference: event.target.value
                                        }
                                      }))}
                                    />
                                  </label>
                                  <label>
                                    Transfer screenshot (optional; PNG, JPEG, or WebP, max 2 MB)
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp"
                                      onChange={(event) => handleRefundProofChange(item.returnRequest.id, event)}
                                    />
                                  </label>
                                  {refundDrafts[item.returnRequest.id]?.proofDataUrl && (
                                    <img
                                      className="admin-return-proof-preview"
                                      src={refundDrafts[item.returnRequest.id].proofDataUrl}
                                      alt="Selected KPay transfer screenshot preview"
                                    />
                                  )}
                                  <div className="admin-return-actions">
                                    <button
                                      type="submit"
                                      className="admin-order-action"
                                      disabled={updatingReturnId === item.returnRequest.id}
                                    >
                                      {updatingReturnId === item.returnRequest.id
                                        ? 'Updating...'
                                        : item.returnRequest.status === 'requested'
                                          ? 'Confirm KPay refund'
                                          : 'Record KPay refund'}
                                    </button>
                                  </div>
                                </form>
                              )}
                              {item.returnRequest.status === 'requested' && (
                                <div className="admin-return-actions">
                                  <button
                                    type="button"
                                    className="admin-order-action admin-order-action--reject"
                                    disabled={updatingReturnId === item.returnRequest.id}
                                    onClick={() => reviewReturnRequest(order, item.returnRequest, 'rejected')}
                                  >
                                    {updatingReturnId === item.returnRequest.id ? 'Updating...' : 'Reject return'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </section>
                  </div>

                  {(nextStep || order.status === 'pending') && (
                    <footer className="admin-order-card-footer">
                      {nextStep && (
                        <button
                          type="button"
                          className="admin-order-action"
                          disabled={updatingOrderId === order.id}
                          onClick={() => advanceOrder(order)}
                        >
                          {updatingOrderId === order.id ? 'Updating...' : nextStep.label}
                        </button>
                      )}
                      {order.status === 'pending' && (
                        <button
                          type="button"
                          className="admin-order-action admin-order-action--reject"
                          disabled={updatingOrderId === order.id}
                          onClick={() => rejectOrder(order)}
                        >
                          {updatingOrderId === order.id ? 'Updating...' : 'Reject / Cancel'}
                        </button>
                      )}
                    </footer>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
