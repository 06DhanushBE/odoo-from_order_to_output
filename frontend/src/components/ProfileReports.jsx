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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Pagination,
  Divider,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  IconButton,
  Tooltip,
  Avatar
} from '@mui/material'
import {
  Assessment as ReportsIcon,
  AccessTime as TimeIcon,
  WorkOutline as WorkIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material'
import { XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import api from '../services/api'

function ProfileReports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportsData, setReportsData] = useState(null)
  const [period, setPeriod] = useState('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)

  console.log('📊 ProfileReports component mounted')

  const loadReports = async () => {
    try {
      setLoading(true)
      setError('')
      console.log('📊 Loading profile reports...', { period, page, limit })
      const response = await api.get(`/profile/reports?period=${period}&page=${page}&limit=${limit}`)
      console.log('📊 Profile reports loaded successfully:', response.data)
      setReportsData(response.data)
    } catch (err) {
      console.error('❌ Failed to load profile reports:', err)
      console.error('❌ Error details:', err.response?.data)
      setError(err.response?.data?.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [period, page])

  const formatDuration = (minutes) => {
    if (!minutes) return '0 min'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'success'
      case 'In Progress': return 'warning'
      case 'Done': return 'success'
      case 'Planned': return 'info'
      default: return 'default'
    }
  }

  const handlePeriodChange = (event) => {
    setPeriod(event.target.value)
    setPage(1) // Reset to first page when changing period
  }

  const handlePageChange = (event, newPage) => {
    setPage(newPage)
  }

  const handleRefresh = () => {
    loadReports()
  }

  if (loading && !reportsData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    )
  }

  if (error && !reportsData) {
    return (
      <Alert severity="error" action={
        <Button onClick={handleRefresh} startIcon={<RefreshIcon />}>
          Retry
        </Button>
      }>
        {error}
      </Alert>
    )
  }

  if (!reportsData) {
    return (
      <Typography variant="body1" color="text.secondary" align="center">
        No report data available
      </Typography>
    )
  }

  const { user, summary, completed_work_orders, work_centers, productivity_trend } = reportsData
  const currentStats = summary.period || summary.all_time

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <ReportsIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={600}>
              Work Reports
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.name} • {user.department} • {user.role}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select value={period} onChange={handlePeriodChange} label="Period">
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Summary Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Completed Orders
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {currentStats.total_completed}
                  </Typography>
                </Box>
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Work Hours
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {currentStats.total_duration_hours}h
                  </Typography>
                </Box>
                <TimeIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Avg. Duration
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {formatDuration(currentStats.avg_duration_minutes)}
                  </Typography>
                </Box>
                <ScheduleIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Cost
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    ${currentStats.total_cost}
                  </Typography>
                </Box>
                <TrendingUpIcon color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Productivity Trend Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon color="primary" />
                Daily Productivity (Last 30 Days)
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {productivity_trend && productivity_trend.length > 0 ? (
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productivity_trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis />
                      <ChartTooltip 
                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                        formatter={(value, name) => [
                          name === 'orders_completed' ? `${value} orders` : `${value} hours`,
                          name === 'orders_completed' ? 'Orders Completed' : 'Hours Worked'
                        ]}
                      />
                      <Bar dataKey="orders_completed" fill="#1976d2" name="orders_completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                  No productivity data available for the selected period
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Work Centers */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon color="primary" />
                Recent Work Centers
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {work_centers && work_centers.length > 0 ? (
                <List dense>
                  {work_centers.map((wc) => (
                    <ListItem key={wc.work_center_id} sx={{ px: 0 }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.light', width: 32, height: 32 }}>
                        <BusinessIcon fontSize="small" />
                      </Avatar>
                      <ListItemText
                        primary={wc.work_center_name}
                        secondary={`${wc.orders_completed} orders • Last: ${formatDate(wc.last_worked)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  No work center data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Completed Work Orders Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WorkIcon color="primary" />
                  Completed Work Orders
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  {completed_work_orders.pagination && (
                    <Typography variant="body2" color="text.secondary">
                      {((completed_work_orders.pagination.page - 1) * completed_work_orders.pagination.limit) + 1}-
                      {Math.min(completed_work_orders.pagination.page * completed_work_orders.pagination.limit, completed_work_orders.pagination.total)} 
                      {' '}of {completed_work_orders.pagination.total}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {loading && <LinearProgress sx={{ mb: 2 }} />}

              {completed_work_orders.data && completed_work_orders.data.length > 0 ? (
                <>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Work Order</TableCell>
                          <TableCell>Manufacturing Order</TableCell>
                          <TableCell>Work Center</TableCell>
                          <TableCell>Duration</TableCell>
                          <TableCell>Completed</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {completed_work_orders.data.map((wo) => (
                          <TableRow key={wo.id} hover>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {wo.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  #{wo.id}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {wo.manufacturing_order ? (
                                <Box>
                                  <Typography variant="body2">
                                    {wo.manufacturing_order.product_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {wo.manufacturing_order.id} • Qty: {wo.manufacturing_order.quantity}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {wo.work_center_name || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2">
                                  {formatDuration(wo.actual_duration_minutes)}
                                </Typography>
                                {wo.duration_minutes !== wo.actual_duration_minutes && (
                                  <Typography variant="caption" color="text.secondary">
                                    Est: {formatDuration(wo.duration_minutes)}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(wo.completed_at)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={wo.status} 
                                color={getStatusColor(wo.status)} 
                                size="small" 
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Pagination */}
                  {completed_work_orders.pagination && completed_work_orders.pagination.total > limit && (
                    <Box display="flex" justifyContent="center" mt={3}>
                      <Pagination
                        count={Math.ceil(completed_work_orders.pagination.total / limit)}
                        page={page}
                        onChange={handlePageChange}
                        color="primary"
                        showFirstButton
                        showLastButton
                      />
                    </Box>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                  No completed work orders found for the selected period
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ProfileReports