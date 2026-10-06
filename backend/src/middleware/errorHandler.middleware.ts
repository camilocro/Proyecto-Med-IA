import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError";

/** Errores que lanza express.json() al leer el body */
interface ErrorDeBody extends Error {
  type?: string;
}

/**
 * Handler global de errores.
 * Captura tanto AppErrors (errores operacionales esperados)
 * como errores inesperados del sistema.
 * Debe registrarse como el ÚLTIMO middleware en index.ts.
 */
export function globalErrorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof AppError) {
    return responder(res, error.statusCode, error.message);
  }

  // Body mal formado o demasiado grande (los lanza express.json)
  const tipoErrorBody = (error as ErrorDeBody).type;
  if (tipoErrorBody === "entity.parse.failed") {
    return responder(res, 400, "El cuerpo de la petición no es un JSON válido");
  }
  if (tipoErrorBody === "entity.too.large") {
    return responder(res, 413, "El cuerpo de la petición es demasiado grande");
  }

  // Errores conocidos de Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return responder(res, 409, "Ya existe un registro con esos datos");
    if (error.code === "P2025")
      return responder(res, 404, "Registro no encontrado");
  }

  // Error inesperado — no exponer detalles en producción
  console.error("[Error no manejado]", error);
  return responder(
    res,
    500,
    process.env.NODE_ENV === "development"
      ? error.message
      : "Error interno del servidor",
  );
}

function responder(res: Response, statusCode: number, message: string) {
  return res.status(statusCode).json({ success: false, message });
}
