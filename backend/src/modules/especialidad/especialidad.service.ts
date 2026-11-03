import prisma from '../../config/prisma'
import { notFound, conflict } from '../../errors/AppError'

// HU-022 CA-3: cantidad de médicos asignados a cada especialidad
const CONTEO_MEDICOS = { _count: { select: { medicos: true } } } as const

export interface DatosEspecialidad {
  nombre?:      string
  descripcion?: string
}

/** Busca otra especialidad con el mismo nombre sin distinguir mayúsculas ("neurología" = "Neurología"). */
async function buscarPorNombre(nombre: string) {
  return prisma.especialidad.findFirst({
    where: { nombre: { equals: nombre, mode: 'insensitive' } },
  })
}

async function obtenerEspecialidad(idEspecialidad: number) {
  const especialidad = await prisma.especialidad.findUnique({ where: { id_especialidad: idEspecialidad } })
  if (!especialidad) throw notFound('Especialidad')
  return especialidad
}

export async function listarEspecialidades() {
  return prisma.especialidad.findMany({
    where:   { activo: true },
    orderBy: { nombre: 'asc' },
    include: CONTEO_MEDICOS,
  })
}

/**
 * HU-023: crea una especialidad con nombre único.
 * Si existía con ese nombre pero estaba desactivada, se reactiva con la nueva descripción
 * en lugar de rechazarla (el nombre es único en la base de datos).
 */
export async function crearEspecialidad(nombre: string, descripcion: string) {
  const existente = await buscarPorNombre(nombre)

  if (existente?.activo) throw conflict(`Ya existe una especialidad con el nombre "${existente.nombre}"`)

  if (existente) {
    return prisma.especialidad.update({
      where:   { id_especialidad: existente.id_especialidad },
      data:    { nombre, descripcion, activo: true },
      include: CONTEO_MEDICOS,
    })
  }

  return prisma.especialidad.create({ data: { nombre, descripcion }, include: CONTEO_MEDICOS })
}

export async function actualizarEspecialidad(idEspecialidad: number, data: DatosEspecialidad) {
  await obtenerEspecialidad(idEspecialidad)

  if (data.nombre !== undefined) {
    const otra = await buscarPorNombre(data.nombre)
    if (otra && otra.id_especialidad !== idEspecialidad) {
      throw conflict(`Ya existe una especialidad con el nombre "${otra.nombre}"`)
    }
  }

  return prisma.especialidad.update({
    where:   { id_especialidad: idEspecialidad },
    data,
    include: CONTEO_MEDICOS,
  })
}

/**
 * HU-062: la especialidad deja de ofrecerse en el sistema y en la derivación de la IA (CA-4).
 * El esquema exige que cada médico tenga especialidad, así que los médicos vinculados
 * conservan el vínculo y el administrador debe reasignarlos desde la gestión de médicos.
 */
export async function desactivarEspecialidad(idEspecialidad: number) {
  await obtenerEspecialidad(idEspecialidad)

  const medicosVinculados = await prisma.medico.count({ where: { id_especialidad: idEspecialidad } })
  await prisma.especialidad.update({ where: { id_especialidad: idEspecialidad }, data: { activo: false } })

  return { medicosVinculados }
}
