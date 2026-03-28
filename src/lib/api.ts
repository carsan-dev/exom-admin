import axios from 'axios'
import { getIdToken } from './firebase'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — inject Firebase JWT
api.interceptors.request.use(async (config) => {
  const token = await getIdToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    if (error.response?.status === 423) {
      // Account blocked — propagate special error code
      const err = new Error('ACCOUNT_BLOCKED')
      err.name = 'ACCOUNT_BLOCKED'
      return Promise.reject(err)
    }
    return Promise.reject(error)
  }
)
