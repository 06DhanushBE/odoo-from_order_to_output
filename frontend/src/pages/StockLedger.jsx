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
} from '@mui/material'
import { stockAPI } from '../services/api'

function StockLedger() {
  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStock()
  }, [])

  const loadStock = async () => {
    try {
      const response = await stockAPI.getAll()
      setComponents(response.data)
    } catch (error) {
      console.error('Error loading stock:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { color: 'error', label: 'Out of Stock' }
    if (quantity < 10) return { color: 'warning', label: 'Low Stock' }
    return { color: 'success', label: 'In Stock' }
  }

  if (loading) {
    return <Typography>Loading...</Typography>
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Stock Ledger
      </Typography>

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Component ID</TableCell>
              <TableCell>Component Name</TableCell>
              <TableCell align="right">Quantity on Hand</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {components.map((component) => {
              const status = getStockStatus(component.quantity_on_hand)
              return (
                <TableRow key={component.id}>
                  <TableCell>{component.id}</TableCell>
                  <TableCell>{component.name}</TableCell>
                  <TableCell align="right">{component.quantity_on_hand}</TableCell>
                  <TableCell>
                    <Chip
                      label={status.label}
                      color={status.color}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      
      {components.length === 0 && (
        <Typography color="textSecondary" align="center" sx={{ mt: 4 }}>
          No components found in inventory.
        </Typography>
      )}
    </Box>
  )
}

export default StockLedger