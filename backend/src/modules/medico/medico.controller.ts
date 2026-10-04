import { Request, Response } from 'express'
import {
  getMedicosPorEspecialidad,
  getPerfilMedico,
  actualizarPerfilMedico,
  cambiarDisponibilidad,
  listarMedicos,
} from './medico.service'
import { ok, AuthenticatedRequest } from '../../shared/types'

export async function porEspecialidad(req: Request, res: Response) {
  const medicos = await getMedicosPorEspecialidad(parseInt(req.params.idEspecialidad))
  res.json(ok(medicos))
}

export async function miPerfil(req: Request, res: Response) {
  const { id_usuario } = (req as AuthenticatedRequest).usuario
  const perfil         = await getPerfilMedico(id_usuario)
  res.json(ok(perfil))
}

export async function actualizarPerfil(req: Request, res: Response) {
  const { id_usuario } = (req as AuthenticatedRequest).usuario
  const medico         = await actualizarPerfilMedico(id_usuario, req.body)
  res.json(ok(medico))
}

export async function toggleDisponibilidad(req: Request, res: Response) {
  const { id_usuario } = (req as AuthenticatedRequest).usuario
  const medico         = await cambiarDisponibilidad(id_usuario, req.body.disponible)
  res.json(ok(medico))
}

export async function listar(req: Request, res: Response) {
  const medicos = await listarMedicos()
  res.json(ok(medicos))
}
