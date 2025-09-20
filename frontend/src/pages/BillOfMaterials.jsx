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
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  AttachMoney as CostIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { bomsAPI, stockAPI } from '../services/api'

function BillOfMaterials() {
  const theme = useTheme()
  const [boms, setBoms] = useState([])
  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createDialog, setCreateDialog] = useState({ open: false })
  const [newBom, setNewBom] = useState({
    name: '',
    description: '',
    components: []
  })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, bomId: null, bomName: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const [bomsRes, stockRes] = await Promise.all([
        bomsAPI.getAll(),
        stockAPI.getAll()
      ])
      setBoms(bomsRes.data)
      setComponents(stockRes.data)
    } catch (error) {
      console.error('Error loading BOMs:', error)
      setError('Failed to load Bills of Materials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBom = async () => {
    try {
      await bomsAPI.create(newBom)
      setCreateDialog({ open: false })
      setNewBom({ name: '', description: '', components: [] })
      loadData()
    } catch (error) {
      console.error('Error creating BOM:', error)
      setError('Failed to create BOM.')
    }
  }

  const addComponentToBom = () => {
    setNewBom(prev => ({
      ...prev,
      components: [...prev.components, { component_id: '', quantity_required: 1 }]
    }))
  }

  const updateBomComponent = (index, field, value) => {
    setNewBom(prev => ({
      ...prev,
      components: prev.components.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    }))
  }

  const removeBomComponent = (index) => {
    setNewBom(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }))
  }

  const handleDeleteBom = async () => {
    try {
      console.log('🔄 Attempting to delete BOM with ID:', deleteDialog.bomId)
      const response = await bomsAPI.delete(deleteDialog.bomId)
      console.log('✅ Delete response:', response)
      setDeleteDialog({ open: false, bomId: null, bomName: '' })
      loadData() // Reload the data
      console.log('✅ BOM deleted successfully, data reloaded')
    } catch (error) {
      console.error('❌ Error deleting BOM:', error)
      console.error('❌ Error details:', error.response?.data || error.message)
      setError(`Failed to delete BOM: ${error.response?.data?.message || error.message}`)
      setDeleteDialog({ open: false, bomId: null, bomName: '' })
    }
  }

  const openDeleteDialog = (bomId, bomName) => {
    setDeleteDialog({ open: true, bomId, bomName })
  }

  const getBomStats = () => {
    const totalBoms = boms.length
    const totalComponents = components.length
    const avgComponentsPerBom = totalBoms > 0 ? Math.round(
      boms.reduce((sum, bom) => sum + (bom.components?.length || 0), 0) / totalBoms
    ) : 0

    return { totalBoms, totalComponents, avgComponentsPerBom }
  }

  const stats = getBomStats()

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Bills of Materials</Typography>
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
            Bills of Materials
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage product recipes and component requirements
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={loadData} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog({ open: true })}
            sx={{ borderRadius: 2 }}
          >
            Create BOM
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
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignmentIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {stats.totalBoms}
              </Typography>
              <Typography color="text.secondary">
                Total BOMs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignmentIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {stats.totalComponents}
              </Typography>
              <Typography color="text.secondary">
                Available Components
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignmentIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {stats.avgComponentsPerBom}
              </Typography>
              <Typography color="text.secondary">
                Avg Components/BOM
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* BOMs List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Bills of Materials
          </Typography>
          
          {boms.length > 0 ? (
            <Box sx={{ mt: 2 }}>
              {boms.map((bom) => (
                <Accordion 
                  key={bom.id} 
                  sx={{ 
                    mb: 1,
                    '&:before': { display: 'none' },
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    borderRadius: '8px !important',
                    '&.Mui-expanded': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.03),
                      borderRadius: '8px',
                      '&.Mui-expanded': {
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {bom.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {bom.description}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip 
                          label={`${bom.components?.length || 0} components`} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                        {bom.total_cost > 0 && (
                          <Chip 
                            label={`$${bom.total_cost.toFixed(2)}`} 
                            size="small" 
                            color="success" 
                            variant="outlined"
                            icon={<CostIcon />}
                          />
                        )}
                        {bom.version && (
                          <Chip 
                            label={`v${bom.version}`} 
                            size="small" 
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 3 }}>
                    {bom.components && bom.components.length > 0 ? (
                      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                              <TableCell sx={{ fontWeight: 600 }}>Component</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>Required Qty</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>Unit Cost</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>Total Cost</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {bom.components.map((component) => (
                              <TableRow key={component.id} hover>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {component.component_name}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Chip 
                                    label={component.quantity_required} 
                                    size="small" 
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  {component.unit_cost ? `$${component.unit_cost.toFixed(2)}` : 'N/A'}
                                </TableCell>
                                <TableCell align="right">
                                  <Typography 
                                    variant="body2" 
                                    sx={{ fontWeight: 600, color: 'success.main' }}
                                  >
                                    {component.total_cost ? `$${component.total_cost.toFixed(2)}` : 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="text.secondary">
                                    {component.notes || '-'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info">
                        No components defined for this BOM. Click "Edit" to add components.
                      </Alert>
                    )}
                    
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        variant="outlined"
                      >
                        Edit BOM
                      </Button>
                      <Button
                        size="small"
                        startIcon={<DeleteIcon />}
                        variant="outlined"
                        color="error"
                        onClick={() => openDeleteDialog(bom.id, bom.name)}
                      >
                        Delete
                      </Button>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <AssignmentIcon color="disabled" sx={{ fontSize: 64, mb: 2 }} />
              <Typography color="text.secondary" variant="h6" gutterBottom>
                No Bills of Materials found
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Create your first BOM to define product recipes and component requirements
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => setCreateDialog({ open: true })}
              >
                Create First BOM
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create BOM Dialog */}
      <Dialog
        open={createDialog.open}
        onClose={() => {
          setCreateDialog({ open: false })
          setNewBom({ name: '', description: '', components: [] })
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Bill of Materials</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="BOM Name"
              value={newBom.name}
              onChange={(e) => setNewBom({ ...newBom, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newBom.description}
              onChange={(e) => setNewBom({ ...newBom, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Components</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addComponentToBom}
                  variant="outlined"
                  size="small"
                >
                  Add Component
                </Button>
              </Box>
              
              {newBom.components.map((comp, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                  <TextField
                    select
                    label="Component"
                    value={comp.component_id}
                    onChange={(e) => updateBomComponent(index, 'component_id', e.target.value)}
                    sx={{ flex: 1 }}
                    SelectProps={{ native: true }}
                  >
                    <option value="">Select Component</option>
                    {components.map((component) => (
                      <option key={component.id} value={component.id}>
                        {component.name}
                      </option>
                    ))}
                  </TextField>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={comp.quantity_required}
                    onChange={(e) => updateBomComponent(index, 'quantity_required', parseInt(e.target.value))}
                    sx={{ width: 120 }}
                  />
                  <IconButton 
                    onClick={() => removeBomComponent(index)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              
              {newBom.components.length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                  No components added. Click "Add Component" to start building your BOM.
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialog({ open: false })
            setNewBom({ name: '', description: '', components: [] })
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateBom} 
            variant="contained"
            disabled={!newBom.name || newBom.components.length === 0}
          >
            Create BOM
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete BOM Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, bomId: null, bomName: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the BOM "{deleteDialog.bomName}"?
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. All associated components will also be removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialog({ open: false, bomId: null, bomName: '' })}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteBom} 
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
          >
            Delete BOM
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default BillOfMaterials