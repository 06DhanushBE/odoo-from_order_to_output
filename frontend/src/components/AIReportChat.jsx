import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  Grid,
  Tooltip
} from '@mui/material'
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  Lightbulb as SuggestIcon,
  Timeline as ChartIcon,
  Refresh as RefreshIcon,
  Download as ExportIcon,
  Code as CodeIcon
} from '@mui/icons-material'
import Plot from 'react-plotly.js'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

function AIReportChat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [timePeriod, setTimePeriod] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    loadSuggestions()
    // Add welcome message
    setMessages([
      {
        id: 1,
        type: 'ai',
        content: `Hello ${user?.first_name || 'there'}! 👋 I'm your AI report assistant. I can help you analyze your work data and create visualizations. Try asking me about your productivity, costs, or work patterns!`,
        timestamp: new Date().toISOString()
      }
    ])
  }, [user])

  const loadSuggestions = async () => {
    try {
      const response = await api.get('/profile/ai-suggestions')
      setSuggestions(response.data.suggestions)
    } catch (err) {
      console.error('Failed to load suggestions:', err)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)
    setError('')
    setShowSuggestions(false)

    try {
      const response = await api.post('/profile/ai-chat', {
        query: inputMessage,
        time_period: timePeriod
      })

      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.data.explanation,
        data: response.data.data,
        chart_json: response.data.chart_json,
        chart_type: response.data.chart_type,
        sql_query: response.data.sql_query,
        generated_code: response.data.generated_code,
        success: response.data.success,
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, aiResponse])

    } catch (err) {
      console.error('AI chat error:', err)
      const errorResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: '❌ Sorry, I encountered an error processing your request. Please try again or rephrase your question.',
        success: false,
        error: err.response?.data?.error || err.message,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorResponse])
      setError(err.response?.data?.error || 'Failed to process query')
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion)
    setShowSuggestions(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const exportChart = (chartJson, filename = 'chart') => {
    const blob = new Blob([chartJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportToPDF = async () => {
    try {
      setLoading(true)
      
      const response = await api.post('/profile/ai-chat/export-pdf', {
        messages: messages.filter(m => m.type !== 'ai' || m.content), // Filter out empty messages
        time_period: timePeriod
      }, {
        responseType: 'blob'
      })
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `AI_Report_Chat_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (err) {
      console.error('PDF export error:', err)
      setError('Failed to export chat to PDF')
    } finally {
      setLoading(false)
    }
  }

  const renderMessage = (message) => {
    const isUser = message.type === 'user'
    
    return (
      <Box
        key={message.id}
        display="flex"
        justifyContent={isUser ? 'flex-end' : 'flex-start'}
        mb={2}
      >
        <Box
          display="flex"
          flexDirection={isUser ? 'row-reverse' : 'row'}
          alignItems="flex-start"
          maxWidth="80%"
          gap={1}
        >
          <Avatar
            sx={{
              bgcolor: isUser ? 'primary.main' : 'secondary.main',
              width: 32,
              height: 32
            }}
          >
            {isUser ? <PersonIcon fontSize="small" /> : <AIIcon fontSize="small" />}
          </Avatar>
          
          <Paper
            elevation={1}
            sx={{
              p: 2,
              bgcolor: isUser ? 'primary.light' : 'grey.100',
              color: isUser ? 'primary.contrastText' : 'text.primary',
              borderRadius: 2,
              maxWidth: '100%'
            }}
          >
            <Typography variant="body1" gutterBottom>
              {message.content}
            </Typography>
            
            {message.success === false && message.error && (
              <Alert severity="error" sx={{ mt: 1 }} size="small">
                {message.error}
              </Alert>
            )}
            
            {/* Render chart if available */}
            {message.chart_json && message.success !== false && (
              <Box mt={2}>
                <Box display="flex" alignItems="center" justifyContent="between" mb={1}>
                  <Chip
                    icon={<ChartIcon />}
                    label={`${message.chart_type} Chart`}
                    size="small"
                    color="primary"
                  />
                  <Tooltip title="Export Chart Data">
                    <IconButton
                      size="small"
                      onClick={() => exportChart(message.chart_json, `chart_${message.id}`)}
                    >
                      <ExportIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Box
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    overflow: 'hidden'
                  }}
                >
                  <Plot
                    data={JSON.parse(message.chart_json).data}
                    layout={{
                      ...JSON.parse(message.chart_json).layout,
                      autosize: true,
                      margin: { l: 40, r: 40, t: 40, b: 40 }
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '400px' }}
                  />
                </Box>
              </Box>
            )}
            
            {/* Show data table if available */}
            {message.data && message.data.length > 0 && (
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">
                    View Data ({message.data.length} records)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    <pre style={{ fontSize: '12px', margin: 0 }}>
                      {JSON.stringify(message.data.slice(0, 10), null, 2)}
                    </pre>
                    {message.data.length > 10 && (
                      <Typography variant="caption" color="text.secondary">
                        Showing first 10 of {message.data.length} records
                      </Typography>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
            
            {/* Show SQL query if available */}
            {message.sql_query && (
              <Accordion sx={{ mt: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">
                    <CodeIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    SQL Query
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                    <Typography variant="caption" component="pre" sx={{ fontSize: '11px' }}>
                      {message.sql_query}
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
            
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </Typography>
          </Paper>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <AIIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={600}>
              AI Report Assistant
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ask questions about your work data and get instant visualizations
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Period</InputLabel>
            <Select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              label="Time Period"
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={exportToPDF}
            disabled={loading || messages.length <= 1}
            size="small"
          >
            Export PDF
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Chat Messages */}
      <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', mb: 2 }}>
        <CardContent sx={{ flexGrow: 1, overflow: 'auto', maxHeight: 500 }}>
          {messages.map(renderMessage)}
          
          {loading && (
            <Box display="flex" justifyContent="flex-start" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                  <AIIcon fontSize="small" />
                </Avatar>
                <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.100' }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CircularProgress size={16} />
                    <Typography variant="body2">Analyzing your data...</Typography>
                  </Box>
                </Paper>
              </Box>
            </Box>
          )}
          
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input Area */}
        <Divider />
        <Box p={2}>
          <Box display="flex" gap={1} alignItems="flex-end">
            <TextField
              fullWidth
              multiline
              maxRows={3}
              placeholder="Ask me about your productivity, costs, work patterns..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              variant="outlined"
              size="small"
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={loading || !inputMessage.trim()}
              endIcon={<SendIcon />}
            >
              Send
            </Button>
          </Box>
        </Box>
      </Card>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <SuggestIcon color="primary" />
              <Typography variant="h6">
                Suggested Questions
              </Typography>
              <IconButton size="small" onClick={() => setShowSuggestions(!showSuggestions)}>
                <ExpandMoreIcon />
              </IconButton>
            </Box>
            
            <Grid container spacing={2}>
              {suggestions.map((category, categoryIndex) => (
                <Grid item xs={12} md={6} key={categoryIndex}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    {category.category}
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    {category.queries.map((query, queryIndex) => (
                      <Chip
                        key={queryIndex}
                        label={query}
                        variant="outlined"
                        size="small"
                        onClick={() => handleSuggestionClick(query)}
                        sx={{ 
                          justifyContent: 'flex-start',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' }
                        }}
                      />
                    ))}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default AIReportChat