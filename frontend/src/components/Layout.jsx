import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  Avatar,
  Divider,
  Chip,
  useTheme,
  alpha,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Inventory as InventoryIcon,
  Add as AddIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Work as WorkIcon,
  Factory as FactoryIcon,
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'

const drawerWidth = 280

const menuItems = [
  { 
    text: 'Dashboard', 
    icon: <DashboardIcon />, 
    path: '/dashboard',
    description: 'Overview & KPIs'
  },
  { 
    text: 'Manufacturing Orders', 
    icon: <FactoryIcon />, 
    path: '/manufacturing-orders',
    description: 'Track production orders'
  },
  { 
    text: 'Work Orders', 
    icon: <WorkIcon />, 
    path: '/work-orders',
    description: 'Manage work tasks'
  },
  { 
    text: 'Bills of Materials', 
    icon: <AssignmentIcon />, 
    path: '/bills-of-materials',
    description: 'Product recipes'
  },
  { 
    text: 'Stock Ledger', 
    icon: <InventoryIcon />, 
    path: '/stock-ledger',
    description: 'Inventory tracking'
  },
  { 
    text: 'New Order', 
    icon: <AddIcon />, 
    path: '/manufacturing-orders/new',
    description: 'Create new order'
  },
]

function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const [anchorEl, setAnchorEl] = useState(null)

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    logout()
    handleProfileMenuClose()
    navigate('/login', { replace: true })
  }

  const handleMenuNavigation = (path) => {
    navigate(path)
  }

  // Check if current path matches menu item path
  const isPathActive = (menuPath) => {
    if (menuPath === '/dashboard' && location.pathname === '/dashboard') return true
    if (menuPath !== '/dashboard' && location.pathname.startsWith(menuPath)) return true
    return false
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* Header */}
      <AppBar
        position="fixed"
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.12)',
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
          <FactoryIcon sx={{ mr: 2, fontSize: 28 }} />
          <Typography variant="h5" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Manufacturing System
          </Typography>
          
          <Typography variant="body2" sx={{ mr: 2, color: 'rgba(255,255,255,0.8)' }}>
            Welcome, {user?.email?.split('@')[0]}
          </Typography>
          
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="profile-menu"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
            sx={{
              '&:hover': {
                backgroundColor: alpha('#fff', 0.1),
              }
            }}
          >
            <Avatar 
              sx={{ 
                width: 36, 
                height: 36, 
                bgcolor: 'secondary.main',
                border: '2px solid rgba(255,255,255,0.3)'
              }}
            >
              {user?.email?.charAt(0)?.toUpperCase()}
            </Avatar>
          </IconButton>
          
          <Menu
            id="profile-menu"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            PaperProps={{
              elevation: 3,
              sx: {
                mt: 1,
                borderRadius: 2,
                minWidth: 200,
              }
            }}
          >
            <MenuItem disabled sx={{ opacity: 1 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {user?.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Manufacturing System User
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/profile'); }}>
              <SettingsIcon sx={{ mr: 1 }} />
              Profile Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)',
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <Typography 
            variant="overline" 
            sx={{ 
              px: 3, 
              pb: 1, 
              fontWeight: 700,
              fontSize: '0.75rem',
              color: 'text.secondary',
              letterSpacing: 1
            }}
          >
            Master Menu
          </Typography>
          <List sx={{ px: 1 }}>
            {menuItems.map((item) => {
              const isSelected = isPathActive(item.path)
              return (
                <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleMenuNavigation(item.path)}
                    sx={{
                      borderRadius: 2,
                      mx: 1,
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.12),
                        },
                      },
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      }
                    }}
                  >
                    <ListItemIcon 
                      sx={{ 
                        color: isSelected ? 'primary.main' : 'text.secondary',
                        minWidth: 40
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: isSelected ? 600 : 500,
                            color: isSelected ? 'primary.main' : 'text.primary'
                          }}
                        >
                          {item.text}
                        </Typography>
                      }
                      secondary={
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary',
                            fontSize: '0.7rem'
                          }}
                        >
                          {item.description}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3,
          backgroundColor: 'background.default',
          minHeight: '100vh'
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  )
}

export default Layout