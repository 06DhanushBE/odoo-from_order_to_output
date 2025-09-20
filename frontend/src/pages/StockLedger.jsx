import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  alpha,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  AttachMoney as CostIcon,
  Business as SupplierIcon,
} from '@mui/icons-material'
import { stockAPI } from '../services/api'

function StockLedger() {
  const theme = useTheme()
  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createDialog, setCreateDialog] = useState({ open: false })
  const [editDialog, setEditDialog] = useState({ open: false, component: null })
  const [newComponent, setNewComponent] = useState({
    name: '',
    quantity_on_hand: 0,
    unit_cost: 0,
    supplier: ''
  })

  useEffect(() => {
    loadStock()
  }, [])

  const loadStock = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await stockAPI.getAll()
      setComponents(response.data)
    } catch (error) {
      console.error('Error loading stock:', error)
      setError('Failed to load stock data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateComponent = async () => {
    try {
      // In a real implementation, call the API to create component
      console.log('Creating component:', newComponent)
      setCreateDialog({ open: false })
      setNewComponent({ name: '', quantity_on_hand: 0, unit_cost: 0, supplier: '' })
      loadStock()
    } catch (error) {
      console.error('Error creating component:', error)
      setError('Failed to create component.')
    }
  }

  const handleEditComponent = async () => {
    try {
      // In a real implementation, call the API to update component
      console.log('Updating component:', editDialog.component)
      setEditDialog({ open: false, component: null })
      loadStock()
    } catch (error) {
      console.error('Error updating component:', error)
      setError('Failed to update component.')
    }
  }

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { color: 'error', label: 'Out of Stock', severity: 'high' }
    if (quantity < 10) return { color: 'warning', label: 'Low Stock', severity: 'medium' }
    if (quantity < 50) return { color: 'info', label: 'Normal', severity: 'low' }
    return { color: 'success', label: 'In Stock', severity: 'none' }
  }

  const getStockStats = () => {
    const totalComponents = components.length
    const outOfStock = components.filter(c => c.quantity_on_hand === 0).length
    const lowStock = components.filter(c => c.quantity_on_hand > 0 && c.quantity_on_hand < 10).length
    const totalValue = components.reduce((sum, c) => sum + (c.quantity_on_hand * (c.unit_cost || 0)), 0)

    return { totalComponents, outOfStock, lowStock, totalValue }
  }

  const stats = getStockStats()

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Stock Ledger</Typography>
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
            Stock Ledger
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Track inventory levels and component availability
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={loadStock} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog({ open: true })}
            sx={{ borderRadius: 2 }}
          >
            Add Component
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <InventoryIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {stats.totalComponents}
              </Typography>
              <Typography color="text.secondary">
                Total Components
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <WarningIcon color="error" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {stats.outOfStock}
              </Typography>
              <Typography color="text.secondary">
                Out of Stock
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingDownIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {stats.lowStock}
              </Typography>
              <Typography color="text.secondary">
                Low Stock Alerts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <CostIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                ${stats.totalValue.toFixed(0)}
              </Typography>
              <Typography color="text.secondary">
                Total Inventory Value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stock Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Component Inventory
          </Typography>
          
          {components.length > 0 ? (
            <TableContainer sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Component Name</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Unit Cost</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Total Value</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {components.map((component) => {
                    const status = getStockStatus(component.quantity_on_hand)
                    const totalValue = component.quantity_on_hand * (component.unit_cost || 0)
                    
                    return (
                      <TableRow 
                        key={component.id}
                        hover
                        sx={{
                          backgroundColor: status.severity === 'high' 
                            ? alpha(theme.palette.error.main, 0.05)
                            : status.severity === 'medium'
                            ? alpha(theme.palette.warning.main, 0.05)
                            : 'inherit'
                        }}
                      >
                        <TableCell>
                          <Chip 
                            label={`#${component.id}`} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {component.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600,
                              color: status.color === 'error' ? 'error.main' : 
                                     status.color === 'warning' ? 'warning.main' : 'text.primary'
                            }}
                          >
                            {component.quantity_on_hand}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {component.unit_cost ? `$${component.unit_cost.toFixed(2)}` : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            sx={{ fontWeight: 600, color: 'success.main' }}
                          >
                            ${totalValue.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <SupplierIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {component.supplier || 'Not specified'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={status.label}
                            color={status.color}
                            size="small"
                            icon={status.severity === 'high' || status.severity === 'medium' ? <WarningIcon /> : undefined}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Edit Component">
                            <IconButton 
                              size="small" 
                              onClick={() => setEditDialog({ open: true, component: { ...component } })}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <InventoryIcon color="disabled" sx={{ fontSize: 64, mb: 2 }} />
              <Typography color="text.secondary" variant="h6" gutterBottom>
                No components found in inventory
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Add your first component to start tracking inventory
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => setCreateDialog({ open: true })}
              >
                Add First Component
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create Component Dialog */}
      <Dialog
        open={createDialog.open}
        onClose={() => {
          setCreateDialog({ open: false })
          setNewComponent({ name: '', quantity_on_hand: 0, unit_cost: 0, supplier: '' })
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Component</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Component Name"
              value={newComponent.name}
              onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Initial Quantity"
              type="number"
              value={newComponent.quantity_on_hand}
              onChange={(e) => setNewComponent({ ...newComponent, quantity_on_hand: parseInt(e.target.value) || 0 })}
              fullWidth
            />
            <TextField
              label="Unit Cost ($)"
              type="number"
              step="0.01"
              value={newComponent.unit_cost}
              onChange={(e) => setNewComponent({ ...newComponent, unit_cost: parseFloat(e.target.value) || 0 })}
              fullWidth
            />
            <TextField
              label="Supplier"
              value={newComponent.supplier}
              onChange={(e) => setNewComponent({ ...newComponent, supplier: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialog({ open: false })
            setNewComponent({ name: '', quantity_on_hand: 0, unit_cost: 0, supplier: '' })
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateComponent} 
            variant="contained"
            disabled={!newComponent.name}
          >
            Add Component
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Component Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, component: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Component</DialogTitle>
        <DialogContent>
          {editDialog.component && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Component Name"
                value={editDialog.component.name}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  component: { ...prev.component, name: e.target.value }
                }))}
                fullWidth
                required
              />
              <TextField
                label="Quantity on Hand"
                type="number"
                value={editDialog.component.quantity_on_hand}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  component: { ...prev.component, quantity_on_hand: parseInt(e.target.value) || 0 }
                }))}
                fullWidth
              />
              <TextField
                label="Unit Cost ($)"
                type="number"
                step="0.01"
                value={editDialog.component.unit_cost || ''}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  component: { ...prev.component, unit_cost: parseFloat(e.target.value) || 0 }
                }))}
                fullWidth
              />
              <TextField
                label="Supplier"
                value={editDialog.component.supplier || ''}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  component: { ...prev.component, supplier: e.target.value }
                }))}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, component: null })}>
            Cancel
          </Button>
          <Button onClick={handleEditComponent} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default StockLedger