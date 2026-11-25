import dayjs from 'dayjs';
import { useState, useEffect, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { ImagePreview } from '../components/ImagePreview';
import { RefundProofImage } from '../components/RefundProofImage';
import { formatMoney } from '../utils/money';
import { getImageUrl } from '../utils/imageUrl';
import './OrderPages.css';
import api from '../utils/api';

const paymentStatusLabels = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded'
};

export function OrderPages({ cart, authUser, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [activeReturnKey, setActiveReturnKey] = useState('');
  const [returnDrafts, setReturnDrafts] = useState({});
  const [actionErrors, setActionErrors] = useState({});
  const [savingReturnKey, setSavingReturnKey] = useState('');

  useEffect(() => {
    let active = true;

    api.get('/api/orders?expand=products')
      .then((response) => {
        if (active) setOrders(response.data);
      })
      .catch((error) => {
        console.error('Failed to load orders:', error);
        if (active) {
          setOrdersError(error.response?.data?.error || 'Could not load your orders. Please try again.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const setActionError = (key, message) => {
    setActionErrors((current) => ({ ...current, [key]: message }));
  };

  const submitReturnRequest = async (orderId, lineIndex, key) => {
    const reason = returnDrafts[key] || '';
    setSavingReturnKey(key);
    setActionError(key, '');

    try {
      const { data } = await api.post(`/api/orders/${orderId}/returns`, {
        lineIndex,
        reason
      });
      setOrders((currentOrders) => currentOrders.map((order) => (
        order.id === orderId
          ? {
              ...order,
              products: order.products.map((item, index) => (
                index === lineIndex
                  ? {
                      ...item,
                      returnRequest: data.returnRequest,
                      canRequestReturn: false,
                      returnWindowExpired: false
                    }
                  : item
              ))
            }
          : order
      )));
      setActiveReturnKey('');
    } catch (error) {
      console.error('Failed to submit return request:', error);
      setActionError(
        key,
        error.response?.data?.error || 'Could not submit your return request. Please try again.'
      );
    } finally {
      setSavingReturnKey('');
    }
  };

  return (
    <>
      <title>My Orders</title>

      <Header cart={cart} authUser={authUser} onLogout={onLogout} />

      <main className="orders-page">
        <h1 className="page-title">My Orders</h1>

        {ordersError && <p className="orders-message orders-error" role="alert">{ordersError}</p>}
        {isLoading && <p className="orders-message" role="status">Loading your orders...</p>}
        {!isLoading && !ordersError && orders.length === 0 && (
          <p className="orders-message">You have not placed any orders yet.</p>
        )}

        <div className="orders-grid">
          {!ordersError && orders.map((order) => {
            const orderProducts = order.products || [];
            const totalItems = orderProducts.reduce(
              (total, orderProduct) => total + Number(orderProduct.quantity || 0),
              0
            );
            const statusLabel = !order.status || order.status === 'pending'
              ? 'Pending (processing)'
              : order.status.charAt(0).toUpperCase() + order.status.slice(1);
            const paymentStatus = order.paymentStatus
              || (order.status === 'delivered' ? 'paid' : 'unpaid');

            return (
              <article key={order.id} className="order-container">
                <header className="order-header">
                  <div className="order-header-left-section">
                    <div className="order-date">
                      <div className="order-header-label">Order Placed:</div>
                      <div>{dayjs(order.orderTimeMs).format('MMMM D, YYYY')}</div>
                    </div>
                    <div className="order-total">
                      <div className="order-header-label">Total:</div>
                      <div>{formatMoney(order.totalCostCents)}</div>
                    </div>
                  </div>

                  <div className="order-header-right-section">
                    <div className="order-header-detail">
                      <div className="order-header-label">Order No:</div>
                      <div className="order-number-value">{order.id}</div>
                    </div>
                    <div className="order-header-detail">
                      <div className="order-header-label">Status:</div>
                      <div className={`order-status order-status-${order.status}`}>
                        {statusLabel}
                      </div>
                    </div>
                    <div className="order-header-detail">
                      <div className="order-header-label">Total items:</div>
                      <div>{totalItems}</div>
                    </div>
                    <div className="order-header-detail">
                      <div className="order-header-label">Payment:</div>
                      <div>
                        Cash on delivery (COD){' '}
                        <span className={`payment-status payment-status-${paymentStatus}`}>
                          {paymentStatusLabels[paymentStatus] || paymentStatus}
                        </span>
                      </div>
                    </div>
                    <div className="order-header-detail">
                      <Link className="order-invoice-link" to={`/orders/${order.id}/invoice`}>
                        Print invoice
                      </Link>
                    </div>
                  </div>
                </header>

                <div className="order-details-grid">
                  {orderProducts.map((orderProduct, lineIndex) => {
                    const key = `${order.id}:${lineIndex}`;
                    const returnRequest = orderProduct.returnRequest;

                    return (
                      <Fragment key={key}>
                        <div className="product-image-container">
                          <ImagePreview
                            className="orders-image-preview"
                            imageClassName="orders-product-image"
                            src={getImageUrl(orderProduct.product.image)}
                            alt={orderProduct.product.name}
                          />
                        </div>

                        <div className="product-details">
                          <div className="product-name">{orderProduct.product.name}</div>
                          <div className="product-delivery-date">
                            {order.status === 'delivered' && order.deliveredAt
                              ? `Delivered on: ${dayjs(order.deliveredAt).format('MMMM D')}`
                              : `Arriving on: ${dayjs(orderProduct.estimatedDeliveryTimeMs).format('MMMM D')}`}
                          </div>
                          <div className="product-quantity">Quantity: {orderProduct.quantity}</div>
                        </div>

                        <div className="product-actions">
                          {order.status !== 'cancelled' && orderProduct.review && (
                            <section className="order-product-action-section">
                              <div className="product-review-summary">
                                <strong>Your review: {orderProduct.review.rating}/5</strong>
                                {orderProduct.review.comment && <p>{orderProduct.review.comment}</p>}
                              </div>
                            </section>
                          )}

                          {returnRequest && (
                            <section className="order-product-action-section">
                              <strong className={`return-status return-status-${returnRequest.status}`}>
                                Return {returnRequest.status}
                              </strong>
                              {returnRequest.reason && <p>{returnRequest.reason}</p>}
                              {returnRequest.status === 'approved' && (
                                <p className="return-refund-details">
                                  {returnRequest.refundReference
                                    ? `Refunded ${formatMoney(returnRequest.refundAmountCents)} via ${returnRequest.refundProvider}. KPay reference: ${returnRequest.refundReference}`
                                    : 'Return approved, but no KPay transfer reference was recorded.'}
                                </p>
                              )}
                              {returnRequest.hasRefundProof && (
                                <RefundProofImage
                                    src={`/api/orders/${order.id}/returns/${returnRequest.id}/refund-proof`}
                                />
                              )}
                            </section>
                          )}
                          {orderProduct.returnWindowExpired && (
                            <p className="return-window-expired">Return period has ended.</p>
                          )}
                          {orderProduct.canRequestReturn && (
                            activeReturnKey !== key ? (
                              <button
                                className="order-action-button order-return-button"
                                type="button"
                                onClick={() => {
                                  setReturnDrafts((current) => ({ ...current, [key]: '' }));
                                  setActionError(key, '');
                                  setActiveReturnKey(key);
                                }}
                              >
                                {returnRequest?.status === 'rejected' ? 'Request return again' : 'Return item'}
                              </button>
                            ) : (
                              <form
                                className="order-action-form"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  submitReturnRequest(order.id, lineIndex, key);
                                }}
                              >
                                <label>
                                  Return reason
                                  <textarea
                                    required
                                    minLength={3}
                                    maxLength={1000}
                                    value={returnDrafts[key] || ''}
                                    onChange={(event) => setReturnDrafts((current) => ({
                                      ...current,
                                      [key]: event.target.value
                                    }))}
                                    rows={3}
                                  />
                                </label>
                                {actionErrors[key] && (
                                  <p className="order-action-error" role="alert">{actionErrors[key]}</p>
                                )}
                                <div className="order-form-buttons">
                                  <button
                                    className="order-action-button order-return-button"
                                    type="submit"
                                    disabled={savingReturnKey === key}
                                  >
                                    {savingReturnKey === key ? 'Sending...' : 'Submit return'}
                                  </button>
                                  <button
                                    className="order-cancel-action-button"
                                    type="button"
                                    onClick={() => setActiveReturnKey('')}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            )
                          )}
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </>
  );
}
