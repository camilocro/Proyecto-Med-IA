// Flujo de autenticación definido para Med-IA (HU-001 CA-5):
// al registrarse, el usuario NO queda logueado automáticamente; se lo redirige al
// inicio de sesión, donde solo se muestra la opción de iniciar sesión.

export const RUTA_LOGIN_TRAS_REGISTRO = '/login?registro=exitoso'

const PARAM_REGISTRO       = 'registro'
const VALOR_EXITOSO        = 'exitoso'
const CORREO_REGISTRADO_KEY = 'med_ia_correo_registrado'

/** true si la URL actual indica que el usuario acaba de crear su cuenta. */
export function vieneDeRegistroExitoso(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get(PARAM_REGISTRO) === VALOR_EXITOSO
}

/** Guarda temporalmente el correo recién registrado para precargarlo en el login. */
export function recordarCorreoRegistrado(correo: string): void {
  try {
    sessionStorage.setItem(CORREO_REGISTRADO_KEY, correo)
  } catch {
    // sessionStorage no disponible: el usuario simplemente escribe su correo
  }
}

/** Devuelve (y elimina) el correo recién registrado, si existe. */
export function consumirCorreoRegistrado(): string {
  try {
    const correo = sessionStorage.getItem(CORREO_REGISTRADO_KEY) ?? ''
    sessionStorage.removeItem(CORREO_REGISTRADO_KEY)
    return correo
  } catch {
    return ''
  }
}
