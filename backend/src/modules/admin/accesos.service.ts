import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import { RangoFechas } from "../../shared/fechas";
import { MAX_ACCESOS_DETALLE_IP } from "../../constants";

export interface FiltrosAccesos {
  usuario?: string; // nombre o correo, sin distinguir mayúsculas
  ip?: string;
  resultado?: "exitoso" | "fallido";
  fecha: RangoFechas;
  pagina: number;
  porPagina: number;
}

const SELECT_ACCESO = {
  id: true,
  correo_intentado: true,
  ip_address: true,
  exitoso: true,
  fecha: true,
  usuario: { select: { nombre: true, rol: true } },
} as const;

function construirWhere(
  filtros: FiltrosAccesos,
): Prisma.IntentoLoginWhereInput {
  const where: Prisma.IntentoLoginWhereInput = {};
  if (filtros.fecha.gte || filtros.fecha.lt) where.fecha = filtros.fecha;
  if (filtros.resultado) where.exitoso = filtros.resultado === "exitoso";
  if (filtros.ip) where.ip_address = filtros.ip;
  if (filtros.usuario) {
    where.OR = [
      { correo_intentado: { contains: filtros.usuario, mode: "insensitive" } },
      {
        usuario: { nombre: { contains: filtros.usuario, mode: "insensitive" } },
      },
    ];
  }
  return where;
}

/** HU-047: accesos del más reciente al más antiguo, con filtros combinables. */
export async function listarAccesos(filtros: FiltrosAccesos) {
  const where = construirWhere(filtros);
  const [total, accesos] = await prisma.$transaction([
    prisma.intentoLogin.count({ where }),
    prisma.intentoLogin.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip: (filtros.pagina - 1) * filtros.porPagina,
      take: filtros.porPagina,
      select: SELECT_ACCESO,
    }),
  ]);
  return {
    accesos,
    total,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}

/** HU-047: resumen de una IP (totales, rango de fechas, correos intentados y últimos accesos). */
export async function getDetalleIp(ip: string) {
  const where = { ip_address: ip };
  const [total, exitosos, primero, ultimo, correos, recientes] =
    await Promise.all([
      prisma.intentoLogin.count({ where }),
      prisma.intentoLogin.count({ where: { ...where, exitoso: true } }),
      prisma.intentoLogin.findFirst({
        where,
        orderBy: { fecha: "asc" },
        select: { fecha: true },
      }),
      prisma.intentoLogin.findFirst({
        where,
        orderBy: { fecha: "desc" },
        select: { fecha: true },
      }),
      prisma.intentoLogin.findMany({
        where,
        distinct: ["correo_intentado"],
        select: { correo_intentado: true },
      }),
      prisma.intentoLogin.findMany({
        where,
        orderBy: { fecha: "desc" },
        take: MAX_ACCESOS_DETALLE_IP,
        select: SELECT_ACCESO,
      }),
    ]);

  return {
    ip,
    total,
    exitosos,
    fallidos: total - exitosos,
    primero: primero?.fecha ?? null,
    ultimo: ultimo?.fecha ?? null,
    correos: correos.map((c) => c.correo_intentado),
    recientes,
  };
}
