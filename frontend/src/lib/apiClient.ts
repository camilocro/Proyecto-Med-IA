import axios, { AxiosInstance } from "axios";
import { iniciarCarga, terminarCarga } from "./cargaGlobal";

declare module "axios" {
  interface AxiosRequestConfig {
    /** true para que esta petición no bloquee la pantalla */
    sinBloqueo?: boolean;
  }
  interface InternalAxiosRequestConfig {
    bloqueaPantalla?: boolean;
  }
}

// Solo las operaciones que modifican datos bloquean la pantalla (las búsquedas y filtros no)
const METODOS_QUE_BLOQUEAN = ["post", "patch", "put", "delete"];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_STORAGE_KEY = "med_ia_token";
const USUARIO_STORAGE_KEY = "med_ia_usuario";
const RUTA_CUENTA_DESHABILITADA = "/cuenta-deshabilitada";

// Endpoints donde un 401 significa "credenciales incorrectas", no "sesión expirada".
// En estos casos el formulario debe mostrar el error sin recargar la página.
const RUTAS_SIN_REDIRECCION = [
  "/auth/login",
  "/auth/register",
  "/auth/logout",
  "/auth/google",
  "/auth/2fa",
];

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// Adjunta el JWT en cada petición saliente y bloquea la pantalla si modifica datos
apiClient.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (
    METODOS_QUE_BLOQUEAN.includes((config.method ?? "get").toLowerCase()) &&
    !config.sinBloqueo
  ) {
    config.bloqueaPantalla = true;
    iniciarCarga();
  }
  return config;
});

function limpiarSesion() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USUARIO_STORAGE_KEY);
}

apiClient.interceptors.response.use(
  (response) => {
    if (response.config.bloqueaPantalla) terminarCarga();
    return response;
  },
  (error) => {
    if (error.config?.bloqueaPantalla) terminarCarga();
    if (typeof window === "undefined") return Promise.reject(error);

    // HU-007: un administrador desactivó la cuenta (al iniciar sesión o con la sesión abierta)
    if (
      error.response?.status === 403 &&
      error.response?.data?.codigo === "CUENTA_DESACTIVADA"
    ) {
      limpiarSesion();
      if (window.location.pathname !== RUTA_CUENTA_DESHABILITADA) {
        window.location.href = RUTA_CUENTA_DESHABILITADA;
      }
      return Promise.reject(error);
    }

    // Si el servidor responde 401 en una ruta protegida, limpia la sesión y redirige al login
    const url = error.config?.url ?? "";
    const esRutaDeAuth = RUTAS_SIN_REDIRECCION.some((ruta) =>
      url.startsWith(ruta),
    );
    if (error.response?.status === 401 && !esRutaDeAuth) {
      limpiarSesion();
      if (window.location.pathname !== "/login")
        window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default apiClient;
