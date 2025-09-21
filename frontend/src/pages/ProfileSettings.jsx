import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  Paper,
  Chip,
} from '@mui/material'
import {
  Save as SaveIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  CameraAlt as CameraIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Assessment as ReportsIcon,
  SmartToy as AIIcon,
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import ProfileReports from '../components/ProfileReports'
import AIReportChat from '../components/AIReportChat'

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
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

function ProfileSettings() {
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tabValue, setTabValue] = useState(0)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  
  // Profile form state
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    role: '',
    avatar: null
  })
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  
  // Settings state
  const [settings, setSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    order_updates: true,
    system_alerts: true,
    theme: 'light'
  })

  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
        role: user.role || '',
        avatar: user.avatar || null
      })
    }
  }, [user])

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
    setError('')
    setSuccess('')
  }

  const handleProfileChange = (field) => (event) => {
    setProfile(prev => ({
      ...prev,
      [field]: event.target.value
    }))
  }

  const handlePasswordChange = (field) => (event) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: event.target.value
    }))
  }

  const handleSettingsChange = (field) => (event) => {
    setSettings(prev => ({
      ...prev,
      [field]: event.target.checked !== undefined ? event.target.checked : event.target.value
    }))
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfile(prev => ({
          ...prev,
          avatar: reader.result
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await api.put('/profile', profile)
      updateUser(response.data)
      setSuccess('Profile updated successfully!')
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Profile update error:', error)
      setError(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New passwords do not match')
      return
    }
    
    if (passwordForm.new_password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      await api.put('/profile', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      })
      setSuccess('Password changed successfully!')
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
      setShowPasswordDialog(false)
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Password change error:', error)
      setError(error.response?.data?.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Profile Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<PersonIcon />} label="Profile" />
          <Tab icon={<SecurityIcon />} label="Security" />
          <Tab icon={<NotificationsIcon />} label="Notifications" />
          <Tab icon={<ReportsIcon />} label="Reports" />
          <Tab icon={<AIIcon />} label="AI Reports" />
        </Tabs>

        {/* Profile Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Avatar Section */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                    <Avatar
                      src={profile.avatar}
                      sx={{ 
                        width: 120, 
                        height: 120, 
                        mx: 'auto',
                        fontSize: '3rem'
                      }}
                    >
                      {profile.first_name?.charAt(0)?.toUpperCase() || 
                       profile.email?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="avatar-upload"
                      type="file"
                      onChange={handleAvatarChange}
                    />
                    <label htmlFor="avatar-upload">
                      <IconButton
                        component="span"
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          backgroundColor: 'primary.main',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'primary.dark',
                          },
                        }}
                      >
                        <CameraIcon />
                      </IconButton>
                    </label>
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {profile.first_name} {profile.last_name}
                  </Typography>
                  <Chip 
                    label={profile.role || 'User'} 
                    color="primary" 
                    size="small" 
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {profile.department}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Profile Form */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EditIcon color="primary" />
                    Personal Information
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <form onSubmit={handleProfileSubmit}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="First Name"
                          value={profile.first_name}
                          onChange={handleProfileChange('first_name')}
                          InputProps={{
                            startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} />
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Last Name"
                          value={profile.last_name}
                          onChange={handleProfileChange('last_name')}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Email"
                          type="email"
                          value={profile.email}
                          onChange={handleProfileChange('email')}
                          InputProps={{
                            startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
                          }}
                          disabled
                          helperText="Email cannot be changed"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Phone"
                          value={profile.phone}
                          onChange={handleProfileChange('phone')}
                          InputProps={{
                            startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} />
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Department</InputLabel>
                          <Select
                            value={profile.department}
                            onChange={handleProfileChange('department')}
                            startAdornment={<BusinessIcon color="action" sx={{ mr: 1 }} />}
                          >
                            <MenuItem value="Production">Production</MenuItem>
                            <MenuItem value="Quality Control">Quality Control</MenuItem>
                            <MenuItem value="Management">Management</MenuItem>
                            <MenuItem value="Logistics">Logistics</MenuItem>
                            <MenuItem value="Engineering">Engineering</MenuItem>
                            <MenuItem value="Maintenance">Maintenance</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Role"
                          value={profile.role}
                          InputProps={{
                            startAdornment: <BadgeIcon color="action" sx={{ mr: 1 }} />
                          }}
                          disabled
                          helperText="Role is managed by administrators"
                        />
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                        disabled={loading}
                        size="large"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </Box>
                  </form>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LockIcon color="primary" />
                    Password & Security
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <LockIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Change Password"
                        secondary="Update your account password"
                      />
                      <Button
                        variant="outlined"
                        onClick={() => setShowPasswordDialog(true)}
                        startIcon={<EditIcon />}
                      >
                        Change
                      </Button>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotificationsIcon color="primary" />
                    Notification Preferences
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Email Notifications"
                        secondary="Receive notifications via email"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.email_notifications}
                            onChange={handleSettingsChange('email_notifications')}
                          />
                        }
                        label=""
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Order Updates"
                        secondary="Get notified about manufacturing order changes"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.order_updates}
                            onChange={handleSettingsChange('order_updates')}
                          />
                        }
                        label=""
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="System Alerts"
                        secondary="Receive system maintenance and update notifications"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.system_alerts}
                            onChange={handleSettingsChange('system_alerts')}
                          />
                        }
                        label=""
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Reports Tab */}
        <TabPanel value={tabValue} index={3}>
          <ProfileReports />
        </TabPanel>

        {/* AI Reports Tab */}
        <TabPanel value={tabValue} index={4}>
          <AIReportChat />
        </TabPanel>
      </Paper>

      {/* Password Change Dialog */}
      <Dialog 
        open={showPasswordDialog} 
        onClose={() => setShowPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <form onSubmit={handlePasswordSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              label="Current Password"
              type={showPasswords.current ? 'text' : 'password'}
              value={passwordForm.current_password}
              onChange={handlePasswordChange('current_password')}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => togglePasswordVisibility('current')}>
                    {showPasswords.current ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                )
              }}
              required
            />
            <TextField
              fullWidth
              label="New Password"
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordForm.new_password}
              onChange={handlePasswordChange('new_password')}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => togglePasswordVisibility('new')}>
                    {showPasswords.new ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                )
              }}
              helperText="Must be at least 6 characters long"
              required
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordForm.confirm_password}
              onChange={handlePasswordChange('confirm_password')}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => togglePasswordVisibility('confirm')}>
                    {showPasswords.confirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                )
              }}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}

export default ProfileSettings