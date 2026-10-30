import prisma from "../../config/prisma";
import { badRequest, notFound } from "../../errors/AppError";
import { getTodayRange } from "../../shared/fechas";
import {
  CONFIG_KEY_DAILY_LIMIT,
  MAX_CONSULTAS_RECIENTES_ADMIN,
  DIAS_GRAFICO_CONSULTAS,
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

// ─── Estadísticas del panel (HU-032) ─────────────────────────────────────────

/** 'YYYY-MM-DD' en hora local del servidor (la misma que usa el límite diario) */
function claveDia(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export async function getEstadisticas() {
  const { start: hoy, end: manana } = getTodayRange();
  const desde = new Date(hoy);
  desde.setDate(desde.getDate() - (DIAS_GRAFICO_CONSULTAS - 1));

  const [
    consultasRecientes,
    porEspecialidadAgrupado,
    especialidades,
    usuariosNuevosSemana,
    especialidadesConMedicos,
  ] = await Promise.all([
    prisma.consulta.findMany({
      where: { fecha_consulta: { gte: desde, lt: manana } },
      select: { fecha_consulta: true },
    }),
    prisma.consulta.groupBy({
      by: ["id_especialidad_sugerida"],
      where: { id_especialidad_sugerida: { not: null } },
      _count: { _all: true },
    }),
    prisma.especialidad.findMany({
      select: { id_especialidad: true, nombre: true },
    }),
    prisma.usuario.count({ where: { created_at: { gte: desde, lt: manana } } }),
    prisma.especialidad.count({
      where: {
        activo: true,
        medicos: { some: { disponible: true, usuario: { activo: true } } },
      },
    }),
  ]);

  // Consultas por día: todos los días del rango, también los que tienen 0
  const conteoPorDia = new Map<string, number>();
  for (let i = 0; i < DIAS_GRAFICO_CONSULTAS; i++) {
    const dia = new Date(desde);
    dia.setDate(dia.getDate() + i);
    conteoPorDia.set(claveDia(dia), 0);
  }
  for (const { fecha_consulta } of consultasRecientes) {
    const clave = claveDia(fecha_consulta);
    if (conteoPorDia.has(clave))
      conteoPorDia.set(clave, conteoPorDia.get(clave)! + 1);
  }
  const consultasPorDia = Array.from(conteoPorDia, ([fecha, total]) => ({
    fecha,
    total,
  }));

  // Distribución por especialidad, de mayor a menor
  const nombres = new Map(
    especialidades.map((e) => [e.id_especialidad, e.nombre]),
  );
  const totalConEspecialidad = porEspecialidadAgrupado.reduce(
    (suma, g) => suma + g._count._all,
    0,
  );
  const porEspecialidad = porEspecialidadAgrupado
    .map((g) => ({
      nombre: nombres.get(g.id_especialidad_sugerida!) ?? "Sin nombre",
      cantidad: g._count._all,
      porcentaje:
        Math.round((g._count._all / totalConEspecialidad) * 1000) / 10,
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  return {
    consultasPorDia,
    porEspecialidad,
    resumen: {
      consultasHoy: consultasPorDia[consultasPorDia.length - 1].total,
      consultasAyer: consultasPorDia[consultasPorDia.length - 2]?.total ?? 0,
      usuariosNuevosSemana,
      especialidadesConMedicos,
    },
  };
}
