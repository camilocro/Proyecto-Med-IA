import { Request, Response } from "express";
import {
  getDashboardMetrics,
  getConsultasRecientes,
  getUsuarios,
  cambiarEstadoUsuario,
  getConfiguracion,
  setConfiguracion,
  getEstadisticas,
} from "./admin.service";
import { ok, AuthenticatedRequest } from "../../shared/types";
import { badRequest } from "../../errors/AppError";

function parsearId(valor: string): number {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0)
    throw badRequest("ID de usuario inválido");
  return id;
}

export async function dashboard(_req: Request, res: Response) {
  const metrics = await getDashboardMetrics();
  res.json(ok(metrics));
}

export async function consultas(_req: Request, res: Response) {
  const data = await getConsultasRecientes();
  res.json(ok(data));
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
