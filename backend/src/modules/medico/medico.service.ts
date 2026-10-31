import { randomInt } from 'crypto'
import bcrypt from 'bcryptjs'
import prisma from '../../config/prisma'
import { badRequest, conflict, notFound } from '../../errors/AppError'
import { SALT_ROUNDS, LONGITUD_PASSWORD_TEMPORAL } from '../../constants'

const INCLUDE_MEDICO = {
  usuario:      { select: { nombre: true } },
  especialidad: true,
  centro_salud: true,
} as const

// Vista del administrador: incluye correo y estado de la cuenta (nunca el password_hash)
const INCLUDE_MEDICO_ADMIN = {
  usuario:      { select: { id_usuario: true, nombre: true, correo: true, activo: true } },
  especialidad: true,
  centro_salud: true,
} as const

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DatosNuevoMedico {
  nombre:                  string
  correo:                  string
  id_especialidad:         number
  id_centro_salud:         number
  descripcion_profesional: string
  telefono_contacto:       string
}

export type CambiosMedico = Partial<DatosNuevoMedico>

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Sin caracteres ambiguos (0/O, 1/l/I) para que el admin pueda dictarla sin errores
const LETRAS  = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
const DIGITOS = '23456789'

/** Contraseña temporal aleatoria que cumple la regla del sistema (letras y números). */
function generarPasswordTemporal(): string {
  const caracteres = [
    LETRAS[randomInt(LETRAS.length)],
    DIGITOS[randomInt(DIGITOS.length)],
  ]
  const alfabeto = LETRAS + DIGITOS
  while (caracteres.length < LONGITUD_PASSWORD_TEMPORAL) {
    caracteres.push(alfabeto[randomInt(alfabeto.length)])
  }
  // Mezcla Fisher-Yates para que la letra y el dígito garantizados no queden siempre al inicio
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]]
  }
  return caracteres.join('')
}

async function obtenerMedicoAdmin(idMedico: number) {
  const medico = await prisma.medico.findUnique({
    where:   { id_medico: idMedico },
    include: INCLUDE_MEDICO_ADMIN,
  })
  if (!medico) throw notFound('Médico')
  return medico
}

async function validarEspecialidadActiva(idEspecialidad: number) {
  const especialidad = await prisma.especialidad.findUnique({ where: { id_especialidad: idEspecialidad } })
  if (!especialidad || !especialidad.activo) {
    throw badRequest('La especialidad seleccionada no existe o está desactivada')
  }
}

async function validarCentroActivo(idCentro: number) {
  const centro = await prisma.centroSalud.findUnique({ where: { id_centro_salud: idCentro } })
  if (!centro || !centro.activo) {
    throw badRequest('El centro de salud seleccionado no existe o está desactivado')
  }
}

async function validarCorreoLibre(correo: string, idUsuarioActual?: number) {
  const existente = await prisma.usuario.findUnique({ where: { correo } })
  if (existente && existente.id_usuario !== idUsuarioActual) {
    throw conflict('Ya existe una cuenta registrada con ese correo')
  }
}

// ─── Consultas públicas y del propio médico ───────────────────────────────────

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

// ─── Gestión por el administrador (HU-018 a HU-021) ───────────────────────────

export async function listarMedicos() {
  return prisma.medico.findMany({
    include: INCLUDE_MEDICO_ADMIN,
    orderBy: { usuario: { nombre: 'asc' } },
  })
}

export async function listarCentrosSalud() {
  return prisma.centroSalud.findMany({
    where:   { activo: true },
    orderBy: { nombre: 'asc' },
    select:  { id_centro_salud: true, nombre: true, direccion: true, zona: true },
  })
}

/**
 * HU-018: crea la cuenta del médico (rol "medico") y su perfil en una sola operación.
 * Como todavía no hay servicio de correo (CA-3), la contraseña temporal se devuelve
 * una única vez para que el administrador se la entregue al médico.
 */
export async function crearMedico(datos: DatosNuevoMedico) {
  await validarCorreoLibre(datos.correo)
  await validarEspecialidadActiva(datos.id_especialidad)
  await validarCentroActivo(datos.id_centro_salud)

  const passwordTemporal = generarPasswordTemporal()
  const passwordHash     = await bcrypt.hash(passwordTemporal, SALT_ROUNDS)

  const usuario = await prisma.usuario.create({
    data: {
      nombre:        datos.nombre,
      correo:        datos.correo,
      password_hash: passwordHash,
      rol:           'medico',
      medico: {
        create: {
          id_especialidad:         datos.id_especialidad,
          id_centro_salud:         datos.id_centro_salud,
          descripcion_profesional: datos.descripcion_profesional,
          telefono_contacto:       datos.telefono_contacto,
          disponible:              true, // CA-5: estado inicial "Disponible"
        },
      },
    },
    include: { medico: true },
  })

  const medico = await obtenerMedicoAdmin(usuario.medico!.id_medico)
  return { medico, passwordTemporal }
}

/** HU-019: edita datos personales, de contacto y la especialidad del médico. */
export async function actualizarMedico(idMedico: number, cambios: CambiosMedico) {
  const actual = await obtenerMedicoAdmin(idMedico)

  if (cambios.correo !== undefined)          await validarCorreoLibre(cambios.correo, actual.usuario.id_usuario)
  if (cambios.id_especialidad !== undefined) await validarEspecialidadActiva(cambios.id_especialidad)
  if (cambios.id_centro_salud !== undefined) await validarCentroActivo(cambios.id_centro_salud)

  const { nombre, correo, ...datosMedico } = cambios

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id_usuario: actual.usuario.id_usuario },
      data:  { nombre, correo },
    }),
    prisma.medico.update({
      where: { id_medico: idMedico },
      data:  datosMedico,
    }),
  ])

  return obtenerMedicoAdmin(idMedico)
}

/**
 * HU-020: desactivar bloquea el acceso del médico y lo saca de las sugerencias.
 * Reactivar lo devuelve a "Disponible" (CA-3). El historial de consultas no se toca (CA-4).
 */
export async function cambiarEstadoMedico(idMedico: number, activo: boolean) {
  const actual = await obtenerMedicoAdmin(idMedico)

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id_usuario: actual.usuario.id_usuario },
      data:  { activo },
    }),
    prisma.medico.update({
      where: { id_medico: idMedico },
      data:  { disponible: activo },
    }),
  ])

  return obtenerMedicoAdmin(idMedico)
}
