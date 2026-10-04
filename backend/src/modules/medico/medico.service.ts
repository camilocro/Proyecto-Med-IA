import prisma from '../../config/prisma'
import { notFound } from '../../errors/AppError'

const INCLUDE_MEDICO = {
  usuario:      { select: { nombre: true } },
  especialidad: true,
  centro_salud: true,
} as const

export async function getMedicosPorEspecialidad(idEspecialidad: number) {
  return prisma.medico.findMany({
    where:   { id_especialidad: idEspecialidad, disponible: true },
    include: INCLUDE_MEDICO,
  })
}

export async function getPerfilMedico(idUsuario: number) {
  const medico = await prisma.medico.findUnique({
    where:   { id_usuario: idUsuario },
    include: INCLUDE_MEDICO,
  })
  if (!medico) throw notFound('Perfil de médico')
  return medico
}

export async function actualizarPerfilMedico(
  idUsuario: number,
  data: { descripcion_profesional?: string; telefono_contacto?: string; foto_url?: string },
) {
  return prisma.medico.update({
    where: { id_usuario: idUsuario },
    data,
  })
}

export async function cambiarDisponibilidad(idUsuario: number, disponible: boolean) {
  return prisma.medico.update({
    where: { id_usuario: idUsuario },
    data:  { disponible },
  })
}

export async function listarMedicos() {
  return prisma.medico.findMany({ include: INCLUDE_MEDICO })
}
