import axios, { AxiosInstance } from 'axios'

const API_URL         = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const TOKEN_STORAGE_KEY = 'med_ia_token'

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// Adjunta el JWT en cada petición saliente
apiClient.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si el servidor responde 401, limpia la sesión y redirige al login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      localStorage.removeItem('med_ia_usuario')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default apiClient
