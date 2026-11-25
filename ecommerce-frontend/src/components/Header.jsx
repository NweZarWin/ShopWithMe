import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import './header.css';

export function Header({ cart, authUser, onLogout }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  let totalQuantity = 0;

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
        profileMenuRef.current?.querySelector('button')?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  cart.forEach((cartItem) => {
    totalQuantity += cartItem.quantity;
  });

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchTerm.trim();
    const nextParams = new URLSearchParams(searchParams)
    if (query) {
      nextParams.set('search', query)
    } else {
      nextParams.delete('search')
    }
    const queryString = nextParams.toString()
    navigate(queryString ? `/?${queryString}` : '/')
  };

  return (
    <div className="header">
      <div className="left-section">
        <Link to="/" className="header-link">
          <img className="logo" src="/images/logo.png" alt="Shopping with me" />
          <img className="mobile-logo" src="/images/mobile-logo.png" alt="Shopping with me" />
        </Link>
      </div>

      <form className="middle-section" onSubmit={handleSearch} role="search">
        <input
          className="search-bar"
          type="search"
          aria-label="Search products"
          placeholder="Search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />

        <button className="search-button" type="submit" aria-label="Search">
          <img className="search-icon" src="/images/icons/search-icon.png" alt="" />
        </button>
      </form>

      <div className="right-section">
        {authUser?.role === 'admin' && (
          <Link className="admin-link header-link" to="/admin/orders">Admin</Link>
        )}
        <Link className="orders-link header-link" to="/orders">
          <span className="orders-text">Orders</span>
        </Link>

        <Link className="cart-link header-link" to="/checkout">
          <img className="cart-icon" src="/images/icons/cart-icon.png" alt="" />
          <div className="cart-quantity">{totalQuantity}</div>
          <div className="cart-text">Cart</div>
        </Link>
        {authUser ? (
          <div className="header-profile" ref={profileMenuRef}>
            <button
              className="header-profile-trigger"
              type="button"
              aria-label="Profile"
              aria-expanded={isProfileMenuOpen}
              aria-controls="header-profile-dropdown"
              onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
            >
              <span className="header-profile-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.1 0-7.5 2.1-7.5 4.75V21h15v-2.25C19.5 16.1 16.1 14 12 14Z" />
                </svg>
              </span>
              <span className="header-profile-label">{authUser.name || 'Profile'}</span>
            </button>
            {isProfileMenuOpen && (
              <div className="header-profile-dropdown" id="header-profile-dropdown">
                <div className="header-profile-details">
                  <span className="header-profile-name">{authUser.name}</span>
                  {authUser.email && <span className="header-profile-email">{authUser.email}</span>}
                </div>
                <Link
                  className="header-profile-menu-link"
                  to="/orders"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  My Orders
                </Link>
                <button className="header-profile-sign-out" type="button" onClick={onLogout}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link className="header-account-link" to="/login">Sign in</Link>
            <Link className="header-account-link" to="/signup">Sign up</Link>
          </>
        )}
      </div>
    </div>
  );
}