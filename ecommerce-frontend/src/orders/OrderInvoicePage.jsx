import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Header } from '../components/Header';
import { formatMoney } from '../utils/money';
import api from '../utils/api';
import './OrderInvoicePage.css';

const paymentStatusLabels = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded'
};

export function OrderInvoicePage({ cart, authUser, onLogout }) {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api.get(`/api/orders/${encodeURIComponent(orderId)}?expand=products`)
      .then(({ data }) => {
        if (active) setOrder(data);
      })
      .catch((requestError) => {
        console.error('Failed to load order invoice:', requestError);
        if (active) {
          setError(requestError.response?.data?.error || 'Could not load this invoice.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  const products = order?.products || [];
  const hasPriceSnapshots = products.length > 0 && products.every(
    (item) => Number.isInteger(item.unitPriceCents)
      && Number.isInteger(item.shippingCostCents)
  );
  const itemsSubtotalCents = hasPriceSnapshots
    ? products.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0)
    : 0;
  const shippingTotalCents = hasPriceSnapshots
    ? products.reduce((total, item) => total + item.shippingCostCents, 0)
    : 0;
  const taxCents = hasPriceSnapshots
    ? order.totalCostCents - itemsSubtotalCents - shippingTotalCents
    : 0;
  const paymentStatus = order?.paymentStatus
    || (order?.status === 'delivered' ? 'paid' : 'unpaid');

  return (
    <>
      <title>{order ? `Invoice ${order.id}` : 'Order invoice'}</title>
      <Header cart={cart} authUser={authUser} onLogout={onLogout} />
      <main className="order-invoice-page">
        <div className="order-invoice-actions">
          <Link className="order-invoice-back-link" to="/orders">Back to My Orders</Link>
          <button type="button" className="button-primary" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </div>

        {isLoading ? (
          <p className="order-invoice-message" role="status">Loading invoice...</p>
        ) : error ? (
          <p className="order-invoice-message order-invoice-error" role="alert">{error}</p>
        ) : order && (
          <article className="order-invoice-slip">
            <header className="order-invoice-heading">
              <div>
                <p>Order Invoice</p>
                <h1>Invoice</h1>
              </div>
              <div className="order-invoice-number">
                <span>Order No</span>
                <strong>{order.id}</strong>
              </div>
            </header>

            <section className="order-invoice-summary">
              <div>
                <h2>Order details</h2>
                <p><strong>Date:</strong> {dayjs(order.orderTimeMs).format('MMMM D, YYYY h:mm A')}</p>
                <p><strong>Status:</strong> {order.status}</p>
                <p><strong>Payment:</strong> Cash on delivery (COD) — {paymentStatusLabels[paymentStatus] || paymentStatus}</p>
              </div>
              <div>
                <h2>Deliver to</h2>
                <p><strong>{order.customerName}</strong></p>
                <p>{order.customerEmail}</p>
                <p>{order.customerPhone}</p>
                <p>{order.shippingAddress}</p>
              </div>
            </section>

            <table className="order-invoice-items">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  {hasPriceSnapshots && (
                    <>
                      <th>Unit price</th>
                      <th>Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {products.map((item, index) => (
                  <tr key={`${item.productId}-${index}`}>
                    <td>{item.productName || item.product?.name || 'Product'}</td>
                    <td>{item.quantity}</td>
                    {hasPriceSnapshots && (
                      <>
                        <td>{formatMoney(item.unitPriceCents)}</td>
                        <td>{formatMoney(item.unitPriceCents * item.quantity)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            <section className="order-invoice-total">
              {hasPriceSnapshots && (
                <>
                  <div><span>Items subtotal</span><span>{formatMoney(itemsSubtotalCents)}</span></div>
                  <div><span>Shipping</span><span>{formatMoney(shippingTotalCents)}</span></div>
                  <div><span>Estimated tax</span><span>{formatMoney(taxCents)}</span></div>
                </>
              )}
              <div className="order-invoice-grand-total">
                <strong>Order total</strong>
                <strong>{formatMoney(order.totalCostCents)}</strong>
              </div>
            </section>
          </article>
        )}
      </main>
    </>
  );
}
