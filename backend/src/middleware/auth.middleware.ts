import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { unauthorized, forbidden } from "../errors/AppError";
import { AuthenticatedRequest } from "../shared/types";

interface JwtPayload {
  id_usuario: number;
  correo: string;
  rol: string;
  tv?: number; // token_version al iniciar sesión (los tokens anteriores al Sprint 4 no lo traen)
}

function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

function verifyToken(token: string): JwtPayload | null {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret)
    throw new Error("JWT_SECRET no definido en variables de entorno");

  // jwt.verify lanza JsonWebTokenError si el token es inválido o expirado.
  // Lo capturamos aquí y devolvemos null para que el caller lo maneje limpiamente.
  try {
    return jwt.verify(token, jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
}

const MENSAJE_CUENTA_DESACTIVADA =
  "Tu cuenta fue desactivada. Comunícate con el administrador.";
const MENSAJE_SESION_CERRADA =
  "Tu sesión ya no es válida. Inicia sesión de nuevo.";

/**
 * Un JWT sigue siendo válido hasta que vence, así que además se revisa en la base:
 * - HU-007 CA-3 / HU-020: que la cuenta siga activa.
 * - HU-003 CA-3: que el token no sea de una sesión ya cerrada (token_version distinta).
 * Devuelve el motivo del rechazo, o null si la sesión es válida.
 */
async function validarSesion(payload: JwtPayload): Promise<string | null> {
  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: payload.id_usuario },
    select: { activo: true, token_version: true },
  });
  if (!usuario || !usuario.activo) return MENSAJE_CUENTA_DESACTIVADA;
  if ((payload.tv ?? 0) !== usuario.token_version)
    return MENSAJE_SESION_CERRADA;
  return null;
}

/**
 * Requiere token JWT válido, una cuenta activa y una sesión no cerrada.
 * Adjunta req.usuario con id, correo y rol.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = extractToken(req.headers.authorization);
  if (!token) return next(unauthorized());

  const payload = verifyToken(token);
  if (!payload) return next(unauthorized("Token inválido o expirado"));

  try {
    const motivo = await validarSesion(payload);
    if (motivo) return next(unauthorized(motivo));
  } catch (error) {
    return next(error);
  }

  (req as AuthenticatedRequest).usuario = payload;
  next();
}

/**
 * Igual que requireAuth pero no falla si no hay token.
 * Útil para rutas que funcionan tanto para usuarios registrados como anónimos.
 * Un token de una cuenta desactivada o de una sesión cerrada se rechaza:
 * no debe seguir operando como registrado ni pasar en silencio a anónimo.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = extractToken(req.headers.authorization);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      try {
        const motivo = await validarSesion(payload);
        if (motivo) return next(unauthorized(motivo));
      } catch (error) {
        return next(error);
      }
      (req as AuthenticatedRequest).usuario = payload;
    }
  }
  next();
}

/**
 * Guard de roles — usar DESPUÉS de requireAuth.
 * Ejemplo: router.get('/admin', requireAuth, requireRole('administrador'), ctrl.fn)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const usuario = (req as AuthenticatedRequest).usuario;
    if (!usuario || !roles.includes(usuario.rol)) return next(forbidden());
    next();
  };
}
