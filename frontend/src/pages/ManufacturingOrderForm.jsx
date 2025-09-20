import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  TablePagination,
  Fab,
  InputAdornment,
  Collapse,
  Stack,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  Check as CompleteIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import { manufacturingOrdersAPI, bomsAPI } from '../services/api'

function ManufacturingOrders() {
  const [orders, setOrders] = useState([])
  const [boms, setBoms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Pagination
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    product_name: '',
    quantity: '',
    bom_id: '',
    deadline: ''
  })

  useEffect(() => {
    loadOrders()
    loadBoms()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await manufacturingOrdersAPI.getAll()
      setOrders(response.data || [])
    } catch (error) {
      setError('Failed to load manufacturing orders')
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBoms = async () => {
    try {
      const response = await bomsAPI.getAll()
      setBoms(response.data || [])
    } catch (error) {
      console.error('Error loading BOMs:', error)
    }
  }

  const handleCreateOrder = async () => {
    try {
      setLoading(true)
      const deadline = new Date(formData.deadline).toISOString()
      
      await manufacturingOrdersAPI.create({
        ...formData,
        quantity: parseInt(formData.quantity),
        bom_id: parseInt(formData.bom_id),
        deadline
      })
      
      setSuccess('Manufacturing Order created successfully!')
      setCreateDialogOpen(false)
      resetForm()
      loadOrders()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create manufacturing order')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateOrder = async () => {
    try {
      setLoading(true)
      const deadline = new Date(formData.deadline).toISOString()
      
      await manufacturingOrdersAPI.update(selectedOrder.id, {
        ...formData,
        quantity: parseInt(formData.quantity),
        bom_id: parseInt(formData.bom_id),
        deadline
      })
      
      setSuccess('Manufacturing Order updated successfully!')
      setEditDialogOpen(false)
      resetForm()
      loadOrders()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update manufacturing order')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this manufacturing order?')) {
      try {
        await manufacturingOrdersAPI.delete(orderId)
        setSuccess('Manufacturing Order deleted successfully!')
        loadOrders()
      } catch (err) {
        setError('Failed to delete manufacturing order')
      }
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await manufacturingOrdersAPI.update(orderId, { status: newStatus })
      setSuccess(`Order status updated to ${newStatus}`)
      loadOrders()
    } catch (err) {
      setError('Failed to update order status')
    }
  }

  const resetForm = () => {
    setFormData({
      product_name: '',
      quantity: '',
      bom_id: '',
      deadline: ''
    })
    setSelectedOrder(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setCreateDialogOpen(true)
  }

  const openEditDialog = (order) => {
    setSelectedOrder(order)
    setFormData({
      product_name: order.product_name,
      quantity: order.quantity.toString(),
      bom_id: order.bom_id.toString(),
      deadline: new Date(order.deadline).toISOString().slice(0, 16)
    })
    setEditDialogOpen(true)
  }

  const openViewDialog = (order) => {
    setSelectedOrder(order)
    setViewDialogOpen(true)
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'default'
      case 'confirmed': return 'info'
      case 'in_progress': return 'warning'
      case 'completed': return 'success'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return <StartIcon />
      case 'in_progress': return <PauseIcon />
      case 'completed': return <CompleteIcon />
      default: return null
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id?.toString().includes(searchTerm)
    const matchesStatus = !statusFilter || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const paginatedOrders = filteredOrders.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Manufacturing Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
          sx={{
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1976D2 30%, #0288D1 90%)',
            }
          }}
        >
          Create Order
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <TextField
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1 }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              endIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
          </Box>
          
          <Collapse in={showFilters}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="confirmed">Confirmed</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Quantity</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Deadline</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">Loading...</TableCell>
                </TableRow>
              ) : paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No manufacturing orders found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>MO-{order.id?.toString().padStart(4, '0')}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{order.product_name}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      <Chip
                        label={order.status || 'Draft'}
                        color={getStatusColor(order.status)}
                        size="small"
                        icon={getStatusIcon(order.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {order.deadline ? new Date(order.deadline).toLocaleDateString() : 'Not set'}
                    </TableCell>
                    <TableCell>
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => openViewDialog(order)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditDialog(order)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        {order.status === 'draft' && (
                          <Tooltip title="Start Order">
                            <IconButton 
                              size="small" 
                              onClick={() => handleStatusChange(order.id, 'confirmed')}
                              color="success"
                            >
                              <StartIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {order.status === 'confirmed' && (
                          <Tooltip title="Mark In Progress">
                            <IconButton 
                              size="small" 
                              onClick={() => handleStatusChange(order.id, 'in_progress')}
                              color="warning"
                            >
                              <PauseIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {order.status === 'in_progress' && (
                          <Tooltip title="Complete Order">
                            <IconButton 
                              size="small" 
                              onClick={() => handleStatusChange(order.id, 'completed')}
                              color="success"
                            >
                              <CompleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteOrder(order.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={filteredOrders.length}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10))
            setPage(0)
          }}
        />
      </Card>

      {/* Create Order Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Manufacturing Order</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="product_name"
                label="Product Name"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="quantity"
                label="Quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Bill of Material</InputLabel>
                <Select
                  name="bom_id"
                  value={formData.bom_id}
                  label="Bill of Material"
                  onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                >
                  {boms.map((bom) => (
                    <MenuItem key={bom.id} value={bom.id}>
                      {bom.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="deadline"
                label="Deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateOrder} variant="contained" disabled={loading}>
            {loading ? 'Creating...' : 'Create Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Manufacturing Order</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="product_name"
                label="Product Name"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="quantity"
                label="Quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Bill of Material</InputLabel>
                <Select
                  name="bom_id"
                  value={formData.bom_id}
                  label="Bill of Material"
                  onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                >
                  {boms.map((bom) => (
                    <MenuItem key={bom.id} value={bom.id}>
                      {bom.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="deadline"
                label="Deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateOrder} variant="contained" disabled={loading}>
            {loading ? 'Updating...' : 'Update Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Manufacturing Order Details</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Order ID</Typography>
                <Typography variant="body1">MO-{selectedOrder.id?.toString().padStart(4, '0')}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip
                  label={selectedOrder.status || 'Draft'}
                  color={getStatusColor(selectedOrder.status)}
                  size="small"
                  icon={getStatusIcon(selectedOrder.status)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Product</Typography>
                <Typography variant="body1">{selectedOrder.product_name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Quantity</Typography>
                <Typography variant="body1">{selectedOrder.quantity}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Deadline</Typography>
                <Typography variant="body1">
                  {selectedOrder.deadline ? new Date(selectedOrder.deadline).toLocaleDateString() : 'Not set'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                <Typography variant="body1">
                  {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString() : 'Unknown'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Bill of Material</Typography>
                <Typography variant="body1">
                  {boms.find(bom => bom.id === selectedOrder.bom_id)?.name || 'Unknown BOM'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ManufacturingOrders