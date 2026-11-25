import { formatMoney } from '../utils/money';
import { getImageUrl } from '../utils/imageUrl';
import { Link, useLocation } from 'react-router-dom';
import { ProductPurchase } from '../components/ProductPurchase';
import { ImagePreview } from '../components/ImagePreview';

export function Product({ product, loadCart, authUser, onAuthenticated }) {
  const location = useLocation();

  return (
    <div className="product-container">
      <div className="product-image-container">
        <ImagePreview
          className="home-product-image-preview"
          imageClassName="product-image"
          src={getImageUrl(product.image)}
          alt={product.name}
        />
      </div>
      <div className="product-name limit-text-to-2-lines">{product.name}</div>
      <div className="product-details-action">
        <Link
          className="product-details-link"
          to={`/products/${product.id}`}
          state={{ from: `${location.pathname}${location.search}` }}
        >
          <span className="view-product-details">View product details</span>
        </Link>
      </div>

      {product.category && (
        <span className="product-category-label">{product.category}</span>
      )}

      <div className="product-rating-container">
        <img
          className="product-rating-stars"
          src={`/images/ratings/rating-${product.rating.stars * 10}.png`}
          alt={`${product.rating.stars} out of 5 stars`}
        />
        <div className="product-rating-count link-primary">
          {product.rating.count}
        </div>
      </div>

      <div className="product-price">
        {formatMoney(product.priceCents)}
      </div>

      <div className="product-spacer"></div>
      <ProductPurchase
        product={product}
        loadCart={loadCart}
        authUser={authUser}
        onAuthenticated={onAuthenticated}
      />
    </div>
  );
}