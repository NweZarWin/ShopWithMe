import dayjs from 'dayjs';
import { formatMoney } from '../utils/money';
import { getImageUrl } from '../utils/imageUrl';
import { DeliveryOptions } from './DeliveryOptions';
import api from '../utils/api';
import { useState } from 'react';

export function OrderSummary({ cart, deliveryOptions, loadCart }) {
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [error, setError] = useState('');

  const updateCartItem = async (cartItem, changes) => {
    setUpdatingProductId(cartItem.productId);
    setError('');
    try {
      await api.put(`/api/cart-items/${cartItem.productId}`, changes);
      await loadCart();
    } catch (updateError) {
      console.error('Failed to update cart item:', updateError);
      setError(updateError.response?.data?.error || 'Could not update this cart item.');
    } finally {
      setUpdatingProductId(null);
    }
  };

  return (
    <div className="order-summary">
      {error && <p className="checkout-error" role="alert">{error}</p>}
      {deliveryOptions.length > 0 && cart.map((cartItem) => {
        const selectedDeliveryOption = deliveryOptions
          .find((deliveryOption) => {
            return deliveryOption.id === cartItem.deliveryOptionId;
          });

        const isUpdating = updatingProductId === cartItem.productId;
        const deleteCartItem = async () => {
          setUpdatingProductId(cartItem.productId);
          setError('');
          try {
            await api.delete(`/api/cart-items/${cartItem.productId}`);
            await loadCart();
          } catch (deleteError) {
            console.error('Failed to remove cart item:', deleteError);
            setError(deleteError.response?.data?.error || 'Could not remove this cart item.');
          } finally {
            setUpdatingProductId(null);
          }
        };

        return (
          <div key={cartItem.productId} className="cart-item-container">
            <label className="cart-item-select">
              <input
                type="checkbox"
                checked={Boolean(cartItem.selected)}
                disabled={isUpdating}
                onChange={(event) => updateCartItem(cartItem, { selected: event.target.checked })}
              />
              Select to buy
            </label>
            <div className="delivery-date">
              Delivery date: {dayjs(selectedDeliveryOption.estimatedDeliveryTimeMs).format('dddd, MMMM D')}
            </div>

            <div className="cart-item-details-grid">
              <img className="product-image"
                src={getImageUrl(cartItem.product.image)} />

              <div className="cart-item-details">
                <div className="product-name">
                  {cartItem.product.name}
                </div>
                <div className="product-price">
                  {formatMoney(cartItem.product.priceCents)}
                </div>
                <div className="product-quantity">
                  <label>
                    Quantity:
                    <select
                      className="cart-item-quantity-select"
                      value={cartItem.quantity}
                      disabled={isUpdating}
                      onChange={(event) => updateCartItem(cartItem, {
                        quantity: Number(event.target.value)
                      })}
                    >
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((quantity) => (
                        <option key={quantity} value={quantity}>{quantity}</option>
                      ))}
                    </select>
                  </label>
                  <span className="delete-quantity-link link-primary"
                    aria-disabled={isUpdating}
                    onClick={deleteCartItem}>
                    Delete
                  </span>
                </div>
              </div>

              <DeliveryOptions cartItem={cartItem} deliveryOptions={deliveryOptions} loadCart={loadCart} />
            </div>
          </div>
        );
      })}
    </div>
  );
}