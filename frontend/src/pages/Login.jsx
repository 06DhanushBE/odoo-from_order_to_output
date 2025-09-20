import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  IconButton,
  InputAdornment,
  Link,
} from '@mui/material'
import { Visibility, VisibilityOff, Factory } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'

function Login() {
  const { login, isLoading, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  
  const [loginData, setLoginData] = useState({
    loginId: '',
    password: ''
  })

  // Redirect if user is already logged in or after successful login
  useEffect(() => {
    if (user && !isLoading) {
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [user, isLoading, navigate, location])

  const validateForm = () => {
    const errors = {}
    
    // Email validation - accept any valid email format
    if (!loginData.loginId.trim()) {
      errors.loginId = 'Email address is required'
    } else if (!loginData.loginId.includes('@')) {
      errors.loginId = 'Please enter a valid email address'
    }
    
    // Password validation
    if (!loginData.password) {
      errors.password = 'Password is required'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) {
      return
    }
    
    // Convert loginId to email format for backend compatibility
    const credentials = {
      email: loginData.loginId,
      password: loginData.password
    }
    
    const result = await login(credentials)
    
    if (!result.success) {
      setError(result.error)
    }
    // Navigation will be handled by useEffect when user state updates
  }

  const handleLoginChange = (e) => {
    const { name, value } = e.target
    setLoginData({
      ...loginData,
      [name]: value
    })
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: ''
      })
    }
    
    // Clear general error when user starts typing
    if (error) {
      setError('')
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container component="main" maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              color: 'white',
              py: 4,
              textAlign: 'center',
            }}
          >
            <Factory sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h4" component="h1" fontWeight="bold">
              Manufacturing System
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9, mt: 1 }}>
              From Order to Output
            </Typography>
          </Box>

          {/* Login Form */}
          <Box sx={{ p: 4 }}>
            {/* Alerts */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleLoginSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="loginId"
                label="Email Address"
                name="loginId"
                autoComplete="email"
                autoFocus
                value={loginData.loginId}
                onChange={handleLoginChange}
                variant="outlined"
                error={!!validationErrors.loginId}
                helperText={validationErrors.loginId || 'Use your email address to sign in'}
                sx={{ mb: 2 }}
                placeholder="Enter your email address"
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={loginData.password}
                onChange={handleLoginChange}
                variant="outlined"
                error={!!validationErrors.password}
                helperText={validationErrors.password}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, mb: 2, py: 1.5 }}
                disabled={isLoading}
                size="large"
              >
                {isLoading ? 'Signing In...' : 'SIGN IN'}
              </Button>
              
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => navigate('/forgot-password')}
                    sx={{ textDecoration: 'none', mr: 1 }}
                  >
                    Forget Password ?
                  </Link>
                  | {' '}
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => navigate('/signup')}
                    sx={{ textDecoration: 'none' }}
                  >
                    Sign Up
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default Login