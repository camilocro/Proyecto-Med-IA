import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { tooManyRequest } from "../errors/AppError";
import { DEFAULT_DAILY_LIMIT, CONFIG_KEY_DAILY_LIMIT } from "../constants";
import { AuthenticatedRequest } from "../shared/types";
import { getTodayRange } from "../shared/fechas";
import { obtenerIdentificadorAnonimo } from "../shared/sesion";

export interface UsoDiario {
  limite: number;
  usadas: number;
  restantes: number;
  reinicio: string; // ISO: momento en que el contador vuelve a cero
}

async function getDailyLimit(): Promise<number> {
  const config = await prisma.configuracionSistema.findUnique({
    where: { clave: CONFIG_KEY_DAILY_LIMIT },
  });
  const limite = Number(config?.valor);
  return Number.isInteger(limite) && limite > 0 ? limite : DEFAULT_DAILY_LIMIT;
}

async function countConsultasRegistrado(
  idPaciente: number,
  start: Date,
  end: Date,
): Promise<number> {
  return prisma.consulta.count({
    where: {
      id_paciente: idPaciente,
      fecha_consulta: { gte: start, lt: end },
      estado: { not: "cancelada" },
    },
  });
}

async function countConsultasAnonimo(
  sesionId: string,
  start: Date,
): Promise<number> {
  const registro = await prisma.limiteConsultaAnonimo.findFirst({
    where: { sesion_id: sesionId, fecha: start },
  });
  return registro?.cantidad ?? 0;
}

async function contarConsultasDeHoy(
  req: Request,
  start: Date,
  end: Date,
): Promise<number> {
  const usuario = (req as AuthenticatedRequest).usuario;

  if (usuario) {
    const paciente = await prisma.paciente.findUnique({
      where: { id_usuario: usuario.id_usuario },
    });
    // Médicos y administradores no hacen triage: el controller los rechaza
    if (!paciente) return 0;
    return countConsultasRegistrado(paciente.id_paciente, start, end);
  }

  return countConsultasAnonimo(obtenerIdentificadorAnonimo(req), start);
}

/**
 * Calcula el uso del día para quien hace la petición (registrado o anónimo).
 * Lo usan el middleware (para bloquear) y GET /consultas/restantes (para informar),
 * así el contador del frontend y el bloqueo del backend nunca se contradicen.
 */
export async function calcularUsoDiario(req: Request): Promise<UsoDiario> {
  const limite = await getDailyLimit();
  const { start, end } = getTodayRange();
  const usadas = await contarConsultasDeHoy(req, start, end);

  return {
    limite,
    usadas,
    restantes: Math.max(0, limite - usadas),
    reinicio: end.toISOString(),
  };
}

/** RN-001: nadie (registrado o anónimo) supera el límite diario configurado. */
export async function checkDailyLimit(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const uso = await calcularUsoDiario(req);
  if (uso.restantes === 0) {
    return next(
      tooManyRequest(`Límite de ${uso.limite} consultas diarias alcanzado`),
    );
  }
  next();
}
