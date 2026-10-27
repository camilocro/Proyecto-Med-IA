import axios, { AxiosInstance } from 'axios'

const API_URL           = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const TOKEN_STORAGE_KEY = 'med_ia_token'
const USUARIO_STORAGE_KEY = 'med_ia_usuario'

// Endpoints donde un 401 significa "credenciales incorrectas", no "sesión expirada".
// En estos casos el formulario debe mostrar el error sin recargar la página.
const RUTAS_SIN_REDIRECCION = ['/auth/login', '/auth/register']

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

// Si el servidor responde 401 en una ruta protegida, limpia la sesión y redirige al login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url             = error.config?.url ?? ''
    const esRutaDeAuth    = RUTAS_SIN_REDIRECCION.some((ruta) => url.startsWith(ruta))
    const yaEstaEnLogin   = typeof window !== 'undefined' && window.location.pathname === '/login'

    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !esRutaDeAuth
    ) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      localStorage.removeItem(USUARIO_STORAGE_KEY)
      if (!yaEstaEnLogin) window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default apiClient
