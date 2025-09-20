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
} from '@mui/material'
import { manufacturingOrdersAPI, dashboardAPI } from '../services/api'

const statusColors = {
  'Planned': 'primary',
  'In Progress': 'warning',
  'Done': 'success',
  'Canceled': 'error',
}

function Dashboard() {
  const [summary, setSummary] = useState({})
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [summaryRes, ordersRes] = await Promise.all([
        dashboardAPI.getSummary(),
        manufacturingOrdersAPI.getAll()
      ])
      setSummary(summaryRes.data)
      setOrders(ordersRes.data)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterByStatus = async (status) => {
    setSelectedStatus(status === selectedStatus ? null : status)
    try {
      const response = await manufacturingOrdersAPI.getAll(status === selectedStatus ? null : status)
      setOrders(response.data)
    } catch (error) {
      console.error('Error filtering orders:', error)
    }
  }

  if (loading) {
    return <Typography>Loading...</Typography>
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        App Dashboard
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Object.entries(summary).map(([status, count]) => (
          <Grid item xs={12} sm={6} md={3} key={status}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {status}
                </Typography>
                <Typography variant="h4" component="h2">
                  {count}
                </Typography>
                <Typography color="textSecondary">
                  Manufacturing Orders
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filter Buttons */}
      <Box sx={{ mb: 2 }}>
        <ButtonGroup variant="outlined" aria-label="status filter">
          <Button
            variant={selectedStatus === null ? 'contained' : 'outlined'}
            onClick={() => filterByStatus(null)}
          >
            All
          </Button>
          {Object.keys(statusColors).map((status) => (
            <Button
              key={status}
              variant={selectedStatus === status ? 'contained' : 'outlined'}
              onClick={() => filterByStatus(status)}
            >
              {status}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* Orders Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>BOM</TableCell>
              <TableCell>Deadline</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.product_name}</TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell>
                  <Chip
                    label={order.status}
                    color={statusColors[order.status]}
                    size="small"
                  />
                </TableCell>
                <TableCell>{order.bom_name}</TableCell>
                <TableCell>
                  {new Date(order.deadline).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default Dashboard