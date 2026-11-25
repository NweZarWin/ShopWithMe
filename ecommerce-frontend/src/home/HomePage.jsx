import api from '../utils/api';
import { useEffect ,useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './HomePage.css';
import { Header } from '../components/Header';
import '../components/cartSuccess.css';
import { ProductsGrid } from './ProductsGrid';

export function HomePage({ cart, loadCart, authUser, onLogout, onAuthenticated }) {
  const [products, setProducts] = useState([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [categories, setCategories] = useState([])
  const [categoriesError, setCategoriesError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const searchTerm = searchParams.get('search') || ''
  const selectedCategory = searchParams.get('category') || ''

  useEffect(() => {
    let active = true

    api.get('/api/products/categories')
      .then(({ data }) => {
        if (active) setCategories(data)
      })
      .catch((error) => {
        console.error('Failed to load product categories:', error)
        if (active) setCategoriesError('Could not load product categories.')
      })

    return () => {
      active = false
    }
  }, [])

  useEffect (()=> {
    let active = true;
    setIsLoadingProducts(true);
    setProductsError('');

    const params = new URLSearchParams()
    if (searchTerm.trim()) params.set('search', searchTerm.trim())
    if (selectedCategory) params.set('category', selectedCategory)
    const queryString = params.toString()
    const url = queryString ? `/api/products?${queryString}` : '/api/products'

    api.get(url)
      .then(({ data }) => {
        if (active) setProducts(data);
      })
      .catch((error) => {
        console.error('Failed to load products:', error);
        if (active) setProductsError('Could not load products. Please try again.');
      })
      .finally(() => {
        if (active) setIsLoadingProducts(false);
      });

    return () => {
      active = false;
    };
  }, [searchTerm, selectedCategory]);

  const handleCategoryChange = (event) => {
    const nextParams = new URLSearchParams(searchParams)
    if (event.target.value) {
      nextParams.set('category', event.target.value)
    } else {
      nextParams.delete('category')
    }
    setSearchParams(nextParams)
  }
  
  return (
    <>
      <title>Ecommerce Project</title>

      <Header cart={cart} authUser={authUser} onLogout={onLogout} />

      <div className="home-page">
        <div className="product-filters">
          <label htmlFor="product-category-filter">Browse by category</label>
          <select
            id="product-category-filter"
            value={selectedCategory}
            onChange={handleCategoryChange}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          {categoriesError && <span className="category-filter-error" role="alert">{categoriesError}</span>}
        </div>
        {isLoadingProducts ? (
          <p className="products-message">Loading products...</p>
        ) : productsError ? (
          <p className="products-message" role="alert">{productsError}</p>
        ) : products.length === 0 ? (
          <p className="products-message">No products found.</p>
        ) : (
          <ProductsGrid
            products={products}
            loadCart={loadCart}
            authUser={authUser}
            onAuthenticated={onAuthenticated}
          />
        )}
      </div>
    </>
  );
}