import prisma from '../../config/prisma'
import { notFound } from '../../errors/AppError'

const INCLUDE_CONSULTA_COMPLETA = {
  especialidad_sugerida: true,
  sintomas_extraidos:    true,
  rondas: {
    include: { preguntas: true },
  },
  medicos_sugeridos: {
    include: {
      medico: {
        include: {
          usuario:      { select: { nombre: true } },
          especialidad: true,
          centro_salud: true,
        },
      },
    },
  },
} as const

export async function getIdPacientePorUsuario(idUsuario: number): Promise<number | undefined> {
  const paciente = await prisma.paciente.findUnique({ where: { id_usuario: idUsuario } })
  return paciente?.id_paciente
}

export async function crearConsulta(descripcionSintomas: string, idPaciente?: number, sesionAnonimo?: string) {
  return prisma.consulta.create({
    data: {
      id_paciente:          idPaciente,
      sesion_anonimo:       idPaciente ? undefined : sesionAnonimo,
      descripcion_sintomas: descripcionSintomas,
      estado:               'en_proceso',
    },
  })
  // TODO: llamar iaService.analizarSintomas y crear primera ronda de preguntas
}

export async function obtenerConsulta(idConsulta: number) {
  const consulta = await prisma.consulta.findUnique({
    where:   { id_consulta: idConsulta },
    include: INCLUDE_CONSULTA_COMPLETA,
  })
  if (!consulta) throw notFound('Consulta')
  return consulta
}

export async function guardarRespuestas(
  idConsulta: number,
  idRonda:    number,
  respuestas: { id_pr: number; respuesta: string }[],
) {
  // Verificar que la ronda pertenece a la consulta antes de guardar
  const ronda = await prisma.rondaPreguntas.findFirst({
    where: { id_ronda: idRonda, id_consulta: idConsulta },
  })
  if (!ronda) throw notFound('Ronda de preguntas')

  await prisma.$transaction(
    respuestas.map((r) =>
      prisma.preguntaRespuesta.update({
        where: { id_pr: r.id_pr },
        data:  { respuesta: r.respuesta },
      })
    )
  )
  return obtenerConsulta(idConsulta)
  // TODO: llamar iaService para continuar el análisis con las respuestas de esta ronda
}

export async function cancelarConsulta(idConsulta: number) {
  const consulta = await prisma.consulta.findUnique({ where: { id_consulta: idConsulta } })
  if (!consulta) throw notFound('Consulta')

  return prisma.consulta.update({
    where: { id_consulta: idConsulta },
    data:  { estado: 'cancelada' },
  })
}

export async function obtenerHistorialPaciente(idUsuario: number) {
  const paciente = await prisma.paciente.findUnique({ where: { id_usuario: idUsuario } })
  if (!paciente) return []

  return prisma.consulta.findMany({
    where:   { id_paciente: paciente.id_paciente },
    orderBy: { fecha_consulta: 'desc' },
    include: { especialidad_sugerida: true },
  })
}
