import { createContext, useContext, useReducer, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../services/api'

const AuthContext = createContext({
  user: null,
  token: null,
  isLoading: false,
  login: () => {},
  logout: () => {},
  register: () => {},
  updateUser: () => {}
})

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false
      }
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false
      }
    case 'INIT_LOADING':
      return {
        ...state,
        isLoading: true
      }
    default:
      return state
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: null,
    isLoading: true  // Start with loading true to check localStorage
  })

  // Load user data from localStorage on init
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        
        if (token && userData) {
          const user = JSON.parse(userData)
          dispatch({
            type: 'SET_USER',
            payload: { user, token }
          })
        } else {
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      } catch (error) {
        console.error('❌ Error restoring user session:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    initializeAuth()
  }, [])

  const login = async (credentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await authAPI.login(credentials)
      const { token, user } = response.data
      
      // Store in localStorage
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token }
      })
      
      return { success: true, user, token }
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data?.message || error.message)
      dispatch({ type: 'SET_LOADING', payload: false })
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed'
      }
    }
  }

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      await authAPI.register(userData)
      
      dispatch({ type: 'SET_LOADING', payload: false })
      return { success: true }
    } catch (error) {
      console.error('❌ Registration failed:', error.response?.data?.message || error.message)
      dispatch({ type: 'SET_LOADING', payload: false })
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed'
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    dispatch({ type: 'LOGOUT' })
  }

  const updateUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser))
    dispatch({ 
      type: 'LOGIN_SUCCESS', 
      payload: { 
        user: updatedUser, 
        token: state.token 
      } 
    })
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        register,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext