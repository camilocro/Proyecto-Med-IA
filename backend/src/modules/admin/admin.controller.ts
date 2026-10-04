import { Request, Response } from 'express'
import {
  getDashboardMetrics,
  getConsultasRecientes,
  getUsuarios,
  cambiarEstadoUsuario,
  getConfiguracion,
  setConfiguracion,
} from './admin.service'
import { ok } from '../../shared/types'

export async function dashboard(_req: Request, res: Response) {
  const metrics = await getDashboardMetrics()
  res.json(ok(metrics))
}

export async function consultas(_req: Request, res: Response) {
  const data = await getConsultasRecientes()
  res.json(ok(data))
}

export async function usuarios(_req: Request, res: Response) {
  const data = await getUsuarios()
  res.json(ok(data))
}

export async function cambiarEstado(req: Request, res: Response) {
  const usuario = await cambiarEstadoUsuario(parseInt(req.params.id), req.body.activo)
  res.json(ok(usuario))
}

export async function configuracion(_req: Request, res: Response) {
  const data = await getConfiguracion()
  res.json(ok(data))
}

export async function actualizarConfiguracion(req: Request, res: Response) {
  const config = await setConfiguracion(req.body.clave, req.body.valor)
  res.json(ok(config))
}
