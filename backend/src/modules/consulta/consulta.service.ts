import { Prisma, NivelUrgencia, TipoDerivacion } from "@prisma/client";
import prisma from "../../config/prisma";
import {
  AppError,
  badRequest,
  conflict,
  notFound,
} from "../../errors/AppError";
import {
  MAX_TRIAGE_ROUNDS,
  MAX_MEDICOS_SUGERIDOS,
  ESPECIALIDAD_POR_DEFECTO,
  URGENCIA_CASO_COMPLEJO,
  MOTIVO_CASO_COMPLEJO,
} from "../../constants";
import { getTodayRange } from "../../shared/fechas";
import {
  analizarSintomas,
  ErrorIA,
  EntradaAnalisis,
  ResultadoAnalisisIA,
  RondaRespondida,
} from "./ia.service";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ContextoConsulta {
  idPaciente?: number;
  sesionAnonimo?: string;
  ip: string;
}

export interface Solicitante {
  idPaciente?: number;
  sesionAnonimo: string;
  esAdmin: boolean;
}

export interface RespuestaRonda {
  id_pr: number;
  respuesta: string;
}

type EspecialidadCatalogo = { id_especialidad: number; nombre: string };
type SintomaIA = ResultadoAnalisisIA["sintomas"][number];

interface DatosVeredicto {
  especialidad: EspecialidadCatalogo;
  nivelUrgencia: NivelUrgencia;
  motivo: string;
  sintomas: SintomaIA[];
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

  try {
    await procesarAnalisis(consulta.id_consulta);
  } catch (error) {
    // Si el análisis falla, la consulta no debe consumir el límite diario
    await prisma.consulta.update({
      where: { id_consulta: consulta.id_consulta },
      data: { estado: "cancelada" },
    });
    throw error;
  }

  if (contexto.sesionAnonimo) {
    await registrarConsultaAnonima(contexto.sesionAnonimo, contexto.ip);
  }

  return cargarConsultaCompleta(consulta.id_consulta);
}

export async function obtenerConsulta(
  idConsulta: number,
  solicitante: Solicitante,
) {
  const consulta = await cargarConsultaCompleta(idConsulta);
  if (!puedeAcceder(consulta, solicitante, { permitirAdmin: true }))
    throw notFound("Consulta");
  return consulta;
}

export async function guardarRespuestas(
  idConsulta: number,
  idRonda: number,
  respuestas: RespuestaRonda[],
  solicitante: Solicitante,
) {
  const consulta = await prisma.consulta.findUnique({
    where: { id_consulta: idConsulta },
    include: {
      rondas: {
        orderBy: { numero_ronda: "desc" },
        take: 1,
        include: { preguntas: true },
      },
    },
  });
  if (!consulta || !puedeAcceder(consulta, solicitante))
    throw notFound("Consulta");
  if (consulta.estado !== "esperando_respuestas") {
    throw conflict("Esta consulta no está esperando respuestas");
  }

  const rondaActual = consulta.rondas[0];
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

  // Bloqueo: si llegan dos envíos a la vez, solo el primero cambia el estado
  const { count } = await prisma.consulta.updateMany({
    where: { id_consulta: idConsulta, estado: "esperando_respuestas" },
    data: { estado: "en_proceso" },
  });
  if (count === 0) throw conflict("Esta ronda ya se está procesando");

  try {
    await prisma.$transaction(
      respuestas.map((r) =>
        prisma.preguntaRespuesta.update({
          where: { id_pr: r.id_pr },
          data: { respuesta: r.respuesta },
        }),
      ),
    );
    await procesarAnalisis(idConsulta);
  } catch (error) {
    // Las respuestas quedan guardadas: el paciente puede reintentar el envío
    await prisma.consulta.update({
      where: { id_consulta: idConsulta },
      data: { estado: "esperando_respuestas" },
    });
    throw error;
  }

  return cargarConsultaCompleta(idConsulta);
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

export async function obtenerHistorialPaciente(idUsuario: number) {
  const paciente = await prisma.paciente.findUnique({
    where: { id_usuario: idUsuario },
  });
  if (!paciente) return [];

  return prisma.consulta.findMany({
    where: { id_paciente: paciente.id_paciente },
    orderBy: { fecha_consulta: "desc" },
    include: { especialidad_sugerida: true },
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

/** Solo el dueño de la consulta (paciente o misma sesión anónima) puede acceder a ella. */
function puedeAcceder(
  consulta: { id_paciente: number | null; sesion_anonimo: string | null },
  solicitante: Solicitante,
  opciones: { permitirAdmin?: boolean } = {},
): boolean {
  if (opciones.permitirAdmin && solicitante.esAdmin) return true;
  if (consulta.id_paciente !== null)
    return consulta.id_paciente === solicitante.idPaciente;
  return consulta.sesion_anonimo === solicitante.sesionAnonimo;
}

// ─── Núcleo del triage ────────────────────────────────────────────────────────

/** Envía la conversación acumulada a la IA y aplica el resultado. Se reutiliza en cada ronda. */
async function procesarAnalisis(idConsulta: number): Promise<void> {
  const consulta = await prisma.consulta.findUnique({
    where: { id_consulta: idConsulta },
    include: {
      rondas: {
        orderBy: { numero_ronda: "asc" },
        include: { preguntas: { orderBy: { orden: "asc" } } },
      },
    },
  });
  if (!consulta) throw notFound("Consulta");

  const especialidades = await prisma.especialidad.findMany({
    where: { activo: true },
    select: { id_especialidad: true, nombre: true },
  });

  const rondas: RondaRespondida[] = consulta.rondas.map((r) => ({
    numero: r.numero_ronda,
    preguntas: r.preguntas.map((p) => ({
      pregunta: p.pregunta,
      respuesta: p.respuesta,
    })),
  }));

  const resultado = await analizarConManejoDeErrores({
    descripcion: consulta.descripcion_sintomas,
    rondas,
    especialidades: especialidades.map((e) => e.nombre),
  });

  if (resultado.suficienteInformacion) {
    await finalizarConsulta(idConsulta, {
      especialidad: buscarEspecialidad(resultado.especialidad, especialidades),
      nivelUrgencia: resultado.nivelUrgencia,
      motivo: resultado.motivoDerivacion,
      sintomas: resultado.sintomas,
    });
    return;
  }

  // RN-002: síntomas contradictorios o demasiadas rondas sin resolver
  const limiteRondasAlcanzado = consulta.rondas.length >= MAX_TRIAGE_ROUNDS;
  if (resultado.casoComplejo || limiteRondasAlcanzado) {
    await finalizarConsulta(idConsulta, {
      especialidad: obtenerEspecialidadPorDefecto(especialidades),
      nivelUrgencia: URGENCIA_CASO_COMPLEJO,
      motivo: MOTIVO_CASO_COMPLEJO,
      sintomas: resultado.sintomas,
    });
    return;
  }

  await crearRonda(
    idConsulta,
    consulta.rondas.length + 1,
    resultado.preguntasSeguimiento,
  );
}

async function analizarConManejoDeErrores(
  entrada: EntradaAnalisis,
): Promise<ResultadoAnalisisIA> {
  try {
    return await analizarSintomas(entrada);
  } catch (error) {
    if (!(error instanceof ErrorIA)) throw error;

    console.error(`[IA] ${error.tipo}: ${error.message}`);
    if (error.tipo === "respuesta_invalida") {
      throw new AppError(
        "No pudimos interpretar el análisis de tus síntomas. Intenta de nuevo.",
        502,
      );
    }
    throw new AppError(
      "El análisis de síntomas no está disponible en este momento. Intenta de nuevo en unos minutos.",
      503,
    );
  }
}

async function finalizarConsulta(
  idConsulta: number,
  datos: DatosVeredicto,
): Promise<void> {
  const medicos = await buscarMedicosDisponibles(
    datos.especialidad.id_especialidad,
  );

  await prisma.$transaction([
    prisma.sintomaExtraido.deleteMany({ where: { id_consulta: idConsulta } }),
    prisma.sintomaExtraido.createMany({
      data: datos.sintomas.map((s) => ({ id_consulta: idConsulta, ...s })),
    }),
    prisma.medicoSugerido.deleteMany({ where: { id_consulta: idConsulta } }),
    prisma.medicoSugerido.createMany({
      data: medicos.map((m, i) => ({
        id_consulta: idConsulta,
        id_medico: m.id_medico,
        orden_sugerencia: i + 1,
      })),
    }),
    prisma.consulta.update({
      where: { id_consulta: idConsulta },
      data: {
        id_especialidad_sugerida: datos.especialidad.id_especialidad,
        nivel_urgencia: datos.nivelUrgencia,
        tipo_derivacion: calcularTipoDerivacion(
          datos.nivelUrgencia,
          datos.especialidad,
        ),
        motivo_derivacion: datos.motivo,
        estado: "completada",
      },
    }),
  ]);
}

/** RN-005 / HU-017: solo médicos de la especialidad, disponibles y con cuenta y centro activos. */
async function buscarMedicosDisponibles(idEspecialidad: number) {
  return prisma.medico.findMany({
    where: {
      id_especialidad: idEspecialidad,
      disponible: true,
      usuario: { activo: true },
      centro_salud: { activo: true },
    },
    orderBy: { created_at: "asc" },
    take: MAX_MEDICOS_SUGERIDOS,
    select: { id_medico: true },
  });
}

async function crearRonda(
  idConsulta: number,
  numeroRonda: number,
  preguntas: string[],
): Promise<void> {
  await prisma.$transaction([
    prisma.rondaPreguntas.create({
      data: {
        id_consulta: idConsulta,
        numero_ronda: numeroRonda,
        preguntas: {
          create: preguntas.map((pregunta, i) => ({ pregunta, orden: i + 1 })),
        },
      },
    }),
    prisma.consulta.update({
      where: { id_consulta: idConsulta },
      data: { estado: "esperando_respuestas" },
    }),
  ]);
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

// ─── Reglas de negocio auxiliares ─────────────────────────────────────────────

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/** La IA devuelve un nombre: se valida contra el catálogo real de la BD. */
function buscarEspecialidad(
  nombre: string,
  catalogo: EspecialidadCatalogo[],
): EspecialidadCatalogo {
  const encontrada = catalogo.find(
    (e) => normalizar(e.nombre) === normalizar(nombre),
  );
  if (encontrada) return encontrada;

  console.warn(
    `[Triage] Especialidad fuera del catálogo: "${nombre}". Se usa ${ESPECIALIDAD_POR_DEFECTO}.`,
  );
  return obtenerEspecialidadPorDefecto(catalogo);
}

function obtenerEspecialidadPorDefecto(
  catalogo: EspecialidadCatalogo[],
): EspecialidadCatalogo {
  const porDefecto = catalogo.find(
    (e) => normalizar(e.nombre) === normalizar(ESPECIALIDAD_POR_DEFECTO),
  );
  if (!porDefecto) {
    throw new AppError(
      `Falta la especialidad "${ESPECIALIDAD_POR_DEFECTO}" en el catálogo`,
      500,
    );
  }
  return porDefecto;
}

/** El tipo de derivación es lógica de negocio: lo decide el backend, no la IA. */
function calcularTipoDerivacion(
  nivel: NivelUrgencia,
  especialidad: EspecialidadCatalogo,
): TipoDerivacion {
  if (nivel === "emergencia") return "emergencia";
  return normalizar(especialidad.nombre) ===
    normalizar(ESPECIALIDAD_POR_DEFECTO)
    ? "medicina_general"
    : "especialista";
}
