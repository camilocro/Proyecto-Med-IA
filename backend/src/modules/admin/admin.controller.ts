import { Request, Response } from "express";
import { NivelUrgencia, EstadoConsulta } from "@prisma/client";
import {
  getDashboardMetrics,
  listarConsultas,
  getDetalleConsulta,
  getHistorialUsuario,
  getRankingMedicos,
  getUsuarios,
  cambiarEstadoUsuario,
  getConfiguracion,
  setConfiguracion,
  getEstadisticas,
  Auditor,
} from "./admin.service";
import { ok, AuthenticatedRequest } from "../../shared/types";
import { badRequest } from "../../errors/AppError";
import { parsearRangoFechas, formatearFechaLocal } from "../../shared/fechas";
import {
  MAX_CONSULTAS_RECIENTES_ADMIN,
  MAX_CONSULTAS_EXPORTACION,
  DIAS_PERIODO_POR_DEFECTO,
} from "../../constants";

const NIVELES_URGENCIA = Object.values(NivelUrgencia);
const ESTADOS_CONSULTA = Object.values(EstadoConsulta);

function parsearId(valor: string, nombre = "ID de usuario"): number {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw badRequest(`${nombre} inválido`);
  return id;
}

/** Entero opcional de la query (?pagina=2). Fuera de rango → 400. */
function parsearEnteroQuery(
  valor: unknown,
  nombre: string,
  porDefecto: number,
  max: number,
): number {
  if (valor === undefined || valor === "") return porDefecto;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1 || numero > max) {
    throw badRequest(`"${nombre}" debe ser un número entero entre 1 y ${max}`);
  }
  return numero;
}

/** Valida que un filtro de la query sea uno de los valores del enum */
function parsearOpcion<T extends string>(
  valor: unknown,
  opciones: readonly T[],
  nombre: string,
): T | undefined {
  if (valor === undefined || valor === "") return undefined;
  if (typeof valor !== "string" || !opciones.includes(valor as T)) {
    throw badRequest(`"${nombre}" debe ser uno de: ${opciones.join(", ")}`);
  }
  return valor as T;
}

function auditorDe(req: Request): Auditor {
  return {
    idAdmin: (req as AuthenticatedRequest).usuario.id_usuario,
    ip: req.ip ?? "desconocida",
  };
}

export async function dashboard(_req: Request, res: Response) {
  const metrics = await getDashboardMetrics();
  res.json(ok(metrics));
}

/** GET /admin/consultas?desde&hasta&urgencia&estado&pagina&porPagina (HU-031, HU-068) */
export async function consultas(req: Request, res: Response) {
  const { desde, hasta, urgencia, estado, pagina, porPagina } = req.query;
  const data = await listarConsultas({
    fecha: parsearRangoFechas(desde, hasta),
    urgencia: parsearOpcion(urgencia, NIVELES_URGENCIA, "urgencia"),
    estado: parsearOpcion(estado, ESTADOS_CONSULTA, "estado"),
    pagina: parsearEnteroQuery(pagina, "pagina", 1, Number.MAX_SAFE_INTEGER),
    // Exportar CSV/PDF pide todas las filas filtradas de una vez, con un tope
    porPagina: parsearEnteroQuery(porPagina, "porPagina", MAX_CONSULTAS_RECIENTES_ADMIN, MAX_CONSULTAS_EXPORTACION),
  });
  res.json(ok(data));
}

/** GET /admin/consultas/:id — detalle completo, queda en auditoría */
export async function detalleConsulta(req: Request, res: Response) {
  const idConsulta = parsearId(req.params.id, "ID de consulta");
  res.json(ok(await getDetalleConsulta(idConsulta, auditorDe(req))));
}

/** GET /admin/usuarios/:id/consultas?desde&hasta (HU-026) */
export async function historialUsuario(req: Request, res: Response) {
  const idUsuario = parsearId(req.params.id);
  const fecha = parsearRangoFechas(req.query.desde, req.query.hasta);
  res.json(ok(await getHistorialUsuario(idUsuario, fecha, auditorDe(req))));
}

/** GET /admin/ranking-medicos?desde&hasta — por defecto, el último mes (HU-069) */
export async function rankingMedicos(req: Request, res: Response) {
  const fecha = parsearRangoFechas(req.query.desde, req.query.hasta, DIAS_PERIODO_POR_DEFECTO);
  const medicos = await getRankingMedicos(fecha);
  res.json(ok({ ...periodoDe(fecha), medicos }));
}

/** Devuelve el período aplicado en AAAA-MM-DD, para mostrarlo en pantalla */
function periodoDe(fecha: { gte?: Date; lt?: Date }) {
  const ultimoDia = fecha.lt ? new Date(fecha.lt.getTime() - 1) : undefined;
  return {
    desde: fecha.gte ? formatearFechaLocal(fecha.gte) : null,
    hasta: ultimoDia ? formatearFechaLocal(ultimoDia) : null,
  };
}

export async function usuarios(_req: Request, res: Response) {
  const data = await getUsuarios();
  res.json(ok(data));
}

export async function cambiarEstado(req: Request, res: Response) {
  const idUsuario = parsearId(req.params.id);
  const activo = req.body?.activo;
  if (typeof activo !== "boolean")
    throw badRequest('El campo "activo" debe ser true o false');

  const idAdmin = (req as AuthenticatedRequest).usuario.id_usuario;
  const usuario = await cambiarEstadoUsuario(idUsuario, activo, idAdmin);
  res.json(ok(usuario));
}

export async function configuracion(_req: Request, res: Response) {
  const data = await getConfiguracion();
  res.json(ok(data));
}

export async function actualizarConfiguracion(req: Request, res: Response) {
  const { clave, valor } = req.body ?? {};
  if (typeof clave !== "string" || !clave.trim() || valor === undefined) {
    throw badRequest('Envía "clave" y "valor"');
  }
  const config = await setConfiguracion(clave.trim(), String(valor).trim());
  res.json(ok(config));
}

export async function estadisticas(_req: Request, res: Response) {
  res.json(ok(await getEstadisticas()));
}
