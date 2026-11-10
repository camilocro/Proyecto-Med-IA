import { Prisma, EstadoConsulta } from "@prisma/client";
import prisma from "../../config/prisma";
import { badRequest, conflict, notFound } from "../../errors/AppError";
import { getTodayRange } from "../../shared/fechas";
import { notificarConsultaCompletada } from "../notificacion/notificacion.service";
import {
  analizarConversacion,
  aplicarAnalisis,
  borrarRondasDesde,
  conversacionDe,
} from "./triage.service";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ContextoConsulta {
  idPaciente?: number;
  sesionAnonimo?: string;
  ip: string;
}

export interface Solicitante {
  idPaciente?: number;
  sesionAnonimo: string;
}

export interface RespuestaRonda {
  id_pr: number;
  respuesta: string;
}

const INCLUDE_CONSULTA_COMPLETA = {
  especialidad_sugerida: true,
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
          especialidad: true,
          centro_salud: true,
        },
      },
    },
  },
} satisfies Prisma.ConsultaInclude;

const INCLUDE_RONDAS = {
  rondas: {
    orderBy: { numero_ronda: "asc" },
    include: { preguntas: { orderBy: { orden: "asc" } } },
  },
} satisfies Prisma.ConsultaInclude;

// HU-052: se puede reiniciar mientras la consulta no terminó
const ESTADOS_REINICIABLES: EstadoConsulta[] = [
  "esperando_respuestas",
  "esperando_confirmacion",
];

// ─── Funciones públicas del módulo ────────────────────────────────────────────

export async function getIdPacientePorUsuario(
  idUsuario: number,
): Promise<number | undefined> {
  const paciente = await prisma.paciente.findUnique({
    where: { id_usuario: idUsuario },
  });
  return paciente?.id_paciente;
}

export async function crearConsulta(
  descripcionSintomas: string,
  contexto: ContextoConsulta,
) {
  if (!contexto.idPaciente && !contexto.sesionAnonimo) {
    throw badRequest("No se pudo identificar la sesión del paciente");
  }

  const consulta = await prisma.consulta.create({
    data: {
      id_paciente: contexto.idPaciente,
      sesion_anonimo: contexto.sesionAnonimo,
      descripcion_sintomas: descripcionSintomas,
      estado: "en_proceso",
    },
  });

  let completada: boolean;
  try {
    const analisis = await analizarConversacion(
      consulta,
      conversacionDe(descripcionSintomas, []),
    );
    completada = await aplicarAnalisis(consulta.id_consulta, 0, analisis);
  } catch (error) {
    // Si el análisis falla (o el idioma no se admite), la consulta se borra:
    // no consume el límite ni aparece en el historial.
    await prisma.consulta.deleteMany({
      where: { id_consulta: consulta.id_consulta },
    });
    throw error;
  }

  if (contexto.sesionAnonimo) {
    await registrarConsultaAnonima(contexto.sesionAnonimo, contexto.ip);
  }

  return resultadoConsulta(consulta.id_consulta, completada);
}

export async function obtenerConsulta(
  idConsulta: number,
  solicitante: Solicitante,
) {
  // El administrador usa GET /admin/consultas/:id, que deja el acceso en la auditoría (HU-026)
  const consulta = await cargarConsultaCompleta(idConsulta);
  if (!puedeAcceder(consulta, solicitante)) throw notFound("Consulta");
  return consulta;
}

export async function guardarRespuestas(
  idConsulta: number,
  idRonda: number,
  respuestas: RespuestaRonda[],
  solicitante: Solicitante,
) {
  const consulta = await cargarConsultaPropia(idConsulta, solicitante);
  if (consulta.estado !== "esperando_respuestas") {
    throw conflict("Esta consulta no está esperando respuestas");
  }

  const rondaActual = consulta.rondas[consulta.rondas.length - 1];
  if (!rondaActual || rondaActual.id_ronda !== idRonda) {
    throw conflict("Solo puedes responder la ronda de preguntas actual");
  }

  // Cada pregunta de la ronda debe responderse exactamente una vez
  const idsEsperados = new Set(rondaActual.preguntas.map((p) => p.id_pr));
  const idsRecibidos = new Set(respuestas.map((r) => r.id_pr));
  const coinciden =
    respuestas.length === idsRecibidos.size &&
    idsRecibidos.size === idsEsperados.size &&
    [...idsRecibidos].every((id) => idsEsperados.has(id));
  if (!coinciden) {
    throw badRequest(
      "Debes responder todas las preguntas de la ronda, una vez cada una",
    );
  }

  await bloquear(idConsulta, "esperando_respuestas");

  let completada: boolean;
  try {
    // Las respuestas se guardan antes de analizar: si la IA falla, el paciente puede reintentar
    await prisma.$transaction(
      respuestas.map((r) =>
        prisma.preguntaRespuesta.update({
          where: { id_pr: r.id_pr },
          data: { respuesta: r.respuesta },
        }),
      ),
    );
    const respondidas = new Map(respuestas.map((r) => [r.id_pr, r.respuesta]));
    const rondas = consulta.rondas.map((r) => ({
      ...r,
      preguntas: r.preguntas.map((p) => ({
        ...p,
        respuesta: respondidas.get(p.id_pr) ?? p.respuesta,
      })),
    }));
    const analisis = await analizarConversacion(
      consulta,
      conversacionDe(consulta.descripcion_sintomas, rondas),
    );
    completada = await aplicarAnalisis(idConsulta, rondas.length, analisis);
  } catch (error) {
    await desbloquear(idConsulta, "esperando_respuestas");
    throw error;
  }

  return resultadoConsulta(idConsulta, completada);
}

/**
 * HU-053: corregir una respuesta antes de confirmar. Se vuelve a analizar desde
 * esa ronda (las siguientes se descartan) sin gastar otra consulta.
 */
export async function corregirRespuesta(
  idConsulta: number,
  idPr: number,
  respuesta: string,
  solicitante: Solicitante,
) {
  const consulta = await cargarConsultaPropia(idConsulta, solicitante);
  if (consulta.estado !== "esperando_confirmacion") {
    throw conflict("Solo puedes corregir respuestas antes de confirmar la consulta");
  }

  const ronda = consulta.rondas.find((r) =>
    r.preguntas.some((p) => p.id_pr === idPr),
  );
  if (!ronda) throw notFound("Pregunta");

  const rondas = consulta.rondas
    .filter((r) => r.numero_ronda <= ronda.numero_ronda)
    .map((r) => ({
      ...r,
      preguntas: r.preguntas.map((p) =>
        p.id_pr === idPr ? { ...p, respuesta } : p,
      ),
    }));

  await bloquear(idConsulta, "esperando_confirmacion");

  let completada: boolean;
  try {
    const analisis = await analizarConversacion(
      consulta,
      conversacionDe(consulta.descripcion_sintomas, rondas),
    );
    completada = await aplicarAnalisis(idConsulta, rondas.length, analisis, [
      prisma.preguntaRespuesta.update({
        where: { id_pr: idPr },
        data: { respuesta },
      }),
      ...borrarRondasDesde(idConsulta, ronda.numero_ronda + 1),
    ]);
  } catch (error) {
    // Nada se guardó todavía: la consulta vuelve a esperar la confirmación
    await desbloquear(idConsulta, "esperando_confirmacion");
    throw error;
  }

  return resultadoConsulta(idConsulta, completada);
}

/**
 * HU-052: empieza de nuevo con otra descripción sobre la MISMA consulta,
 * así no se descuenta otra del límite diario (CA-2).
 */
export async function reiniciarConsulta(
  idConsulta: number,
  descripcionSintomas: string,
  solicitante: Solicitante,
) {
  const consulta = await cargarConsultaPropia(idConsulta, solicitante);
  const estadoAnterior = consulta.estado;
  if (!ESTADOS_REINICIABLES.includes(estadoAnterior)) {
    throw conflict("Solo puedes reiniciar una consulta que todavía no terminó");
  }

  await bloquear(idConsulta, estadoAnterior);

  let completada: boolean;
  try {
    const analisis = await analizarConversacion(
      consulta,
      conversacionDe(descripcionSintomas, []),
    );
    completada = await aplicarAnalisis(idConsulta, 0, analisis, [
      prisma.consulta.update({
        where: { id_consulta: idConsulta },
        data: { descripcion_sintomas: descripcionSintomas },
      }),
      ...borrarRondasDesde(idConsulta, 1),
    ]);
  } catch (error) {
    await desbloquear(idConsulta, estadoAnterior);
    throw error;
  }

  return resultadoConsulta(idConsulta, completada);
}

/** HU-053: el paciente confirma el resumen y recién ahí ve el resultado */
export async function confirmarConsulta(
  idConsulta: number,
  solicitante: Solicitante,
) {
  await cargarConsultaPropia(idConsulta, solicitante);

  const { count } = await prisma.consulta.updateMany({
    where: { id_consulta: idConsulta, estado: "esperando_confirmacion" },
    data: { estado: "completada" },
  });
  if (count === 0) throw conflict("Esta consulta no está esperando confirmación");

  return resultadoConsulta(idConsulta, true);
}

export async function cancelarConsulta(
  idConsulta: number,
  solicitante: Solicitante,
) {
  const consulta = await prisma.consulta.findUnique({
    where: { id_consulta: idConsulta },
  });
  if (!consulta || !puedeAcceder(consulta, solicitante))
    throw notFound("Consulta");
  if (consulta.estado === "completada" || consulta.estado === "cancelada") {
    throw conflict("Esta consulta ya finalizó y no se puede cancelar");
  }

  return prisma.consulta.update({
    where: { id_consulta: idConsulta },
    data: { estado: "cancelada" },
  });
}

/**
 * HU-065: el paciente la quita de su historial. No se borra de verdad:
 * sigue contando para el límite diario (CA-2) y el administrador la conserva.
 */
export async function ocultarConsulta(idConsulta: number, idUsuario: number) {
  const idPaciente = await getIdPacientePorUsuario(idUsuario);
  const consulta = await prisma.consulta.findUnique({
    where: { id_consulta: idConsulta },
  });
  if (
    !consulta ||
    idPaciente === undefined ||
    consulta.id_paciente !== idPaciente ||
    consulta.oculta_paciente
  ) {
    throw notFound("Consulta");
  }

  await prisma.consulta.update({
    where: { id_consulta: idConsulta },
    data: { oculta_paciente: true },
  });
}

export async function obtenerHistorialPaciente(idUsuario: number) {
  const paciente = await prisma.paciente.findUnique({
    where: { id_usuario: idUsuario },
  });
  if (!paciente) return [];

  return prisma.consulta.findMany({
    where: { id_paciente: paciente.id_paciente, oculta_paciente: false }, // HU-065 CA-4
    orderBy: { fecha_consulta: "desc" },
    include: {
      especialidad_sugerida: true,
      // Solo el nombre: lo usa el PDF del historial (HU-064 CA-2)
      medicos_sugeridos: {
        orderBy: { orden_sugerencia: "asc" },
        select: { medico: { select: { usuario: { select: { nombre: true } } } } },
      },
    },
  });
}

// ─── Acceso ───────────────────────────────────────────────────────────────────

async function cargarConsultaCompleta(idConsulta: number) {
  const consulta = await prisma.consulta.findUnique({
    where: { id_consulta: idConsulta },
    include: INCLUDE_CONSULTA_COMPLETA,
  });
  if (!consulta) throw notFound("Consulta");
  return consulta;
}

/** La consulta con sus rondas, solo si pertenece a quien la pide */
async function cargarConsultaPropia(idConsulta: number, solicitante: Solicitante) {
  const consulta = await prisma.consulta.findUnique({
    where: { id_consulta: idConsulta },
    include: INCLUDE_RONDAS,
  });
  if (!consulta || !puedeAcceder(consulta, solicitante))
    throw notFound("Consulta");
  return consulta;
}

/**
 * Lo que responden los endpoints del triage. Si la consulta acaba de completarse,
 * se avisa por correo al paciente (HU-070) y se informa si se pudo enviar.
 */
async function resultadoConsulta(idConsulta: number, recienCompletada: boolean) {
  const correoEnviado = recienCompletada
    ? await notificarConsultaCompletada(idConsulta)
    : undefined;
  return { ...(await cargarConsultaCompleta(idConsulta)), correoEnviado };
}

/** Solo el dueño de la consulta (paciente o misma sesión anónima) puede acceder a ella. */
function puedeAcceder(
  consulta: {
    id_paciente: number | null;
    sesion_anonimo: string | null;
    oculta_paciente: boolean;
  },
  solicitante: Solicitante,
): boolean {
  if (consulta.oculta_paciente) return false; // HU-065: para el paciente ya no existe
  if (consulta.id_paciente !== null)
    return consulta.id_paciente === solicitante.idPaciente;
  return consulta.sesion_anonimo === solicitante.sesionAnonimo;
}

/** Si llegan dos envíos a la vez, solo el primero cambia el estado */
async function bloquear(idConsulta: number, estadoEsperado: EstadoConsulta) {
  const { count } = await prisma.consulta.updateMany({
    where: { id_consulta: idConsulta, estado: estadoEsperado },
    data: { estado: "en_proceso" },
  });
  if (count === 0) throw conflict("Esta consulta ya se está procesando");
}

async function desbloquear(idConsulta: number, estado: EstadoConsulta) {
  await prisma.consulta.update({
    where: { id_consulta: idConsulta },
    data: { estado },
  });
}

async function registrarConsultaAnonima(
  sesionId: string,
  ip: string,
): Promise<void> {
  const { start } = getTodayRange();
  await prisma.limiteConsultaAnonimo.upsert({
    where: { sesion_id_fecha: { sesion_id: sesionId, fecha: start } },
    create: { sesion_id: sesionId, ip_address: ip, fecha: start, cantidad: 1 },
    update: { cantidad: { increment: 1 } },
  });
}
