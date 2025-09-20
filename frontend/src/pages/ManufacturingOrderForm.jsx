import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from '@mui/material'
import { manufacturingOrdersAPI, bomsAPI } from '../services/api'

function ManufacturingOrderForm() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    product_name: '',
    quantity: '',
    bom_id: '',
    deadline: ''
  })
  const [boms, setBoms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadBoms()
  }, [])

  const loadBoms = async () => {
    try {
      const response = await bomsAPI.getAll()
      setBoms(response.data)
    } catch (error) {
      console.error('Error loading BOMs:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Format deadline for backend
      const deadline = new Date(formData.deadline).toISOString()
      
      await manufacturingOrdersAPI.create({
        ...formData,
        quantity: parseInt(formData.quantity),
        bom_id: parseInt(formData.bom_id),
        deadline
      })
      
      setSuccess('Manufacturing Order created successfully!')
      setTimeout(() => {
        navigate('/')
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create manufacturing order')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Create Manufacturing Order
      </Typography>

      <Card sx={{ maxWidth: 600 }}>
        <CardContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="product_name"
                  label="Product"
                  value={formData.product_name}
                  onChange={handleChange}
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
                  onChange={handleChange}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Bill of Material</InputLabel>
                  <Select
                    name="bom_id"
                    value={formData.bom_id}
                    label="Bill of Material"
                    onChange={handleChange}
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
                  onChange={handleChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Manufacturing Order'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/')}
                  >
                    Cancel
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default ManufacturingOrderForm