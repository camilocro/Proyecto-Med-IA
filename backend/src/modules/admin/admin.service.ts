import { Prisma, NivelUrgencia, EstadoConsulta } from "@prisma/client";
import prisma from "../../config/prisma";
import { badRequest, notFound } from "../../errors/AppError";
import { getTodayRange, RangoFechas } from "../../shared/fechas";
import {
  CONFIG_KEY_DAILY_LIMIT,
  DIAS_GRAFICO_CONSULTAS,
  MAX_LIMITE_DIARIO,
  MAX_MEDICOS_RANKING,
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

// Solo estas claves se pueden modificar desde el panel
const CLAVES_CONFIGURABLES = [CONFIG_KEY_DAILY_LIMIT];

export async function setConfiguracion(clave: string, valor: string) {
  if (!CLAVES_CONFIGURABLES.includes(clave)) {
    throw badRequest(`La clave "${clave}" no se puede configurar`);
  }

  // HU-067 CA-2: el límite diario debe ser un entero entre 1 y el máximo permitido
  if (clave === CONFIG_KEY_DAILY_LIMIT) {
    const limite = Number(valor);
    if (!Number.isInteger(limite) || limite < 1 || limite > MAX_LIMITE_DIARIO) {
      throw badRequest(
        `El límite diario debe ser un número entero entre 1 y ${MAX_LIMITE_DIARIO}`,
      );
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

// ─── Consultas del panel (HU-031, HU-026, HU-068) ────────────────────────────

const INCLUDE_CONSULTA_LISTA = {
  especialidad_sugerida: { select: { nombre: true } },
  paciente: {
    include: { usuario: { select: { id_usuario: true, nombre: true } } },
  },
} satisfies Prisma.ConsultaInclude;

/** Todo lo que el admin necesita para auditar una consulta (HU-026 CA-1) */
const INCLUDE_CONSULTA_DETALLE = {
  ...INCLUDE_CONSULTA_LISTA,
  sintomas_extraidos: { orderBy: { relevancia: "desc" } },
  rondas: {
    orderBy: { numero_ronda: "asc" },
    include: { preguntas: { orderBy: { orden: "asc" } } },
  },
  medicos_sugeridos: {
    orderBy: { orden_sugerencia: "asc" },
    include: {
      medico: {
        include: {
          usuario: { select: { nombre: true } },
          especialidad: { select: { nombre: true } },
          centro_salud: { select: { nombre: true } },
        },
      },
    },
  },
} satisfies Prisma.ConsultaInclude;

export interface FiltrosConsultas {
  fecha: RangoFechas;
  urgencia?: NivelUrgencia;
  estado?: EstadoConsulta;
  pagina: number;
  porPagina: number;
}

/** Quién mira datos de pacientes y desde dónde: queda en AuditoriaAcceso (HU-026 CA-2) */
export interface Auditor {
  idAdmin: number;
  ip: string;
}

async function registrarAuditoria(auditor: Auditor, accion: string, exitoso: boolean) {
  await prisma.auditoriaAcceso.create({
    data: {
      id_usuario: auditor.idAdmin,
      accion,
      ip_address: auditor.ip,
      exitoso,
    },
  });
}

/** HU-031: lista paginada, de la más reciente a la más antigua. También la usa el Dashboard. */
export async function listarConsultas(filtros: FiltrosConsultas) {
  const where: Prisma.ConsultaWhereInput = {
    fecha_consulta: filtros.fecha,
    nivel_urgencia: filtros.urgencia,
    estado: filtros.estado,
  };

  const [consultas, total] = await Promise.all([
    prisma.consulta.findMany({
      where,
      orderBy: { fecha_consulta: "desc" },
      skip: (filtros.pagina - 1) * filtros.porPagina,
      take: filtros.porPagina,
      include: INCLUDE_CONSULTA_LISTA,
    }),
    prisma.consulta.count({ where }),
  ]);

  return { consultas, total, pagina: filtros.pagina, porPagina: filtros.porPagina };
}

export async function getDetalleConsulta(idConsulta: number, auditor: Auditor) {
  const consulta = await prisma.consulta.findUnique({
    where: { id_consulta: idConsulta },
    include: INCLUDE_CONSULTA_DETALLE,
  });
  await registrarAuditoria(auditor, `ver_consulta:${idConsulta}`, Boolean(consulta));
  if (!consulta) throw notFound("Consulta");
  return consulta;
}

/** HU-026: historial completo de un usuario, con filtro opcional por fechas (CA-4) */
export async function getHistorialUsuario(
  idUsuario: number,
  fecha: RangoFechas,
  auditor: Auditor,
) {
  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: idUsuario },
    select: {
      id_usuario: true,
      nombre: true,
      correo: true,
      rol: true,
      paciente: { select: { id_paciente: true } },
    },
  });
  await registrarAuditoria(auditor, `ver_historial:${idUsuario}`, Boolean(usuario));
  if (!usuario) throw notFound("Usuario");

  // Médicos y administradores no tienen consultas: el frontend muestra "no hay consultas" (CA-3)
  const consultas = usuario.paciente
    ? await prisma.consulta.findMany({
        where: { id_paciente: usuario.paciente.id_paciente, fecha_consulta: fecha },
        orderBy: { fecha_consulta: "desc" },
        include: INCLUDE_CONSULTA_DETALLE,
      })
    : [];

  return {
    usuario: {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    },
    consultas,
  };
}

// ─── Médicos con más derivaciones (HU-069) ───────────────────────────────────

export interface SugerenciaRanking {
  id_consulta: number;
  fecha: Date;
  especialidad: string;
}

export interface MedicoRanking {
  id_medico: number;
  nombre: string;
  especialidad: string;
  total: number;
  sugerencias: SugerenciaRanking[]; // CA-4: cuándo y para qué especialidad
}

export async function getRankingMedicos(fecha: RangoFechas): Promise<MedicoRanking[]> {
  const sugerencias = await prisma.medicoSugerido.findMany({
    where: { consulta: { fecha_consulta: fecha } },
    select: {
      id_medico: true,
      medico: {
        select: {
          usuario: { select: { nombre: true } },
          especialidad: { select: { nombre: true } },
        },
      },
      consulta: {
        select: {
          id_consulta: true,
          fecha_consulta: true,
          especialidad_sugerida: { select: { nombre: true } },
        },
      },
    },
  });

  const porMedico = new Map<number, MedicoRanking>();
  for (const { id_medico, medico, consulta } of sugerencias) {
    const fila: MedicoRanking = porMedico.get(id_medico) ?? {
      id_medico,
      nombre: medico.usuario.nombre,
      especialidad: medico.especialidad.nombre,
      total: 0,
      sugerencias: [],
    };
    fila.total += 1;
    fila.sugerencias.push({
      id_consulta: consulta.id_consulta,
      fecha: consulta.fecha_consulta,
      especialidad: consulta.especialidad_sugerida?.nombre ?? medico.especialidad.nombre,
    });
    porMedico.set(id_medico, fila);
  }

  return [...porMedico.values()]
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es")) // CA-2: empate → alfabético
    .slice(0, MAX_MEDICOS_RANKING)
    .map((m) => ({
      ...m,
      sugerencias: m.sugerencias.sort((a, b) => b.fecha.getTime() - a.fecha.getTime()),
    }));
}
