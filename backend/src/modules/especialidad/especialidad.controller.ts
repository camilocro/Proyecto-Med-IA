import { Request, Response } from 'express'
import {
  listarEspecialidades,
  crearEspecialidad,
  actualizarEspecialidad,
  desactivarEspecialidad,
  DatosEspecialidad,
} from './especialidad.service'
import { ok } from '../../shared/types'
import { badRequest } from '../../errors/AppError'
import {
  MIN_LONGITUD_NOMBRE,
  MAX_LONGITUD_NOMBRE_ESPECIALIDAD,
  MIN_LONGITUD_DESCRIPCION_ESPECIALIDAD,
  MAX_LONGITUD_DESCRIPCION_ESPECIALIDAD,
} from '../../constants'

// ─── Validaciones de entrada ──────────────────────────────────────────────────

function parsearId(valor: string): number {
  const id = Number(valor)
  if (!Number.isInteger(id) || id <= 0) throw badRequest('ID de especialidad inválido')
  return id
}

function validarNombre(valor: unknown): string {
  if (typeof valor !== 'string' || !valor.trim()) throw badRequest('El nombre de la especialidad es obligatorio')
  const nombre = valor.trim().replace(/\s+/g, ' ')
  if (nombre.length < MIN_LONGITUD_NOMBRE || nombre.length > MAX_LONGITUD_NOMBRE_ESPECIALIDAD) {
    throw badRequest(`El nombre debe tener entre ${MIN_LONGITUD_NOMBRE} y ${MAX_LONGITUD_NOMBRE_ESPECIALIDAD} caracteres`)
  }
  return nombre
}

function validarDescripcion(valor: unknown): string {
  if (typeof valor !== 'string' || !valor.trim()) throw badRequest('La descripción de la especialidad es obligatoria')
  const descripcion = valor.trim()
  if (descripcion.length < MIN_LONGITUD_DESCRIPCION_ESPECIALIDAD || descripcion.length > MAX_LONGITUD_DESCRIPCION_ESPECIALIDAD) {
    throw badRequest(
      `La descripción debe tener entre ${MIN_LONGITUD_DESCRIPCION_ESPECIALIDAD} y ${MAX_LONGITUD_DESCRIPCION_ESPECIALIDAD} caracteres`,
    )
  }
  return descripcion
}

function validarCambios(body: unknown): DatosEspecialidad {
  const { nombre, descripcion } = (body ?? {}) as Record<string, unknown>
  const cambios: DatosEspecialidad = {}
  if (nombre !== undefined)      cambios.nombre      = validarNombre(nombre)
  if (descripcion !== undefined) cambios.descripcion = validarDescripcion(descripcion)
  if (cambios.nombre === undefined && cambios.descripcion === undefined) {
    throw badRequest('Envía al menos un campo para actualizar: nombre o descripcion')
  }
  return cambios
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function listar(_req: Request, res: Response) {
  const especialidades = await listarEspecialidades()
  res.json(ok(especialidades))
}

export async function crear(req: Request, res: Response) {
  const { nombre, descripcion } = (req.body ?? {}) as Record<string, unknown>
  const especialidad            = await crearEspecialidad(validarNombre(nombre), validarDescripcion(descripcion))
  res.status(201).json(ok(especialidad))
}

export async function actualizar(req: Request, res: Response) {
  const especialidad = await actualizarEspecialidad(parsearId(req.params.id), validarCambios(req.body))
  res.json(ok(especialidad))
}

export async function desactivar(req: Request, res: Response) {
  const { medicosVinculados } = await desactivarEspecialidad(parsearId(req.params.id))
  res.json(ok({ message: 'Especialidad desactivada', medicosVinculados }))
}
