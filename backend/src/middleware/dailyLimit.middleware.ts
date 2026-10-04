import { Request, Response, NextFunction } from 'express'
import prisma from '../config/prisma'
import { tooManyRequest } from '../errors/AppError'
import { DEFAULT_DAILY_LIMIT, CONFIG_KEY_DAILY_LIMIT } from '../constants'
import { AuthenticatedRequest } from '../shared/types'

async function getDailyLimit(): Promise<number> {
  const config = await prisma.configuracionSistema.findUnique({
    where: { clave: CONFIG_KEY_DAILY_LIMIT },
  })
  return config ? parseInt(config.valor) : DEFAULT_DAILY_LIMIT
}

function getTodayRange(): { start: Date; end: Date } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

async function countConsultasRegistrado(idPaciente: number, start: Date, end: Date): Promise<number> {
  return prisma.consulta.count({
    where: {
      id_paciente:    idPaciente,
      fecha_consulta: { gte: start, lt: end },
      estado:         { not: 'cancelada' },
    },
  })
}

async function countConsultasAnonimo(sesionId: string, start: Date): Promise<number> {
  const registro = await prisma.limiteConsultaAnonimo.findFirst({
    where: { sesion_id: sesionId, fecha: start },
  })
  return registro?.cantidad ?? 0
}

/**
 * Controla que ningún usuario (registrado o anónimo) supere
 * el límite diario de consultas definido en ConfiguracionSistema.
 */
export async function checkDailyLimit(req: Request, _res: Response, next: NextFunction) {
  const limite            = await getDailyLimit()
  const { start, end }    = getTodayRange()
  const usuario           = (req as AuthenticatedRequest).usuario

  if (usuario) {
    const paciente = await prisma.paciente.findUnique({
      where: { id_usuario: usuario.id_usuario },
    })
    if (paciente) {
      const cantidad = await countConsultasRegistrado(paciente.id_paciente, start, end)
      if (cantidad >= limite) return next(tooManyRequest(`Límite de ${limite} consultas diarias alcanzado`))
    }
  } else {
    const sesionId = (req.headers['x-session-id'] as string) ?? req.ip ?? 'sin-sesion'
    const cantidad = await countConsultasAnonimo(sesionId, start)
    if (cantidad >= limite) return next(tooManyRequest(`Límite de ${limite} consultas diarias alcanzado`))
  }

  next()
}
