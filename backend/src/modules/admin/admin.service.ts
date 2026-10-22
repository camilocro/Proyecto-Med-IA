import prisma from "../../config/prisma";
import { badRequest, notFound } from "../../errors/AppError";
import { getTodayRange } from "../../shared/fechas";
import {
  CONFIG_KEY_DAILY_LIMIT,
  MAX_CONSULTAS_RECIENTES_ADMIN,
} from "../../constants";

// Campos seguros del usuario: nunca se devuelve el password_hash
const SELECT_USUARIO_PUBLICO = {
  id_usuario: true,
  nombre: true,
  correo: true,
  rol: true,
  activo: true,
  created_at: true,
} as const;

export async function getDashboardMetrics() {
  const { start, end } = getTodayRange();
  const hoy = { gte: start, lt: end };

  const [consultasHoy, urgenciasAltas, medicosActivos, usuariosRegistrados] =
    await Promise.all([
      prisma.consulta.count({ where: { fecha_consulta: hoy } }),
      prisma.consulta.count({
        where: {
          nivel_urgencia: { in: ["alto", "emergencia"] },
          fecha_consulta: hoy,
        },
      }),
      prisma.medico.count({
        where: { disponible: true, usuario: { activo: true } },
      }),
      prisma.usuario.count({ where: { activo: true } }),
    ]);

  return { consultasHoy, urgenciasAltas, medicosActivos, usuariosRegistrados };
}

export async function getConsultasRecientes() {
  return prisma.consulta.findMany({
    orderBy: { fecha_consulta: "desc" },
    take: MAX_CONSULTAS_RECIENTES_ADMIN,
    include: {
      especialidad_sugerida: true,
      paciente: { include: { usuario: { select: { nombre: true } } } },
    },
  });
}

export async function getUsuarios() {
  return prisma.usuario.findMany({
    select: SELECT_USUARIO_PUBLICO,
    orderBy: { created_at: "desc" },
  });
}

export async function cambiarEstadoUsuario(
  idUsuario: number,
  activo: boolean,
  idAdmin: number,
) {
  if (idUsuario === idAdmin && !activo) {
    throw badRequest("No puedes desactivar tu propia cuenta");
  }

  const existe = await prisma.usuario.findUnique({
    where: { id_usuario: idUsuario },
  });
  if (!existe) throw notFound("Usuario");

  return prisma.usuario.update({
    where: { id_usuario: idUsuario },
    data: { activo },
    select: SELECT_USUARIO_PUBLICO,
  });
}

export async function getConfiguracion() {
  return prisma.configuracionSistema.findMany();
}

export async function setConfiguracion(clave: string, valor: string) {
  // HU-067 CA-2: el límite diario debe ser un entero mayor a 0
  if (clave === CONFIG_KEY_DAILY_LIMIT) {
    const limite = Number(valor);
    if (!Number.isInteger(limite) || limite < 1) {
      throw badRequest("El límite diario debe ser un número entero mayor a 0");
    }
  }

  return prisma.configuracionSistema.upsert({
    where: { clave },
    update: { valor },
    create: { clave, valor },
  });
}
