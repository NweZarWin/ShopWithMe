import './checkoutPage.css';
import { Header } from '../components/Header';
import { useEffect, useState } from 'react';
import { OrderSummary } from './OrderSummary';
import { PaymentSummary } from './PaymentSummary';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const emptyContact = { name: '', email: '', phone: '', address: '' };

function validateContact(contact) {
  if (!contact.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())
    || !contact.phone.trim() || !contact.address.trim()) {
    return 'Enter your name, valid email, phone number, and delivery address.';
  }

  const phoneDigits = contact.phone.replace(/\D/g, '');
  if (!/^[+()\d\s-]{7,20}$/.test(contact.phone.trim())
    || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return 'Enter a valid phone number.';
  }

  return '';
}

export function CheckOutPage({ cart, loadCart, authUser, onUserUpdate, onLogout }) {
  const navigate = useNavigate();
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [deliveryOptionsError, setDeliveryOptionsError] = useState('');
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [paymentSummaryError, setPaymentSummaryError] = useState('');
  const [contact, setContact] = useState(emptyContact);
  const [contactError, setContactError] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash_on_hand');
  const [placeOrderError, setPlaceOrderError] = useState('');

  const selectedItemsCount = cart.reduce(
    (total, item) => total + (item.selected ? item.quantity : 0),
    0
  );
  useEffect(() => {
    setContact({
      name: authUser?.name || '',
      email: authUser?.email || '',
      phone: authUser?.phone || '',
      address: authUser?.address || ''
    });
  }, [authUser]);

  useEffect(() => {
    let active = true;

    api.get('/api/delivery-options?expand=estimatedDeliveryTime')
      .then(({ data }) => {
        if (active) {
          setDeliveryOptions(data);
          setDeliveryOptionsError('');
        }
      })
      .catch((error) => {
        console.error('Failed to load delivery options:', error);
        if (active) setDeliveryOptionsError('Could not load delivery options. Please try again.');
      });

    api.get('/api/payment-summary')
      .then(({ data }) => {
        if (active) {
          setPaymentSummary(data);
          setPaymentSummaryError('');
        }
      })
      .catch((error) => {
        console.error('Failed to load payment summary:', error);
        if (active) setPaymentSummaryError('Could not load payment summary. Please try again.');
      });

    return () => {
      active = false;
    };
  }, [cart]);

  const handleContactInput = (event) => {
    setContact((current) => ({ ...current, [event.target.name]: event.target.value }));
    setContactError('');
    setPlaceOrderError('');
  };

  const placeOrder = async () => {
    if (selectedItemsCount === 0) return;

    const contactValidationError = validateContact(contact);
    if (contactValidationError) {
      setContactError(contactValidationError);
      setPlaceOrderError('Complete your delivery details before placing the order.');
      return;
    }

    setIsPlacingOrder(true);
    setPlaceOrderError('');
    setContactError('');
    let isSavingProfile = true;
    try {
      const { data: profileData } = await api.put('/api/auth/profile', contact);
      onUserUpdate(profileData.user);
      setContact(profileData.user);
      isSavingProfile = false;

      await api.post('/api/orders', { paymentMethod });
      navigate('/orders');
      loadCart().catch((error) => {
        console.error('Order placed, but cart refresh failed:', error);
      });
    } catch (error) {
      if (isSavingProfile) {
        console.error('Failed to save checkout contact details:', error);
        setContactError(error.response?.data?.error || 'Could not save your contact details.');
      } else {
        console.error('Failed to place order:', error);
        setPlaceOrderError(error.response?.data?.error || 'Could not place your order. Please try again.');
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <>
      <Header cart={cart} authUser={authUser} onLogout={onLogout} />
      <title>Checkout</title>

      <div className="checkout-page">
        <div className="page-title">Checkout</div>

        <div className="checkout-grid">
          <div className="checkout-left-column">
            <OrderSummary
              cart={cart}
              deliveryOptions={deliveryOptions}
              deliveryOptionsError={deliveryOptionsError}
              loadCart={loadCart}
            />

            <section className="buyer-details">
              <h2>Delivery and contact information</h2>
              <p className="buyer-details-hint">
                Confirm or update the details for this delivery.
              </p>
              {contactError && <p className="checkout-error" role="alert">{contactError}</p>}
              <div className="buyer-contact-form">
                <label>
                  Name
                  <input
                    name="name"
                    autoComplete="name"
                    value={contact.name}
                    onChange={handleContactInput}
                    required
                  />
                </label>
                <label>
                  Phone number
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={contact.phone}
                    onChange={handleContactInput}
                    required
                  />
                </label>
                <label>
                  Delivery address
                  <textarea
                    name="address"
                    autoComplete="street-address"
                    value={contact.address}
                    onChange={handleContactInput}
                    rows="3"
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={contact.email}
                    onChange={handleContactInput}
                    required
                  />
                </label>
              </div>
            </section>
          </div>

          {paymentSummaryError && <p className="checkout-error" role="alert">{paymentSummaryError}</p>}
          {paymentSummary && (
            <PaymentSummary
              paymentSummary={paymentSummary}
              onPlaceOrder={placeOrder}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              isPlacingOrder={isPlacingOrder}
              placeOrderError={placeOrderError}
              selectedItemsCount={selectedItemsCount}
            />
          )}
        </div>
      </div>
    </>
  );
}
