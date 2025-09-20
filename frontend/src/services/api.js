import axios from 'axios'

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000/api' 
  : `${window.location.protocol}//${window.location.hostname}:8000/api`

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.reload()
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
}

export const manufacturingOrdersAPI = {
  getAll: (status) => api.get('/manufacturing-orders', { params: status ? { status } : {} }),
  getById: (id) => api.get(`/manufacturing-orders/${id}`),
  create: (data) => api.post('/manufacturing-orders', data),
  update: (id, data) => api.put(`/manufacturing-orders/${id}`, data),
}

export const bomsAPI = {
  getAll: () => api.get('/boms'),
  create: (data) => api.post('/boms', data),
}

export const stockAPI = {
  getAll: () => api.get('/stock'),
}

export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
}

export default api