import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ManufacturingOrderForm from './pages/ManufacturingOrderForm'
import BillOfMaterials from './pages/BillOfMaterials'
import StockLedger from './pages/StockLedger'
import AuthContext from './contexts/AuthContext'

function App() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored token on app load
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = (userData, authToken) => {
    setUser(userData)
    setToken(authToken)
    localStorage.setItem('token', authToken)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  if (loading) {
    return <Box>Loading...</Box>
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {!user ? (
        <Login />
      ) : (
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/manufacturing-orders/new" element={<ManufacturingOrderForm />} />
            <Route path="/bills-of-materials" element={<BillOfMaterials />} />
            <Route path="/stock-ledger" element={<StockLedger />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
    </AuthContext.Provider>
  )
}

export default App