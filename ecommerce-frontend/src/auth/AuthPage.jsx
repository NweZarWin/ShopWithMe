import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './authPage.css';

function validate(values, mode) {
  const errors = {};

  if (mode === 'signup' && !values.name.trim()) {
    errors.name = 'Name is required.';
  }
  if (!values.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (mode === 'signup' && values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  return errors;
}

export default function AuthPage({
  mode,
  onAuthenticated,
  modal = false,
  onClose
}) {
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState(mode);
  const location = useLocation();
  const navigate = useNavigate();
  const activeMode = modal ? modalMode : mode;
  const isSignup = activeMode === 'signup';

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate(values, activeMode);
    setErrors(validationErrors);
    setServerError('');

    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const { data } = await api.post(`/api/auth/${activeMode}`, values);
      localStorage.setItem('authToken', data.token);
      onAuthenticated(data.user);

      if (modal) {
        onClose();
        return;
      }

      navigate(location.state?.from || '/', { replace: true });
    } catch (error) {
      console.error(`Failed to ${activeMode}:`, error);
      setServerError(error.response?.data?.error || `Could not ${activeMode}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInput = (event) => {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const authContent = (
    <>
      {modal && (
        <button
          className="auth-modal-close"
          type="button"
          aria-label="Close sign-in dialog"
          onClick={onClose}
        >
          ×
        </button>
      )}
      {!modal && <Link className="auth-store-link" to="/">Ecommerce Store</Link>}
      <h1 id={modal ? 'auth-modal-title' : undefined}>
        {isSignup ? 'Create your account' : 'Sign in to add to cart'}
      </h1>
      <p className="auth-subtitle">
        {isSignup ? 'Create an account to add products to your cart.' : 'Sign in or create an account to continue.'}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {isSignup && (
          <label className="auth-field">
            Name
            <input
              autoComplete="name"
              name="name"
              value={values.name}
              onChange={handleInput}
            />
            {errors.name && <span className="auth-field-error">{errors.name}</span>}
          </label>
        )}

        <label className="auth-field">
          Email
          <input
            autoComplete="email"
            name="email"
            type="email"
            value={values.email}
            onChange={handleInput}
          />
          {errors.email && <span className="auth-field-error">{errors.email}</span>}
        </label>

        <label className="auth-field">
          Password
          <input
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            name="password"
            type="password"
            value={values.password}
            onChange={handleInput}
          />
          {errors.password && <span className="auth-field-error">{errors.password}</span>}
        </label>

        {serverError && <p className="auth-server-error" role="alert">{serverError}</p>}

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Please wait...' : isSignup ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch">
        {isSignup ? 'Already have an account?' : 'New to the store?'}{' '}
        {modal ? (
          <button
            className="auth-mode-button"
            type="button"
            onClick={() => {
              setModalMode(isSignup ? 'login' : 'signup');
              setErrors({});
              setServerError('');
            }}
          >
            {isSignup ? 'Sign in' : 'Create an account'}
          </button>
        ) : (
          <Link to={isSignup ? '/login' : '/signup'} state={location.state}>
            {isSignup ? 'Sign in' : 'Create an account'}
          </Link>
        )}
      </p>
      {!modal && <Link className="auth-back-link" to="/">Continue browsing products</Link>}
    </>
  );

  if (modal) {
    return (
      <div className="auth-modal-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
        <section
          aria-labelledby="auth-modal-title"
          aria-modal="true"
          className="auth-card auth-modal"
          role="dialog"
        >
          {authContent}
        </section>
      </div>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        {authContent}
      </section>
    </main>
  );
}
