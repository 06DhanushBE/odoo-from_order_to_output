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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material'
import {
  PlayArrow,
  Pause,
  Stop,
  CheckCircle,
  Schedule,
  Assignment,
  Person,
  Timer,
  Edit,
  Refresh,
} from '@mui/icons-material'
import { manufacturingOrdersAPI, workOrdersAPI } from '../services/api'

const workOrderStatuses = {
  'Pending': { color: 'info', icon: <Schedule /> },
  'Started': { color: 'warning', icon: <PlayArrow /> },
  'Paused': { color: 'secondary', icon: <Pause /> },
  'Completed': { color: 'success', icon: <CheckCircle /> },
}

function WorkOrders() {
  const theme = useTheme()
  const [workOrders, setWorkOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState('')
  const [manufacturingOrders, setManufacturingOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editDialog, setEditDialog] = useState({ open: false, workOrder: null })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Get manufacturing orders
      const ordersRes = await manufacturingOrdersAPI.getAll()
      setManufacturingOrders(ordersRes.data)
      
      // Get work orders for first manufacturing order if available
      if (ordersRes.data.length > 0) {
        const firstOrder = ordersRes.data[0]
        setSelectedOrder(firstOrder.id)
        setWorkOrders(firstOrder.work_orders || [])
      }
    } catch (error) {
      console.error('Error loading work orders:', error)
      setError('Failed to load work orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOrderChange = (orderId) => {
    setSelectedOrder(orderId)
    const order = manufacturingOrders.find(o => o.id === orderId)
    setWorkOrders(order?.work_orders || [])
  }

  const handleStatusUpdate = async (workOrderId, newStatus) => {
    try {
      setError('')
      
      // Call API to update work order status using axios-based API
      const response = await workOrdersAPI.update(workOrderId, { status: newStatus })
      const result = response.data
      
      // Update local work order state
      setWorkOrders(prev => 
        prev.map(wo => 
          wo.id === workOrderId 
            ? { ...wo, status: newStatus, ...result } 
            : wo
        )
      )
      
      // Show cascade information if available
      if (result.status_cascade || result.manufacturing_order_updated) {
        // Refresh manufacturing orders to show updated status
        const ordersRes = await manufacturingOrdersAPI.getAll()
        setManufacturingOrders(ordersRes.data)
      }
      
    } catch (error) {
      setError(`Failed to update work order status: ${error.response?.data?.message || error.message}`)
    }
  }

  const handleCompleteWorkOrder = async (workOrderId, notes = '') => {
    try {
      setError('')
      
      // Call API to complete work order using axios-based API
      const response = await workOrdersAPI.complete(workOrderId, { 
        notes: notes,
        quality_check: true 
      })
      const result = response.data
      
      // Update local work order state
      setWorkOrders(prev => 
        prev.map(wo => 
          wo.id === workOrderId 
            ? { ...wo, ...result } 
            : wo
        )
      )
      
      // Show cascade information if manufacturing order was completed
      if (result.manufacturing_order_updated) {
        // Refresh manufacturing orders to show updated status
        const ordersRes = await manufacturingOrdersAPI.getAll()
        setManufacturingOrders(ordersRes.data)
      }
      
    } catch (error) {
      setError(`Failed to complete work order: ${error.response?.data?.message || error.message}`)
    }
  }

  const handleEditWorkOrder = (workOrder) => {
    setEditDialog({ open: true, workOrder: { ...workOrder } })
  }

  const handleSaveWorkOrder = () => {
    // In a real implementation, save the work order via API
    setEditDialog({ open: false, workOrder: null })
  }

  const getStatusActions = (workOrder) => {
    const status = workOrder.status
    const actions = []

    switch (status) {
      case 'Pending':
        actions.push(
          <Tooltip key="start" title="Start Work Order">
            <IconButton 
              color="success" 
              onClick={() => handleStatusUpdate(workOrder.id, 'Started')}
              size="small"
            >
              <PlayArrow />
            </IconButton>
          </Tooltip>
        )
        break
      case 'Started':
        actions.push(
          <Tooltip key="pause" title="Pause Work Order">
            <IconButton 
              color="warning" 
              onClick={() => handleStatusUpdate(workOrder.id, 'Paused')}
              size="small"
            >
              <Pause />
            </IconButton>
          </Tooltip>,
          <Tooltip key="complete" title="Complete Work Order">
            <IconButton 
              color="success" 
              onClick={() => handleCompleteWorkOrder(workOrder.id, `Completed at ${new Date().toLocaleString()}`)}
              size="small"
            >
              <CheckCircle />
            </IconButton>
          </Tooltip>
        )
        break
      case 'Paused':
        actions.push(
          <Tooltip key="resume" title="Resume Work Order">
            <IconButton 
              color="success" 
              onClick={() => handleStatusUpdate(workOrder.id, 'Started')}
              size="small"
            >
              <PlayArrow />
            </IconButton>
          </Tooltip>,
          <Tooltip key="complete" title="Complete Work Order">
            <IconButton 
              color="success" 
              onClick={() => handleCompleteWorkOrder(workOrder.id, `Completed at ${new Date().toLocaleString()}`)}
              size="small"
            >
              <CheckCircle />
            </IconButton>
          </Tooltip>
        )
        break
      default:
        break
    }

    return actions
  }

  const getProgressPercentage = (workOrders) => {
    if (!workOrders.length) return 0
    const completed = workOrders.filter(wo => wo.status === 'Completed').length
    return Math.round((completed / workOrders.length) * 100)
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Work Orders</Typography>
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
            Work Orders Management
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Track and manage work order operations for manufacturing
          </Typography>
        </Box>
        <Tooltip title="Refresh Data">
          <IconButton onClick={loadData} color="primary">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Manufacturing Order Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Select Manufacturing Order
          </Typography>
          <FormControl fullWidth sx={{ maxWidth: 400 }}>
            <InputLabel>Manufacturing Order</InputLabel>
            <Select
              value={selectedOrder}
              onChange={(e) => handleOrderChange(e.target.value)}
              label="Manufacturing Order"
            >
              {manufacturingOrders.map((order) => (
                <MenuItem key={order.id} value={order.id}>
                  {order.id} - {order.product_name} (Qty: {order.quantity})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {selectedOrder && (
        <Grid container spacing={3}>
          {/* Work Orders Overview */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Work Orders for {selectedOrder}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2" color="text.secondary">
                      Progress: {getProgressPercentage(workOrders)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={getProgressPercentage(workOrders)}
                      sx={{ width: 100, height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Sequence</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Operation</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Assigned To</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {workOrders.length > 0 ? workOrders.map((workOrder, index) => (
                        <TableRow 
                          key={workOrder.id}
                          hover
                          sx={{
                            backgroundColor: workOrder.status === 'Started' 
                              ? alpha(theme.palette.warning.main, 0.05) 
                              : 'inherit'
                          }}
                        >
                          <TableCell>
                            <Chip 
                              label={`#${workOrder.sequence || index + 1}`} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {workOrder.name}
                              </Typography>
                              {workOrder.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {workOrder.description}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Timer fontSize="small" color="action" />
                              <Typography variant="body2">
                                {workOrder.duration_minutes}m
                              </Typography>
                              {workOrder.actual_duration_minutes && (
                                <Typography variant="caption" color="text.secondary">
                                  (Actual: {workOrder.actual_duration_minutes}m)
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Person fontSize="small" color="action" />
                              <Typography variant="body2">
                                {workOrder.assigned_to || 'Unassigned'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={workOrder.status}
                              color={workOrderStatuses[workOrder.status]?.color || 'default'}
                              size="small"
                              icon={workOrderStatuses[workOrder.status]?.icon}
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              {getStatusActions(workOrder)}
                              <Tooltip title="Edit Work Order">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleEditWorkOrder(workOrder)}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography color="text.secondary" sx={{ py: 2 }}>
                              No work orders found for this manufacturing order
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

          {/* Work Order Statistics */}
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Work Order Statistics
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Object.entries(workOrderStatuses).map(([status, config]) => {
                    const count = workOrders.filter(wo => wo.status === status).length
                    return (
                      <Box 
                        key={status} 
                        display="flex" 
                        justifyContent="space-between" 
                        alignItems="center"
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          backgroundColor: alpha(theme.palette[config.color].main, 0.05),
                          border: `1px solid ${alpha(theme.palette[config.color].main, 0.2)}`
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          {config.icon}
                          <Typography variant="body2">{status}</Typography>
                        </Box>
                        <Chip 
                          label={count} 
                          size="small" 
                          color={config.color}
                        />
                      </Box>
                    )
                  })}
                </Box>

                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total estimated duration:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {workOrders.reduce((sum, wo) => sum + (wo.duration_minutes || 0), 0)} minutes
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Quick Actions
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<PlayArrow />}
                    fullWidth
                    disabled={!workOrders.some(wo => wo.status === 'Pending')}
                    onClick={() => {
                      const pendingOrder = workOrders.find(wo => wo.status === 'Pending')
                      if (pendingOrder) handleStatusUpdate(pendingOrder.id, 'Started')
                    }}
                  >
                    Start Next Operation
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Assignment />}
                    fullWidth
                  >
                    View Order Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Edit Work Order Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, workOrder: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Work Order</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Operation Name"
              value={editDialog.workOrder?.name || ''}
              onChange={(e) => setEditDialog(prev => ({
                ...prev,
                workOrder: { ...prev.workOrder, name: e.target.value }
              }))}
              fullWidth
            />
            <TextField
              label="Description"
              value={editDialog.workOrder?.description || ''}
              onChange={(e) => setEditDialog(prev => ({
                ...prev,
                workOrder: { ...prev.workOrder, description: e.target.value }
              }))}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Duration (minutes)"
              type="number"
              value={editDialog.workOrder?.duration_minutes || ''}
              onChange={(e) => setEditDialog(prev => ({
                ...prev,
                workOrder: { ...prev.workOrder, duration_minutes: parseInt(e.target.value) }
              }))}
              fullWidth
            />
            <TextField
              label="Assigned To"
              value={editDialog.workOrder?.assigned_to || ''}
              onChange={(e) => setEditDialog(prev => ({
                ...prev,
                workOrder: { ...prev.workOrder, assigned_to: e.target.value }
              }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, workOrder: null })}>
            Cancel
          </Button>
          <Button onClick={handleSaveWorkOrder} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default WorkOrders