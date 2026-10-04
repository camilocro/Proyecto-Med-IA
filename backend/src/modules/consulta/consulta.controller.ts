import { Request, Response } from 'express'
import {
  getIdPacientePorUsuario,
  crearConsulta,
  obtenerConsulta,
  guardarRespuestas,
  cancelarConsulta,
  obtenerHistorialPaciente,
} from './consulta.service'
import { ok, AuthenticatedRequest } from '../../shared/types'

export async function iniciar(req: Request, res: Response) {
  const { descripcion_sintomas } = req.body
  const usuario                  = (req as AuthenticatedRequest).usuario
  const sesionAnonimo            = req.headers['x-session-id'] as string | undefined

  const idPaciente = usuario
    ? await getIdPacientePorUsuario(usuario.id_usuario)
    : undefined

  const consulta = await crearConsulta(descripcion_sintomas, idPaciente, sesionAnonimo)
  res.status(201).json(ok(consulta))
}

export async function obtener(req: Request, res: Response) {
  const consulta = await obtenerConsulta(parseInt(req.params.id))
  res.json(ok(consulta))
}

export async function responderRonda(req: Request, res: Response) {
  const idConsulta = parseInt(req.params.id)
  const idRonda    = parseInt(req.params.idRonda)
  const consulta   = await guardarRespuestas(idConsulta, idRonda, req.body.respuestas)
  res.json(ok(consulta))
}

export async function cancelar(req: Request, res: Response) {
  const consulta = await cancelarConsulta(parseInt(req.params.id))
  res.json(ok(consulta))
}

export async function historial(req: Request, res: Response) {
  const usuario  = (req as AuthenticatedRequest).usuario
  const consultas = await obtenerHistorialPaciente(usuario.id_usuario)
  res.json(ok(consultas))
}
