import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { CheckOutPage } from './checkout/CheckOutPage'
import AuthPage from './auth/AuthPage'
import { HomePage } from './home/HomePage'
import { ProductDetailsPage } from './home/ProductDetailsPage'
import { OrderPages } from './orders/OrderPages'
import { OrderInvoicePage } from './orders/OrderInvoicePage'
import { AdminOrdersPage } from './admin/AdminOrdersPage'
import api from './utils/api'

function ProtectedRoute({ authReady, authUser, children }) {
  const location = useLocation()

  if (!authReady) {
    return <p className="account-loading">Loading your account...</p>
  }

  if (!authUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

function AdminRoute({ authReady, authUser, children }) {
  const location = useLocation()

  if (!authReady) {
    return <p className="account-loading">Loading your account...</p>
  }

  if (!authUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (authUser.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  const [cart, setCart] = useState([])
  const [authUser, setAuthUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [cartError, setCartError] = useState('')
  const [authError, setAuthError] = useState('')

  const loadCart = useCallback(async (force = false) => {
    if (!authUser && !force) {
      setCart([])
      return
    }

    try {
      const response = await api.get('/api/cart-items?expand=product')
      setCart(response.data)
      setCartError('')
    } catch (error) {
      setCartError(error.response?.data?.error || 'Could not load your cart.')
      throw error
    }
  }, [authUser])

  useEffect(() => {
    let active = true
    const token = localStorage.getItem('authToken')

    if (!token) {
      setAuthReady(true)
      return () => {
        active = false
      }
    }

    api.get('/api/auth/me')
      .then(({ data }) => {
        if (active) setAuthUser(data.user)
      })
      .catch((error) => {
        localStorage.removeItem('authToken')
        if (active && error.response?.status !== 401) {
          setAuthError(error.response?.data?.error || 'Could not restore your session.')
        }
      })
      .finally(() => {
        if (active) setAuthReady(true)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!authUser) {
      setCart([])
      return
    }

    loadCart().catch((error) => {
      console.error('Failed to load cart:', error)
    })
  }, [authUser, loadCart])

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout')
      localStorage.removeItem('authToken')
      setAuthUser(null)
      setAuthError('')
    } catch (error) {
      console.error('Failed to log out:', error)
      setAuthError(error.response?.data?.error || 'Could not log out. Please try again.')
    }
  }

  return (
    <BrowserRouter>
      {authError && <p className="app-alert" role="alert">{authError}</p>}
      {cartError && <p className="app-alert" role="alert">{cartError}</p>}
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              cart={cart}
              loadCart={loadCart}
              authUser={authUser}
              onLogout={handleLogout}
              onAuthenticated={setAuthUser}
            />
          }
        />
        <Route
          path="/login"
          element={<AuthPage mode="login" onAuthenticated={setAuthUser} />}
        />
        <Route
          path="/products/:productId"
          element={
            <ProductDetailsPage
              cart={cart}
              loadCart={loadCart}
              authUser={authUser}
              onLogout={handleLogout}
              onAuthenticated={setAuthUser}
            />
          }
        />
        <Route
          path="/signup"
          element={<AuthPage mode="signup" onAuthenticated={setAuthUser} />}
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute authReady={authReady} authUser={authUser}>
              <CheckOutPage
                cart={cart}
                loadCart={loadCart}
                authUser={authUser}
                onUserUpdate={setAuthUser}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:orderId/invoice"
          element={
            <ProtectedRoute authReady={authReady} authUser={authUser}>
              <OrderInvoicePage cart={cart} authUser={authUser} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute authReady={authReady} authUser={authUser}>
              <OrderPages cart={cart} authUser={authUser} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminRoute authReady={authReady} authUser={authUser}>
              <AdminOrdersPage
                cart={cart}
                authUser={authUser}
                onLogout={handleLogout}
              />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
