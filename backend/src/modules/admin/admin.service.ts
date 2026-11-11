import { Prisma, NivelUrgencia, EstadoConsulta } from "@prisma/client";
import prisma from "../../config/prisma";
import { badRequest, notFound } from "../../errors/AppError";
import {
  getTodayRange,
  formatearFechaLocal,
  RangoFechas,
} from "../../shared/fechas";
import {
  CONFIG_KEY_DAILY_LIMIT,
  DIAS_GRAFICO_CONSULTAS,
  PREFIJO_MOTIVO_CASO_COMPLEJO,
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
    where: { eliminado_en: null }, // HU-048: las cuentas eliminadas no se listan
    select: SELECT_USUARIO_PUBLICO,
    orderBy: { created_at: "desc" },
  });
}

/**
 * HU-007: activa o desactiva una cuenta. requireAuth revisa "activo" en cada petición,
 * así que una sesión abierta deja de valer al instante (CA-3). Queda en auditoría (CA-4).
 */
export async function cambiarEstadoUsuario(
  idUsuario: number,
  activo: boolean,
  auditor: Auditor,
) {
  if (idUsuario === auditor.idAdmin && !activo) {
    throw badRequest("No puedes desactivar tu propia cuenta");
  }

  const existe = await prisma.usuario.findUnique({
    where: { id_usuario: idUsuario },
  });
  // Una cuenta eliminada por su dueño no se puede reactivar desde el panel
  if (!existe || existe.eliminado_en) throw notFound("Usuario");

  const [usuario] = await prisma.$transaction([
    prisma.usuario.update({
      where: { id_usuario: idUsuario },
      data: { activo },
      select: SELECT_USUARIO_PUBLICO,
    }),
    crearAuditoria(
      auditor,
      `${activo ? "activar" : "desactivar"}_usuario:${idUsuario}`,
      true,
    ),
  ]);
  return usuario;
}

export async function getConfiguracion() {
  return prisma.configuracionSistema.findMany();
}

// Solo estas claves se pueden modificar desde el panel
const CLAVES_CONFIGURABLES = [CONFIG_KEY_DAILY_LIMIT];

/** HU-067 CA-4: el cambio queda en auditoría con el valor anterior, el nuevo y quién lo hizo. */
export async function setConfiguracion(
  clave: string,
  valor: string,
  auditor: Auditor,
) {
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

  const anterior = await prisma.configuracionSistema.findUnique({
    where: { clave },
  });
  const [config] = await prisma.$transaction([
    prisma.configuracionSistema.upsert({
      where: { clave },
      update: { valor },
      create: { clave, valor },
    }),
    crearAuditoria(
      auditor,
      `config:${clave}:${anterior?.valor ?? "sin valor"}->${valor}`,
      true,
    ),
  ]);
  return config;
}

// ─── Estadísticas del panel (HU-032) ─────────────────────────────────────────

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
    conteoPorDia.set(formatearFechaLocal(dia), 0);
  }
  for (const { fecha_consulta } of consultasRecientes) {
    const clave = formatearFechaLocal(fecha_consulta);
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
      // Sin foto_url: en el historial de un paciente se repetiría en cada consulta
      medico: {
        select: {
          id_medico: true,
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

/** Sin await: así también se puede incluir en una transacción junto al cambio que registra */
function crearAuditoria(auditor: Auditor, accion: string, exitoso: boolean) {
  return prisma.auditoriaAcceso.create({
    data: {
      id_usuario: auditor.idAdmin,
      accion,
      ip_address: auditor.ip,
      exitoso,
    },
  });
}

async function registrarAuditoria(
  auditor: Auditor,
  accion: string,
  exitoso: boolean,
) {
  await crearAuditoria(auditor, accion, exitoso);
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

  return {
    consultas,
    total,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}

export async function getDetalleConsulta(idConsulta: number, auditor: Auditor) {
  const consulta = await prisma.consulta.findUnique({
    where: { id_consulta: idConsulta },
    include: INCLUDE_CONSULTA_DETALLE,
  });
  await registrarAuditoria(
    auditor,
    `ver_consulta:${idConsulta}`,
    Boolean(consulta),
  );
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
  await registrarAuditoria(
    auditor,
    `ver_historial:${idUsuario}`,
    Boolean(usuario),
  );
  if (!usuario) throw notFound("Usuario");

  // Médicos y administradores no tienen consultas: el frontend muestra "no hay consultas" (CA-3)
  const consultas = usuario.paciente
    ? await prisma.consulta.findMany({
        where: {
          id_paciente: usuario.paciente.id_paciente,
          fecha_consulta: fecha,
        },
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

export async function getRankingMedicos(
  fecha: RangoFechas,
): Promise<MedicoRanking[]> {
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
      especialidad:
        consulta.especialidad_sugerida?.nombre ?? medico.especialidad.nombre,
    });
    porMedico.set(id_medico, fila);
  }

  return [...porMedico.values()]
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es")) // CA-2: empate → alfabético
    .slice(0, MAX_MEDICOS_RANKING)
    .map((m) => ({
      ...m,
      sugerencias: m.sugerencias.sort(
        (a, b) => b.fecha.getTime() - a.fecha.getTime(),
      ),
    }));
}

// ─── Estadísticas por período (HU-032) ────────────────────────────────────────

const ORDEN_URGENCIA: NivelUrgencia[] = ["emergencia", "alto", "medio", "bajo"];

const porcentaje = (parte: number, total: number) =>
  total === 0 ? 0 : Math.round((parte / total) * 1000) / 10;

/**
 * HU-032: total de consultas del período, especialidades más frecuentes, distribución
 * de urgencias y porcentaje de derivaciones automáticas por caso complejo.
 * Los porcentajes se calculan sobre las consultas con resultado (las que tienen urgencia).
 */
export async function getEstadisticasPeriodo(fecha: RangoFechas) {
  const enPeriodo = { fecha_consulta: fecha };
  const conResultado = { ...enPeriodo, nivel_urgencia: { not: null } };

  const [total, porUrgenciaAgrupado, porEspecialidadAgrupado, casosComplejos] =
    await Promise.all([
      prisma.consulta.count({ where: enPeriodo }),
      prisma.consulta.groupBy({
        by: ["nivel_urgencia"],
        where: conResultado,
        _count: { _all: true },
      }),
      prisma.consulta.groupBy({
        by: ["id_especialidad_sugerida"],
        where: { ...conResultado, id_especialidad_sugerida: { not: null } },
        _count: { _all: true },
      }),
      prisma.consulta.count({
        where: {
          ...conResultado,
          motivo_derivacion: { startsWith: PREFIJO_MOTIVO_CASO_COMPLEJO },
        },
      }),
    ]);

  const totalConResultado = porUrgenciaAgrupado.reduce(
    (suma, g) => suma + g._count._all,
    0,
  );

  // Se incluyen los cuatro niveles aunque alguno tenga 0, siempre en el mismo orden
  const conteoUrgencia = new Map<NivelUrgencia | null, number>(
    porUrgenciaAgrupado.map((g) => [g.nivel_urgencia, g._count._all]),
  );
  const porUrgencia = ORDEN_URGENCIA.map((nivel) => ({
    nivel,
    cantidad: conteoUrgencia.get(nivel) ?? 0,
    porcentaje: porcentaje(conteoUrgencia.get(nivel) ?? 0, totalConResultado),
  }));

  const especialidades = await prisma.especialidad.findMany({
    where: {
      id_especialidad: {
        in: porEspecialidadAgrupado.map((g) => g.id_especialidad_sugerida!),
      },
    },
    select: { id_especialidad: true, nombre: true },
  });
  const nombres = new Map(
    especialidades.map((e) => [e.id_especialidad, e.nombre]),
  );
  const porEspecialidad = porEspecialidadAgrupado
    .map((g) => ({
      nombre: nombres.get(g.id_especialidad_sugerida!) ?? "Sin nombre",
      cantidad: g._count._all,
      porcentaje: porcentaje(g._count._all, totalConResultado),
    }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre));

  return {
    total,
    totalConResultado,
    porUrgencia,
    porEspecialidad,
    casosComplejos,
    porcentajeCasosComplejos: porcentaje(casosComplejos, totalConResultado),
  };
}
