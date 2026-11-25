import { useEffect, useState } from 'react';
import api from '../utils/api';
import AuthPage from '../auth/AuthPage';
import './cartSuccess.css';

export function ProductPurchase({ product, loadCart, authUser, onAuthenticated }) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [isAdded, setIsAdded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!isAdded) return undefined;

    const timeoutId = window.setTimeout(() => setIsAdded(false), 1500);
    return () => window.clearTimeout(timeoutId);
  }, [isAdded]);

  const handleAuthenticated = (user) => {
    onAuthenticated(user);
    setLoginMessage('Signed in. Click Add to Cart again to add this product.');
  };

  const addToCart = async () => {
    setError('');
    setIsAdded(false);

    if (!authUser) {
      setLoginMessage('');
      setShowAuthModal(true);
      return;
    }

    setIsAdding(true);
    setLoginMessage('');
    try {
      await api.post('/api/cart-items', {
        productId: product.id,
        quantity
      });
      await loadCart();
      setIsAdded(true);
    } catch (addError) {
      console.error('Failed to add product to cart:', addError);
      setError(addError.response?.data?.error || 'Could not add this product to cart.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <div className="product-quantity-container">
        <label>
          Quantity{' '}
          <select
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          >
            {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </label>
      </div>

      {isAdded && (
        <div className="cart-success-overlay">
          <div className="cart-success-popup" role="status" aria-live="polite">
            <img src="/images/icons/checkmark.png" alt="" />
            <div className="cart-success-copy">
              <strong>Added to cart successfully!</strong>
              <span>{product.name}</span>
            </div>
          </div>
        </div>
      )}

      {error && <p className="product-cart-error" role="alert">{error}</p>}
      {loginMessage && <p className="product-cart-message" role="status">{loginMessage}</p>}
      <button
        className="add-to-cart-button button-primary"
        type="button"
        onClick={addToCart}
        disabled={isAdding}
      >
        {isAdding ? 'Adding...' : 'Add to Cart'}
      </button>
      {showAuthModal && (
        <AuthPage
          mode="login"
          modal
          onClose={() => setShowAuthModal(false)}
          onAuthenticated={handleAuthenticated}
        />
      )}
    </>
  );
}
