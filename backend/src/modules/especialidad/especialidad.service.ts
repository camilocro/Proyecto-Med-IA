import prisma from '../../config/prisma'
import { notFound, conflict } from '../../errors/AppError'

export async function listarEspecialidades() {
  return prisma.especialidad.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } })
}

export async function crearEspecialidad(nombre: string, descripcion: string) {
  const existente = await prisma.especialidad.findUnique({ where: { nombre } })
  if (existente) throw conflict(`Ya existe una especialidad con el nombre "${nombre}"`)
  return prisma.especialidad.create({ data: { nombre, descripcion } })
}

export async function actualizarEspecialidad(idEspecialidad: number, data: { nombre?: string; descripcion?: string }) {
  const especialidad = await prisma.especialidad.findUnique({ where: { id_especialidad: idEspecialidad } })
  if (!especialidad) throw notFound('Especialidad')
  return prisma.especialidad.update({ where: { id_especialidad: idEspecialidad }, data })
}

export async function desactivarEspecialidad(idEspecialidad: number) {
  const especialidad = await prisma.especialidad.findUnique({ where: { id_especialidad: idEspecialidad } })
  if (!especialidad) throw notFound('Especialidad')
  return prisma.especialidad.update({ where: { id_especialidad: idEspecialidad }, data: { activo: false } })
}
