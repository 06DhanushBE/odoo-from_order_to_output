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
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { bomsAPI } from '../services/api'

function BillOfMaterials() {
  const [boms, setBoms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBoms()
  }, [])

  const loadBoms = async () => {
    try {
      const response = await bomsAPI.getAll()
      setBoms(response.data)
    } catch (error) {
      console.error('Error loading BOMs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Typography>Loading...</Typography>
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Bills of Materials
      </Typography>

      <Box sx={{ mt: 3 }}>
        {boms.map((bom) => (
          <Accordion key={bom.id} sx={{ mb: 1 }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`bom-${bom.id}-content`}
              id={`bom-${bom.id}-header`}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">{bom.name}</Typography>
                <Chip 
                  label={`${bom.components?.length || 0} components`} 
                  size="small" 
                  color="primary" 
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="textSecondary" sx={{ mb: 2 }}>
                {bom.description}
              </Typography>
              
              {bom.components && bom.components.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Component</TableCell>
                        <TableCell align="right">Required Quantity</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bom.components.map((component) => (
                        <TableRow key={component.id}>
                          <TableCell>{component.component_name}</TableCell>
                          <TableCell align="right">{component.quantity_required}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="textSecondary">
                  No components defined for this BOM.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
        
        {boms.length === 0 && (
          <Typography color="textSecondary" align="center" sx={{ mt: 4 }}>
            No Bills of Materials found.
          </Typography>
        )}
      </Box>
    </Box>
  )
}

export default BillOfMaterials