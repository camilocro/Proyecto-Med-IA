import { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError'

/**
 * Handler global de errores.
 * Captura tanto AppErrors (errores operacionales esperados)
 * como errores inesperados del sistema.
 * Debe registrarse como el ÚLTIMO middleware en index.ts.
 */
export function globalErrorHandler(
  error:    Error,
  _req:     Request,
  res:      Response,
  _next:    NextFunction,
) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
  }

  // Error inesperado — no exponer detalles en producción
  console.error('[Error no manejado]', error)
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? error.message
      : 'Error interno del servidor',
  })
}
