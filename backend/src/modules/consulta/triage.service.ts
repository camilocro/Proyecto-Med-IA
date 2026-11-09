import { Prisma, NivelUrgencia, TipoDerivacion } from "@prisma/client";
import prisma from "../../config/prisma";
import { AppError, badRequest } from "../../errors/AppError";
import {
  MAX_TRIAGE_ROUNDS,
  MAX_MEDICOS_SUGERIDOS,
  ESPECIALIDAD_POR_DEFECTO,
  URGENCIA_CASO_COMPLEJO,
  MOTIVO_CASO_COMPLEJO,
  MAX_CONSULTAS_HISTORIAL_IA,
  MENSAJE_IDIOMA_NO_SOPORTADO,
  MAX_ESPECIALIDADES_ALTERNATIVAS,
} from "../../constants";
import { formatearFechaLocal } from "../../shared/fechas";
import {
  analizarSintomas,
  ErrorIA,
  ConsultaPrevia,
  ResultadoAnalisisIA,
  RondaRespondida,
} from "./ia.service";

// Núcleo del triage: arma lo que se envía a la IA y guarda lo que responde
// (una nueva ronda de preguntas o el veredicto). Lo usa consulta.service.

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EspecialidadCatalogo = { id_especialidad: number; nombre: string };
type SintomaIA = ResultadoAnalisisIA["sintomas"][number];
type AlternativaIA = { especialidad: string; correspondencia: "alta" | "media" };

/** HU-057: lo que se guarda en Consulta.especialidades_alternativas */
export type EspecialidadAlternativa = {
  id_especialidad: number;
  nombre: string;
  correspondencia: "alta" | "media";
};

/** Lo que la IA lee: la descripción y las rondas ya respondidas, en orden */
export interface Conversacion {
  descripcion: string;
  rondas: RondaRespondida[];
}

export interface Analisis {
  resultado: ResultadoAnalisisIA;
  especialidades: EspecialidadCatalogo[];
}

interface DatosVeredicto {
  especialidad: EspecialidadCatalogo;
  nivelUrgencia: NivelUrgencia;
  motivo: string;
  sintomas: SintomaIA[];
  alternativas: EspecialidadAlternativa[];
}

// HU-055: el resumen se guarda como texto legible, una frase tras otra
export const SEPARADOR_RESUMEN = "; ";

type OperacionBD = Prisma.PrismaPromise<unknown>;

// ─── Funciones del módulo ─────────────────────────────────────────────────────

/** Convierte las rondas guardadas en la conversación que se envía a la IA */
export function conversacionDe(
  descripcion: string,
  rondas: {
    numero_ronda: number;
    preguntas: { pregunta: string; respuesta: string }[];
  }[],
): Conversacion {
  return {
    descripcion,
    rondas: rondas.map((r) => ({
      numero: r.numero_ronda,
      preguntas: r.preguntas.map((p) => ({
        pregunta: p.pregunta,
        respuesta: p.respuesta,
      })),
    })),
  };
}

/**
 * Envía la conversación a la IA. No modifica la base de datos: si falla,
 * la consulta queda como estaba.
 */
export async function analizarConversacion(
  consulta: { id_consulta: number; id_paciente: number | null },
  conversacion: Conversacion,
): Promise<Analisis> {
  const [especialidades, historial] = await Promise.all([
    prisma.especialidad.findMany({
      where: { activo: true },
      select: { id_especialidad: true, nombre: true },
    }),
    // HU-014 / HU-056: los anónimos no tienen historial
    consulta.id_paciente
      ? obtenerHistorialParaIA(consulta.id_paciente, consulta.id_consulta)
      : Promise.resolve([]),
  ]);

  const resultado = await analizarConManejoDeErrores({
    ...conversacion,
    especialidades: especialidades.map((e) => e.nombre),
    historial,
  });

  // HU-054: solo español e inglés. El error llega antes de guardar nada,
  // así la consulta no se descuenta del límite diario.
  if (resultado.idioma === "otro") throw badRequest(MENSAJE_IDIOMA_NO_SOPORTADO);

  return { resultado, especialidades };
}

/**
 * Guarda el resultado del análisis en una sola transacción, junto con los cambios
 * previos que necesite quien llama (borrar rondas, corregir una respuesta...).
 * Devuelve true si la consulta quedó completada (emergencia).
 */
export async function aplicarAnalisis(
  idConsulta: number,
  rondasRespondidas: number,
  { resultado, especialidades }: Analisis,
  cambiosPrevios: OperacionBD[] = [],
): Promise<boolean> {
  const resumen = resultado.resumenSintomas.length
    ? resultado.resumenSintomas.join(SEPARADOR_RESUMEN)
    : undefined;

  if (resultado.suficienteInformacion) {
    const especialidad = buscarEspecialidad(resultado.especialidad, especialidades);
    return guardarVeredicto(
      idConsulta,
      {
        especialidad,
        nivelUrgencia: resultado.nivelUrgencia,
        motivo: resultado.motivoDerivacion,
        sintomas: resultado.sintomas,
        alternativas: resolverAlternativas(
          resultado.especialidadesAlternativas,
          especialidad,
          especialidades,
        ),
      },
      resumen,
      cambiosPrevios,
    );
  }

  // RN-002: síntomas contradictorios o demasiadas rondas sin resolver
  if (resultado.casoComplejo || rondasRespondidas >= MAX_TRIAGE_ROUNDS) {
    return guardarVeredicto(
      idConsulta,
      {
        especialidad: obtenerEspecialidadPorDefecto(especialidades),
        nivelUrgencia: URGENCIA_CASO_COMPLEJO,
        motivo: MOTIVO_CASO_COMPLEJO,
        sintomas: resultado.sintomas,
        alternativas: [],
      },
      resumen,
      cambiosPrevios,
    );
  }

  await crearRonda(
    idConsulta,
    rondasRespondidas + 1,
    resultado.preguntasSeguimiento,
    resumen,
    cambiosPrevios,
  );
  return false;
}

/** Operaciones que borran las rondas desde el número indicado (con sus preguntas) */
export function borrarRondasDesde(
  idConsulta: number,
  numeroRonda: number,
): OperacionBD[] {
  const rondas = { id_consulta: idConsulta, numero_ronda: { gte: numeroRonda } };
  return [
    prisma.preguntaRespuesta.deleteMany({ where: { ronda: rondas } }),
    prisma.rondaPreguntas.deleteMany({ where: rondas }),
  ];
}

// ─── Guardar el resultado ─────────────────────────────────────────────────────

/** Al volver a analizar, el veredicto anterior deja de valer */
function borrarVeredicto(idConsulta: number): OperacionBD[] {
  return [
    prisma.sintomaExtraido.deleteMany({ where: { id_consulta: idConsulta } }),
    prisma.medicoSugerido.deleteMany({ where: { id_consulta: idConsulta } }),
  ];
}

async function guardarVeredicto(
  idConsulta: number,
  datos: DatosVeredicto,
  resumen: string | undefined,
  cambiosPrevios: OperacionBD[],
): Promise<boolean> {
  const medicos = await buscarMedicosSugeridos(datos.especialidad.id_especialidad);

  // HU-053: el paciente confirma antes de ver el resultado. Una emergencia
  // no espera: se muestra de inmediato.
  const esEmergencia = datos.nivelUrgencia === "emergencia";

  await prisma.$transaction([
    ...cambiosPrevios,
    ...borrarVeredicto(idConsulta),
    prisma.sintomaExtraido.createMany({
      data: datos.sintomas.map((s) => ({ id_consulta: idConsulta, ...s })),
    }),
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
        tipo_derivacion: calcularTipoDerivacion(datos.nivelUrgencia, datos.especialidad),
        motivo_derivacion: datos.motivo,
        especialidades_alternativas: datos.alternativas,
        resumen_sintomas: resumen,
        estado: esEmergencia ? "completada" : "esperando_confirmacion",
      },
    }),
  ]);
  return esEmergencia;
}

async function crearRonda(
  idConsulta: number,
  numeroRonda: number,
  preguntas: string[],
  resumen: string | undefined,
  cambiosPrevios: OperacionBD[],
): Promise<void> {
  await prisma.$transaction([
    ...cambiosPrevios,
    ...borrarVeredicto(idConsulta),
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
      data: {
        id_especialidad_sugerida: null,
        nivel_urgencia: null,
        tipo_derivacion: null,
        motivo_derivacion: null,
        especialidades_alternativas: Prisma.DbNull,
        resumen_sintomas: resumen,
        estado: "esperando_respuestas",
      },
    }),
  ]);
}

/**
 * HU-058 / RN-005: médicos de la especialidad con cuenta y centro activos,
 * primero los disponibles. Si ninguno lo está, el paciente igual ve a quién acudir.
 */
async function buscarMedicosSugeridos(idEspecialidad: number) {
  return prisma.medico.findMany({
    where: {
      id_especialidad: idEspecialidad,
      usuario: { activo: true },
      centro_salud: { activo: true },
    },
    orderBy: [{ disponible: "desc" }, { created_at: "asc" }],
    take: MAX_MEDICOS_SUGERIDOS,
    select: { id_medico: true },
  });
}

// ─── IA ───────────────────────────────────────────────────────────────────────

/** Últimas consultas completadas del paciente, resumidas para la IA (sin la actual ni las ocultas). */
async function obtenerHistorialParaIA(
  idPaciente: number,
  idConsultaActual: number,
): Promise<ConsultaPrevia[]> {
  const anteriores = await prisma.consulta.findMany({
    where: {
      id_paciente: idPaciente,
      estado: "completada",
      oculta_paciente: false, // HU-065 CA-4
      id_consulta: { not: idConsultaActual },
    },
    orderBy: { fecha_consulta: "desc" },
    take: MAX_CONSULTAS_HISTORIAL_IA,
    select: {
      fecha_consulta: true,
      nivel_urgencia: true,
      especialidad_sugerida: { select: { nombre: true } },
    },
  });

  return anteriores.map((c) => ({
    fecha: formatearFechaLocal(c.fecha_consulta),
    especialidad: c.especialidad_sugerida?.nombre ?? "sin especialidad",
    nivelUrgencia: c.nivel_urgencia ?? "no indicada",
  }));
}

// try/catch necesario: el SDK de la IA lanza sus propios errores y aquí se
// traducen a un mensaje claro para el paciente (502/503).
async function analizarConManejoDeErrores(
  entrada: Parameters<typeof analizarSintomas>[0],
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

// ─── Reglas de negocio auxiliares ─────────────────────────────────────────────

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

function buscarEnCatalogo(
  nombre: string,
  catalogo: EspecialidadCatalogo[],
): EspecialidadCatalogo | undefined {
  return catalogo.find((e) => normalizar(e.nombre) === normalizar(nombre));
}

/** La IA devuelve un nombre: se valida contra el catálogo real de la BD. */
function buscarEspecialidad(
  nombre: string,
  catalogo: EspecialidadCatalogo[],
): EspecialidadCatalogo {
  const encontrada = buscarEnCatalogo(nombre, catalogo);
  if (encontrada) return encontrada;

  console.warn(
    `[Triage] Especialidad fuera del catálogo: "${nombre}". Se usa ${ESPECIALIDAD_POR_DEFECTO}.`,
  );
  return obtenerEspecialidadPorDefecto(catalogo);
}

/** HU-057: hasta 2 especialidades activas del catálogo, sin repetir ni la principal */
function resolverAlternativas(
  alternativas: AlternativaIA[],
  principal: EspecialidadCatalogo,
  catalogo: EspecialidadCatalogo[],
): EspecialidadAlternativa[] {
  const usadas = new Set([principal.id_especialidad]);
  const resultado: EspecialidadAlternativa[] = [];

  for (const alternativa of alternativas) {
    const especialidad = buscarEnCatalogo(alternativa.especialidad, catalogo);
    if (!especialidad || usadas.has(especialidad.id_especialidad)) continue;
    usadas.add(especialidad.id_especialidad);
    resultado.push({ ...especialidad, correspondencia: alternativa.correspondencia });
  }
  return resultado.slice(0, MAX_ESPECIALIDADES_ALTERNATIVAS);
}

function obtenerEspecialidadPorDefecto(
  catalogo: EspecialidadCatalogo[],
): EspecialidadCatalogo {
  const porDefecto = buscarEnCatalogo(ESPECIALIDAD_POR_DEFECTO, catalogo);
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
  return normalizar(especialidad.nombre) === normalizar(ESPECIALIDAD_POR_DEFECTO)
    ? "medicina_general"
    : "especialista";
}
