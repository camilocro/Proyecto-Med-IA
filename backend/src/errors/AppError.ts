/**
 * Error operacional del sistema.
 * Se lanza desde servicios y controllers para indicar
 * errores esperados (validación, no encontrado, sin permisos, etc.)
 * El handler global lo captura y envía la respuesta correcta.
 */
export class AppError extends Error {
  readonly statusCode: number
  readonly isOperational: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode   = statusCode
    this.isOperational = true
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

// Atajos para los errores más comunes
export const notFound       = (resource: string) => new AppError(`${resource} no encontrado`, 404)
export const unauthorized   = (msg = 'No autenticado')         => new AppError(msg, 401)
export const forbidden      = (msg = 'Sin permisos')           => new AppError(msg, 403)
export const conflict       = (msg: string)                    => new AppError(msg, 409)
export const badRequest     = (msg: string)                    => new AppError(msg, 400)
export const tooManyRequest = (msg: string)                    => new AppError(msg, 429)
