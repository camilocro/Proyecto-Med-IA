/**
 * Mensaje para mostrar al usuario a partir de un error de axios.
 * Sin respuesta del servidor = problema de conexión (HU-033 CA-2: mensaje amigable).
 */
export function mensajeDeError(err: unknown, porDefecto: string): string {
  const error = err as { response?: { data?: { message?: string } } }
  if (!error?.response) return 'No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.'
  return error.response.data?.message ?? porDefecto
}
