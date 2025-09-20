import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  Tab,
  Tabs,
  IconButton,
  InputAdornment,
} from '@mui/material'
import { Visibility, VisibilityOff, Factory, AccountCircle } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

function Login() {
  const { login, register, isLoading } = useAuth()
  const [tabValue, setTabValue] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  })
  
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Operator'
  })

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
    setError('')
    setSuccess('')
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    const result = await login(loginData)
    if (!result.success) {
      setError(result.error)
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    const { confirmPassword, ...userData } = registerData
    const result = await register(userData)
    
    if (result.success) {
      setSuccess('Registration successful! Please login to continue.')
      setTabValue(0)
      setRegisterData({
        email: '',
        password: '',
        confirmPassword: '',
        role: 'Operator'
      })
    } else {
      setError(result.error)
    }
  }

  const handleLoginChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    })
  }

  const handleRegisterChange = (e) => {
    setRegisterData({
      ...registerData,
      [e.target.name]: e.target.value
    })
  }

  const handleDemoLogin = () => {
    setLoginData({
      email: 'admin@example.com',
      password: 'admin123'
    })
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
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              From Order to Output - All in One Flow
            </Typography>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="auth tabs"
              centered
              variant="fullWidth"
            >
              <Tab label="Sign In" icon={<AccountCircle />} iconPosition="start" />
              <Tab label="Register" icon={<AccountCircle />} iconPosition="start" />
            </Tabs>
          </Box>

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ m: 2 }}>
              {success}
            </Alert>
          )}

          {/* Login Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box component="form" onSubmit={handleLoginSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={loginData.email}
                onChange={handleLoginChange}
                variant="outlined"
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
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={isLoading}
                size="large"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                onClick={handleDemoLogin}
                sx={{ mb: 2 }}
              >
                Use Demo Account
              </Button>
            </Box>
            
            <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Demo Accounts:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Admin: admin@example.com / admin123
              </Typography>
              <Typography variant="body2">
                • Operator: operator@example.com / operator123
              </Typography>
            </Paper>
          </TabPanel>

          {/* Register Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box component="form" onSubmit={handleRegisterSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="register-email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={registerData.email}
                onChange={handleRegisterChange}
                variant="outlined"
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="register-password"
                value={registerData.password}
                onChange={handleRegisterChange}
                variant="outlined"
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
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                id="confirm-password"
                value={registerData.confirmPassword}
                onChange={handleRegisterChange}
                variant="outlined"
              />
              <TextField
                margin="normal"
                required
                fullWidth
                select
                name="role"
                label="Role"
                value={registerData.role}
                onChange={handleRegisterChange}
                variant="outlined"
                SelectProps={{
                  native: true,
                }}
              >
                <option value="Operator">Operator</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </TextField>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={isLoading}
                size="large"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </Box>
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  )
}

export default Login