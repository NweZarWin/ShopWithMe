import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { ProductPurchase } from '../components/ProductPurchase';
import api from '../utils/api';
import { formatMoney } from '../utils/money';
import { getImageUrl } from '../utils/imageUrl';
import './ProductDetailsPage.css';

export function ProductDetailsPage({ cart, loadCart, authUser, onLogout, onAuthenticated }) {
  const { productId } = useParams();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const backToProducts = location.state?.from || '/';

  useEffect(() => {
    let active = true;
    setProduct(null);
    setIsLoading(true);
    setError('');

    api.get(`/api/products/${encodeURIComponent(productId)}`)
      .then(({ data }) => {
        if (active) setProduct(data);
      })
      .catch((requestError) => {
        console.error('Failed to load product details:', requestError);
        if (active) {
          setError(requestError.response?.status === 404
            ? 'This product could not be found.'
            : 'Could not load product details. Please try again.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  return (
    <>
      <title>{product ? product.name : 'Product details'}</title>
      <Header cart={cart} authUser={authUser} onLogout={onLogout} />
      <main className="product-detail-page">
        <Link className="product-detail-back-link" to={backToProducts}>
          &larr; Back to products
        </Link>

        {isLoading ? (
          <p className="product-detail-message">Loading product details...</p>
        ) : error ? (
          <p className="product-detail-message" role="alert">{error}</p>
        ) : product && (
          <section className="product-detail-card">
            <div className="product-detail-image-wrap">
              <img src={getImageUrl(product.image)} alt={product.name} />
            </div>
            <div className="product-detail-info">
              <p className="product-detail-eyebrow">Product details</p>
              <h1>{product.name}</h1>
              <div className="product-detail-rating">
                <img
                  src={`/images/ratings/rating-${product.rating.stars * 10}.png`}
                  alt={`${product.rating.stars} out of 5 stars`}
                />
                <span>{product.rating.count} reviews</span>
              </div>
              <p className="product-detail-price">{formatMoney(product.priceCents)}</p>
              {product.category && (
                <div className="product-detail-keywords">
                  <strong>Category:</strong>
                  <Link to={`/?category=${encodeURIComponent(product.category)}`}>
                    {product.category}
                  </Link>
                </div>
              )}
              {product.keywords?.length > 0 && (
                <div className="product-detail-keywords">
                  <strong>Keywords:</strong>
                  <span>{product.keywords.join(', ')}</span>
                </div>
              )}
              <div className="product-detail-purchase">
                <p>Would you like to add this product to your cart?</p>
                <ProductPurchase
                  product={product}
                  loadCart={loadCart}
                  authUser={authUser}
                  onAuthenticated={onAuthenticated}
                />
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
