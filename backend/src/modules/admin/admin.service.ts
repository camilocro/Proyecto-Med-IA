import prisma from '../../config/prisma'

function getTodayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

export async function getDashboardMetrics() {
  const { start, end } = getTodayRange()

  const [consultasHoy, urgenciasAltas, medicosActivos, usuariosRegistrados] = await Promise.all([
    prisma.consulta.count({ where: { fecha_consulta: { gte: start, lt: end } } }),
    prisma.consulta.count({ where: { nivel_urgencia: 'alto', fecha_consulta: { gte: start, lt: end } } }),
    prisma.medico.count({ where: { disponible: true } }),
    prisma.usuario.count({ where: { activo: true } }),
  ])

  return { consultasHoy, urgenciasAltas, medicosActivos, usuariosRegistrados }
}

export async function getConsultasRecientes(limit = 50) {
  return prisma.consulta.findMany({
    orderBy: { fecha_consulta: 'desc' },
    take:    limit,
    include: {
      especialidad_sugerida: true,
      paciente:              { include: { usuario: { select: { nombre: true } } } },
    },
  })
}

export async function getUsuarios() {
  return prisma.usuario.findMany({
    select: { id_usuario: true, nombre: true, correo: true, rol: true, activo: true, created_at: true },
    orderBy: { created_at: 'desc' },
  })
}

export async function cambiarEstadoUsuario(idUsuario: number, activo: boolean) {
  return prisma.usuario.update({
    where: { id_usuario: idUsuario },
    data:  { activo },
  })
}

export async function getConfiguracion() {
  return prisma.configuracionSistema.findMany()
}

export async function setConfiguracion(clave: string, valor: string) {
  return prisma.configuracionSistema.upsert({
    where:  { clave },
    update: { valor },
    create: { clave, valor },
  })
}
