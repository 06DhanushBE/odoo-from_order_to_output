import React, { useState } from 'react'
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
import { useNavigate } from 'react-router-dom'

function SignUp() {
  const { register, isLoading } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  
  const [signupData, setSignupData] = useState({
    loginId: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const validateForm = () => {
    const errors = {}
    
    // Login ID validation
    if (!signupData.loginId.trim()) {
      errors.loginId = 'Login ID is required'
    } else if (signupData.loginId.length < 6 || signupData.loginId.length > 12) {
      errors.loginId = 'Login ID should be unique and must be in between 6-12 characters'
    }
    
    // Email validation
    if (!signupData.email.trim()) {
      errors.email = 'Email ID is required'
    } else if (!/\S+@\S+\.\S+/.test(signupData.email)) {
      errors.email = 'Email ID should not be duplicate in database'
    }
    
    // Password validation
    if (!signupData.password) {
      errors.password = 'Password is required'
    } else if (signupData.password.length < 6) {
      errors.password = 'Password should have lower case, an upper case and a special character and length should be more then 6 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/.test(signupData.password)) {
      errors.password = 'Password should have lower case, an upper case and a special character and length should be more then 6 characters'
    }
    
    // Confirm password validation
    if (!signupData.confirmPassword) {
      errors.confirmPassword = 'Re-Enter Password is required'
    } else if (signupData.password !== signupData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSignUpSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!validateForm()) {
      return
    }
    
    // Use email as the identifier for backend
    const userData = {
      email: signupData.email,
      password: signupData.password,
      role: 'Operator'
    }
    
    const result = await register(userData)
    if (result.success) {
      setSuccess('Registration successful! Please login to continue.')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } else {
      setError(result.error)
    }
  }

  const handleSignUpChange = (e) => {
    const { name, value } = e.target
    setSignupData({
      ...signupData,
      [name]: value
    })
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: ''
      })
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
              App Logo
            </Typography>
          </Box>

          {/* Sign Up Form */}
          <Box sx={{ p: 4 }}>
            {/* Alerts */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <Typography variant="h5" component="h2" sx={{ mb: 3, textAlign: 'center' }}>
              Sign Up Page
            </Typography>

            <Box component="form" onSubmit={handleSignUpSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="loginId"
                label="Enter Login Id"
                name="loginId"
                autoComplete="username"
                autoFocus
                value={signupData.loginId}
                onChange={handleSignUpChange}
                variant="outlined"
                error={!!validationErrors.loginId}
                helperText={validationErrors.loginId}
                sx={{ mb: 2 }}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Enter Email Id"
                name="email"
                type="email"
                autoComplete="email"
                value={signupData.email}
                onChange={handleSignUpChange}
                variant="outlined"
                error={!!validationErrors.email}
                helperText={validationErrors.email}
                sx={{ mb: 2 }}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Enter Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="new-password"
                value={signupData.password}
                onChange={handleSignUpChange}
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
                sx={{ mb: 2 }}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Re-Enter Password"
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                autoComplete="new-password"
                value={signupData.confirmPassword}
                onChange={handleSignUpChange}
                variant="outlined"
                error={!!validationErrors.confirmPassword}
                helperText={validationErrors.confirmPassword}
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
                {isLoading ? 'Creating Account...' : 'SIGN UP'}
              </Button>
              
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => navigate('/login')}
                    sx={{ textDecoration: 'none' }}
                  >
                    Login here
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

export default SignUp