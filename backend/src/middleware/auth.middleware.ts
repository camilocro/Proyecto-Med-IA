import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../config/prisma'
import { unauthorized, forbidden } from '../errors/AppError'
import { AuthenticatedRequest } from '../shared/types'

interface JwtPayload {
  id_usuario: number
  correo:     string
  rol:        string
}

function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

function verifyToken(token: string): JwtPayload | null {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) throw new Error('JWT_SECRET no definido en variables de entorno')

  // jwt.verify lanza JsonWebTokenError si el token es inválido o expirado.
  // Lo capturamos aquí y devolvemos null para que el caller lo maneje limpiamente.
  try {
    return jwt.verify(token, jwtSecret) as JwtPayload
  } catch {
    return null
  }
}

const MENSAJE_CUENTA_DESACTIVADA = 'Tu cuenta fue desactivada. Comunícate con el administrador.'

/**
 * HU-007 CA-3 / HU-020: un JWT sigue siendo válido hasta que vence, así que además
 * se confirma en la base de datos que la cuenta continúa activa.
 */
async function cuentaActiva(idUsuario: number): Promise<boolean> {
  const usuario = await prisma.usuario.findUnique({
    where:  { id_usuario: idUsuario },
    select: { activo: true },
  })
  return usuario?.activo === true
}

/**
 * Requiere token JWT válido y una cuenta activa.
 * Adjunta req.usuario con id, correo y rol.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token   = extractToken(req.headers.authorization)
  if (!token) return next(unauthorized())

  const payload = verifyToken(token)
  if (!payload) return next(unauthorized('Token inválido o expirado'))

  try {
    if (!(await cuentaActiva(payload.id_usuario))) return next(unauthorized(MENSAJE_CUENTA_DESACTIVADA))
  } catch (error) {
    return next(error)
  }

  ;(req as AuthenticatedRequest).usuario = payload
  next()
}

/**
 * Igual que requireAuth pero no falla si no hay token.
 * Útil para rutas que funcionan tanto para usuarios registrados como anónimos.
 * Un token de una cuenta desactivada sí se rechaza: no debe seguir operando como registrado.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req.headers.authorization)
  if (token) {
    const payload = verifyToken(token)
    if (payload) {
      try {
        if (!(await cuentaActiva(payload.id_usuario))) return next(unauthorized(MENSAJE_CUENTA_DESACTIVADA))
      } catch (error) {
        return next(error)
      }
      ;(req as AuthenticatedRequest).usuario = payload
    }
  }
  next()
}

/**
 * Guard de roles — usar DESPUÉS de requireAuth.
 * Ejemplo: router.get('/admin', requireAuth, requireRole('administrador'), ctrl.fn)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const usuario = (req as AuthenticatedRequest).usuario
    if (!usuario || !roles.includes(usuario.rol)) return next(forbidden())
    next()
  }
}
