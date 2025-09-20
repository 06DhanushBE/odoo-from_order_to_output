import React from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline, CircularProgress, Box } from '@mui/material'
import Layout from './components/Layout'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import ManufacturingOrderForm from './pages/ManufacturingOrderForm'
import BillOfMaterials from './pages/BillOfMaterials'
import StockLedger from './pages/StockLedger'
import WorkOrders from './pages/WorkOrders'
import ProfileSettings from './pages/ProfileSettings'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Modern theme configuration
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#f50057',
      light: '#ff5983',
      dark: '#c51162',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.125rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.125rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
        contained: {
          boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .3)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          background: 'linear-gradient(145deg, #1976d2 0%, #1565c0 100%)',
          color: '#ffffff',
        },
      },
    },
  },
})

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="background.default"
      >
        <CircularProgress size={60} />
      </Box>
    )
  }

  if (!user) {
    // Redirect to login but remember where they were trying to go
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

// Public Route Component (redirect to dashboard if already logged in)
function PublicRoute({ children }) {
  const { user, isLoading } = useAuth()

  // Show loading spinner while authentication is being checked
  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="background.default"
      >
        <CircularProgress size={60} />
      </Box>
    )
  }

  // If user is authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  // Show public route content for non-authenticated users
  return children
}

function AppContent() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/signup" 
        element={
          <PublicRoute>
            <SignUp />
          </PublicRoute>
        } 
      />
      <Route 
        path="/forgot-password" 
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        } 
      />
      
      {/* Protected Routes - All users access the same pages */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/manufacturing-orders" 
        element={
          <ProtectedRoute>
            <Layout>
              <ManufacturingOrderForm />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/manufacturing-orders/new" 
        element={
          <ProtectedRoute>
            <Layout>
              <ManufacturingOrderForm />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/work-orders" 
        element={
          <ProtectedRoute>
            <Layout>
              <WorkOrders />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/bills-of-materials" 
        element={
          <ProtectedRoute>
            <Layout>
              <BillOfMaterials />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/stock-ledger" 
        element={
          <ProtectedRoute>
            <Layout>
              <StockLedger />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Layout>
              <ProfileSettings />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* Catch all route - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App