import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  ButtonGroup,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip,
  Alert,
  alpha,
  useTheme,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  Factory,
  Assignment,
  Inventory,
  Warning,
  CheckCircle,
  Schedule,
  Cancel,
  Refresh,
  Add,
} from '@mui/icons-material'
import { manufacturingOrdersAPI, dashboardAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'

const statusColors = {
  'Planned': 'info',
  'In Progress': 'warning', 
  'Done': 'success',
  'Canceled': 'error',
}

const statusIcons = {
  'Planned': <Schedule />,
  'In Progress': <Factory />,
  'Done': <CheckCircle />,
  'Canceled': <Cancel />,
}

function Dashboard() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [summary, setSummary] = useState({})
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const [summaryRes, ordersRes] = await Promise.all([
        dashboardAPI.getSummary(),
        manufacturingOrdersAPI.getAll()
      ])
      setSummary(summaryRes.data)
      setOrders(ordersRes.data)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filterByStatus = async (status) => {
    const newStatus = status === selectedStatus ? null : status
    setSelectedStatus(newStatus)
    try {
      const response = await manufacturingOrdersAPI.getAll(newStatus)
      setOrders(response.data)
    } catch (error) {
      console.error('Error filtering orders:', error)
      setError('Failed to filter orders.')
    }
  }

  const getKPICards = () => {
    const totalOrders = Object.values(summary).reduce((sum, count) => sum + (count || 0), 0)
    const completedOrders = summary['Done'] || 0
    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0
    const lowStockComponents = summary['low_stock_components'] || 0

    return [
      {
        title: 'Total Orders',
        value: totalOrders,
        icon: <Factory />,
        color: 'primary',
        trend: '+12%',
        isUp: true
      },
      {
        title: 'Completion Rate',
        value: `${completionRate}%`,
        icon: <TrendingUp />,
        color: 'success',
        trend: '+5%',
        isUp: true
      },
      {
        title: 'Components',
        value: summary['total_components'] || 0,
        icon: <Inventory />,
        color: 'info',
        trend: 'Stable',
        isUp: null
      },
      {
        title: 'Low Stock Alert',
        value: lowStockComponents,
        icon: <Warning />,
        color: lowStockComponents > 0 ? 'error' : 'success',
        trend: lowStockComponents > 0 ? 'Action needed' : 'All good',
        isUp: lowStockComponents > 0 ? false : null
      }
    ]
  }

  const getOrderProgress = (order) => {
    if (!order.progress) return 0
    return order.progress
  }

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'error'
      case 'high': return 'warning'
      case 'medium': return 'info'
      case 'low': return 'success'
      default: return 'default'
    }
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Manufacturing Dashboard</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Manufacturing Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Welcome back! Here's what's happening with your manufacturing orders.
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={loadData} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/manufacturing-orders/new')}
            sx={{ borderRadius: 2 }}
          >
            New Order
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {getKPICards().map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                background: `linear-gradient(135deg, ${alpha(theme.palette[kpi.color].main, 0.1)} 0%, ${alpha(theme.palette[kpi.color].main, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette[kpi.color].main, 0.2)}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[8]
                }
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                      {kpi.title}
                    </Typography>
                    <Typography variant="h3" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
                      {kpi.value}
                    </Typography>
                    <Box display="flex" alignItems="center">
                      {kpi.isUp !== null && (
                        kpi.isUp ? <TrendingUp color="success" sx={{ mr: 0.5, fontSize: 16 }} /> :
                        <TrendingDown color="error" sx={{ mr: 0.5, fontSize: 16 }} />
                      )}
                      <Typography 
                        variant="caption" 
                        color={kpi.isUp === true ? 'success.main' : kpi.isUp === false ? 'error.main' : 'text.secondary'}
                        sx={{ fontWeight: 500 }}
                      >
                        {kpi.trend}
                      </Typography>
                    </Box>
                  </Box>
                  <Avatar 
                    sx={{ 
                      bgcolor: `${kpi.color}.main`,
                      width: 48,
                      height: 48
                    }}
                  >
                    {kpi.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Order Status Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Manufacturing Orders Overview
              </Typography>
              
              {/* Filter Buttons */}
              <Box sx={{ mb: 3 }}>
                <ButtonGroup variant="outlined" size="small">
                  <Button
                    variant={selectedStatus === null ? 'contained' : 'outlined'}
                    onClick={() => filterByStatus(null)}
                  >
                    All ({Object.values(summary).reduce((sum, count) => sum + (count || 0), 0) - (summary['total_components'] || 0) - (summary['total_boms'] || 0) - (summary['low_stock_components'] || 0)})
                  </Button>
                  {Object.keys(statusColors).map((status) => (
                    <Button
                      key={status}
                      variant={selectedStatus === status ? 'contained' : 'outlined'}
                      onClick={() => filterByStatus(status)}
                      startIcon={statusIcons[status]}
                      color={statusColors[status]}
                    >
                      {status} ({summary[status] || 0})
                    </Button>
                  ))}
                </ButtonGroup>
              </Box>

              {/* Orders Table */}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Quantity</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Progress</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Deadline</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.length > 0 ? orders.map((order) => (
                      <TableRow 
                        key={order.id}
                        hover
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { 
                            backgroundColor: alpha(theme.palette.primary.main, 0.04) 
                          }
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {order.id}
                          </Typography>
                        </TableCell>
                        <TableCell>{order.product_name}</TableCell>
                        <TableCell>
                          <Chip label={order.quantity} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={order.status}
                            color={statusColors[order.status]}
                            size="small"
                            icon={statusIcons[order.status]}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={getOrderProgress(order)}
                              sx={{ width: 60, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption">
                              {Math.round(getOrderProgress(order))}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={order.priority || 'Medium'}
                            color={getPriorityColor(order.priority)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(order.deadline).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary" sx={{ py: 2 }}>
                            No manufacturing orders found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Quick Actions
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => navigate('/manufacturing-orders/new')}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Create Manufacturing Order
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Assignment />}
                  onClick={() => navigate('/bills-of-materials')}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Manage BOMs
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Inventory />}
                  onClick={() => navigate('/stock-ledger')}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Check Stock Levels
                </Button>
              </Box>

              {summary['low_stock_components'] > 0 && (
                <Alert severity="warning" sx={{ mt: 3 }}>
                  <Typography variant="body2">
                    {summary['low_stock_components']} components are running low on stock!
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard