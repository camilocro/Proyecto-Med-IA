import { Request, Response } from 'express'
import { listarEspecialidades, crearEspecialidad, actualizarEspecialidad, desactivarEspecialidad } from './especialidad.service'
import { ok } from '../../shared/types'

export async function listar(_req: Request, res: Response) {
  const especialidades = await listarEspecialidades()
  res.json(ok(especialidades))
}

export async function crear(req: Request, res: Response) {
  const { nombre, descripcion } = req.body
  const especialidad            = await crearEspecialidad(nombre, descripcion)
  res.status(201).json(ok(especialidad))
}

export async function actualizar(req: Request, res: Response) {
  const especialidad = await actualizarEspecialidad(parseInt(req.params.id), req.body)
  res.json(ok(especialidad))
}

export async function desactivar(req: Request, res: Response) {
  await desactivarEspecialidad(parseInt(req.params.id))
  res.json(ok({ message: 'Especialidad desactivada' }))
}
