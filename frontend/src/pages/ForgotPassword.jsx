import React, { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Link,
} from '@mui/material'
import { Factory, ArrowBack } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

const steps = ['Enter Email', 'Verify OTP', 'Reset Password']

function ForgotPassword() {
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  const [devOtp, setDevOtp] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.forgotPassword({ email: formData.email })
      const data = response.data
      
      setSuccess('OTP has been sent to your email address')
      
      // For development: if OTP is provided in response, show it
      if (data.dev_otp) {
        setDevOtp(data.dev_otp)
        setSuccess(`${data.dev_message} OTP: ${data.dev_otp}`)
      }
      
      setActiveStep(1)
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleOTPSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await authAPI.verifyOTP({ 
        email: formData.email, 
        otp: formData.otp 
      })
      setSuccess('OTP verified successfully')
      setActiveStep(2)
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.newPassword.length < 6) {
      setError('Password should be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      await authAPI.resetPassword({
        email: formData.email,
        otp: formData.otp,
        new_password: formData.newPassword
      })
      setSuccess('Password reset successfully! You can now login with your new password.')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box component="form" onSubmit={handleEmailSubmit}>
            <Typography variant="h6" sx={{ mb: 3, textAlign: 'center' }}>
              Enter your email address
            </Typography>
            <TextField
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              variant="outlined"
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              size="large"
              sx={{ py: 1.5 }}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
          </Box>
        )

      case 1:
        return (
          <Box component="form" onSubmit={handleOTPSubmit}>
            <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
              Enter OTP
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
              We've sent a 6-digit OTP to {formData.email}
            </Typography>
            
            {/* Show development OTP if available */}
            {devOtp && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Development Mode:</strong> Your OTP is: <strong>{devOtp}</strong>
                </Typography>
              </Alert>
            )}
            
            <TextField
              required
              fullWidth
              id="otp"
              label="Enter OTP"
              name="otp"
              value={formData.otp}
              onChange={handleChange}
              variant="outlined"
              inputProps={{ 
                maxLength: 6,
                pattern: '[0-9]{6}',
                style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }
              }}
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              size="large"
              sx={{ py: 1.5 }}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => setActiveStep(0)}
              sx={{ mt: 2 }}
            >
              Change Email Address
            </Button>
          </Box>
        )

      case 2:
        return (
          <Box component="form" onSubmit={handlePasswordReset}>
            <Typography variant="h6" sx={{ mb: 3, textAlign: 'center' }}>
              Set New Password
            </Typography>
            <TextField
              required
              fullWidth
              name="newPassword"
              label="New Password"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <TextField
              required
              fullWidth
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              variant="outlined"
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              size="large"
              sx={{ py: 1.5 }}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </Box>
        )

      default:
        return null
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
              Forgot Password
            </Typography>
          </Box>

          {/* Content */}
          <Box sx={{ p: 4 }}>
            {/* Back to Login Button */}
            <Box sx={{ mb: 3 }}>
              <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate('/login')}
                variant="text"
                color="primary"
              >
                Back to Login
              </Button>
            </Box>

            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

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

            {/* Step Content */}
            {renderStepContent()}
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default ForgotPassword