import { Request, Response } from 'express'
import {
  getMedicosPorEspecialidad,
  getPerfilMedico,
  actualizarPerfilMedico,
  cambiarDisponibilidad,
  listarMedicos,
  listarCentrosSalud,
  crearMedico,
  actualizarMedico,
  cambiarEstadoMedico,
  DatosNuevoMedico,
  CambiosMedico,
} from './medico.service'
import { ok, AuthenticatedRequest } from '../../shared/types'
import { badRequest } from '../../errors/AppError'
import {
  MIN_LONGITUD_NOMBRE,
  MAX_LONGITUD_NOMBRE,
  MIN_LONGITUD_DESCRIPCION_MEDICO,
  MAX_LONGITUD_DESCRIPCION_MEDICO,
  MIN_LONGITUD_TELEFONO,
  MAX_LONGITUD_TELEFONO,
} from '../../constants'

// ─── Validaciones de entrada ──────────────────────────────────────────────────

const REGEX_CORREO   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const REGEX_TELEFONO = /^\+?[0-9\s-]+$/

function parsearId(valor: unknown, nombre: string): number {
  const id = Number(valor)
  if (!Number.isInteger(id) || id <= 0) throw badRequest(`${nombre} inválido`)
  return id
}

function validarTexto(valor: unknown, campo: string, min: number, max: number): string {
  if (typeof valor !== 'string' || !valor.trim()) throw badRequest(`El campo "${campo}" es obligatorio`)
  const limpio = valor.trim()
  if (limpio.length < min || limpio.length > max) {
    throw badRequest(`El campo "${campo}" debe tener entre ${min} y ${max} caracteres`)
  }
  return limpio
}

function validarCorreo(valor: unknown): string {
  if (typeof valor !== 'string' || !valor.trim()) throw badRequest('El campo "correo" es obligatorio')
  const correo = valor.trim()
  if (!REGEX_CORREO.test(correo)) throw badRequest('El correo electrónico no es válido')
  return correo
}

function validarTelefono(valor: unknown): string {
  const telefono = validarTexto(valor, 'teléfono', MIN_LONGITUD_TELEFONO, MAX_LONGITUD_TELEFONO)
  if (!REGEX_TELEFONO.test(telefono)) throw badRequest('El teléfono solo puede contener números, espacios, guiones y "+"')
  return telefono
}

/** Valida un campo solo si viene en el body (para ediciones parciales). */
function siViene<T>(body: Record<string, unknown>, clave: string, validar: (v: unknown) => T): T | undefined {
  return body[clave] === undefined ? undefined : validar(body[clave])
}

function validarNuevoMedico(body: unknown): DatosNuevoMedico {
  const datos = (body ?? {}) as Record<string, unknown>
  if (datos.id_especialidad === undefined || datos.id_especialidad === null || datos.id_especialidad === '') {
    throw badRequest('Selecciona la especialidad del médico') // HU-018 CA-2
  }
  if (datos.id_centro_salud === undefined || datos.id_centro_salud === null || datos.id_centro_salud === '') {
    throw badRequest('Selecciona el centro de salud del médico')
  }
  return {
    nombre:                  validarTexto(datos.nombre, 'nombre', MIN_LONGITUD_NOMBRE, MAX_LONGITUD_NOMBRE),
    correo:                  validarCorreo(datos.correo),
    id_especialidad:         parsearId(datos.id_especialidad, 'ID de especialidad'),
    id_centro_salud:         parsearId(datos.id_centro_salud, 'ID de centro de salud'),
    descripcion_profesional: validarTexto(datos.descripcion_profesional, 'descripción profesional', MIN_LONGITUD_DESCRIPCION_MEDICO, MAX_LONGITUD_DESCRIPCION_MEDICO),
    telefono_contacto:       validarTelefono(datos.telefono_contacto),
  }
}

function validarCambiosMedico(body: unknown): CambiosMedico {
  const datos = (body ?? {}) as Record<string, unknown>
  const cambios: CambiosMedico = {
    nombre:                  siViene(datos, 'nombre', (v) => validarTexto(v, 'nombre', MIN_LONGITUD_NOMBRE, MAX_LONGITUD_NOMBRE)),
    correo:                  siViene(datos, 'correo', validarCorreo),
    id_especialidad:         siViene(datos, 'id_especialidad', (v) => parsearId(v, 'ID de especialidad')),
    id_centro_salud:         siViene(datos, 'id_centro_salud', (v) => parsearId(v, 'ID de centro de salud')),
    descripcion_profesional: siViene(datos, 'descripcion_profesional', (v) => validarTexto(v, 'descripción profesional', MIN_LONGITUD_DESCRIPCION_MEDICO, MAX_LONGITUD_DESCRIPCION_MEDICO)),
    telefono_contacto:       siViene(datos, 'telefono_contacto', validarTelefono),
  }
  if (Object.values(cambios).every((v) => v === undefined)) {
    throw badRequest('Envía al menos un campo para actualizar')
  }
  return cambios
}

// ─── Handlers públicos y del propio médico ────────────────────────────────────

export async function porEspecialidad(req: Request, res: Response) {
  const medicos = await getMedicosPorEspecialidad(parsearId(req.params.idEspecialidad, 'ID de especialidad'))
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

// ─── Handlers del administrador ───────────────────────────────────────────────

export async function listar(_req: Request, res: Response) {
  const medicos = await listarMedicos()
  res.json(ok(medicos))
}

export async function centros(_req: Request, res: Response) {
  const centrosSalud = await listarCentrosSalud()
  res.json(ok(centrosSalud))
}

export async function crear(req: Request, res: Response) {
  const resultado = await crearMedico(validarNuevoMedico(req.body))
  res.status(201).json(ok(resultado))
}

export async function actualizar(req: Request, res: Response) {
  const idMedico = parsearId(req.params.id, 'ID de médico')
  const medico   = await actualizarMedico(idMedico, validarCambiosMedico(req.body))
  res.json(ok(medico))
}

export async function cambiarEstado(req: Request, res: Response) {
  const idMedico = parsearId(req.params.id, 'ID de médico')
  const activo   = req.body?.activo
  if (typeof activo !== 'boolean') throw badRequest('El campo "activo" debe ser true o false')

  const medico = await cambiarEstadoMedico(idMedico, activo)
  res.json(ok(medico))
}
