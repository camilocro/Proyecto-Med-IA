import type { EntradaAnalisis } from "./ia.service";
import { ESPECIALIDAD_POR_DEFECTO } from "../../constants";

// Palabras clave para probar los distintos caminos del flujo sin gastar crédito:
//   [complejo]    → caso complejo (RN-002)
//   [sin_fin]     → siempre pide preguntas (para probar el límite de rondas)
//   [otro_idioma] → idioma no soportado (HU-054)
const MARCA_COMPLEJO = "[complejo]";
const MARCA_SIN_FIN = "[sin_fin]";
const MARCA_OTRO_IDIOMA = "[otro_idioma]";

const PALABRAS_ALARMA = ["pecho", "respirar", "desmay", "convuls", "sangrado", "chest", "breath"];

// HU-013 CA-1: sin "desde cuándo" la descripción se considera ambigua
const PATRON_DURACION = /\b(hace|desde|ayer|hoy|d[ií]as?|semanas?|meses|horas?|since|ago|days?|weeks?|yesterday|today)\b/;
const PATRON_INGLES = /\b(i|my|have|has|pain|since|feel|hurts?|the|and|days?)\b/g;

const MAPA_ESPECIALIDADES: { palabras: string[]; especialidad: string }[] = [
  { palabras: ["cabeza", "mareo", "head", "dizzy"], especialidad: "Neurología" },
  { palabras: ["pecho", "corazón", "palpita", "chest", "heart"], especialidad: "Cardiología" },
  { palabras: ["estómago", "barriga", "diarrea", "stomach"], especialidad: "Gastroenterología" },
  { palabras: ["rodilla", "hueso", "espalda", "knee", "back"], especialidad: "Traumatología" },
  { palabras: ["piel", "granos", "mancha", "skin", "rash"], especialidad: "Dermatología" },
  { palabras: ["ojo", "vista", "borroso", "eye", "blurry"], especialidad: "Oftalmología" },
  { palabras: ["oído", "garganta", "nariz", "ear", "throat"], especialidad: "Otorrinolaringología" },
];

const PREGUNTAS_EJEMPLO = {
  es: [
    "¿Hace cuánto tiempo empezaron las molestias?",
    "¿En qué parte del cuerpo sentís la molestia?",
    "¿Tienes algún otro síntoma, como fiebre o náuseas?",
  ],
  en: [
    "How long have you had these symptoms?",
    "Where in your body do you feel it?",
    "Do you have any other symptoms, like fever or nausea?",
  ],
};

function textoCompleto(entrada: EntradaAnalisis): string {
  const respuestas = entrada.rondas.flatMap((r) =>
    r.preguntas.map((p) => p.respuesta),
  );
  return [entrada.descripcion, ...respuestas].join(" ").toLowerCase();
}

function detectarIdioma(texto: string): "es" | "en" | "otro" {
  if (texto.includes(MARCA_OTRO_IDIOMA)) return "otro";
  const palabrasIngles = texto.match(PATRON_INGLES)?.length ?? 0;
  return palabrasIngles >= 3 ? "en" : "es";
}

/** Especialidades del catálogo que coinciden con el texto, en el orden del mapa */
function especialidadesMencionadas(texto: string, catalogo: string[]): string[] {
  return MAPA_ESPECIALIDADES.filter(
    (m) =>
      catalogo.includes(m.especialidad) &&
      m.palabras.some((p) => texto.includes(p)),
  ).map((m) => m.especialidad);
}

export function generarRespuestaSimulada(entrada: EntradaAnalisis): unknown {
  const texto = textoCompleto(entrada);
  const idioma = detectarIdioma(texto);

  if (texto.includes(MARCA_COMPLEJO)) {
    return {
      suficienteInformacion: false,
      casoComplejo: true,
      idioma,
      resumenSintomas: [],
      preguntasSeguimiento: [],
      sintomas: [],
    };
  }

  const sintomas = [
    {
      descripcion: entrada.descripcion.slice(0, 200),
      zona_cuerpo: "no especificada",
      duracion_estimada: "no especificada",
      relevancia: 4,
    },
  ];
  const resumenSintomas = [entrada.descripcion.slice(0, 80)];

  const hayAlarma = PALABRAS_ALARMA.some((p) => texto.includes(p));
  const mencionadas = especialidadesMencionadas(texto, entrada.especialidades);
  const esAmbigua = mencionadas.length === 0 || !PATRON_DURACION.test(texto);
  const pedirPreguntas =
    texto.includes(MARCA_SIN_FIN) || (!hayAlarma && esAmbigua);

  if (pedirPreguntas) {
    const numeroRonda = entrada.rondas.length + 1;
    return {
      suficienteInformacion: false,
      casoComplejo: false,
      idioma,
      resumenSintomas,
      preguntasSeguimiento: PREGUNTAS_EJEMPLO[idioma === "en" ? "en" : "es"].map(
        (p) => `(${numeroRonda}) ${p}`,
      ),
      sintomas,
    };
  }

  const [especialidad = ESPECIALIDAD_POR_DEFECTO, ...otras] = mencionadas;
  return {
    suficienteInformacion: true,
    idioma,
    resumenSintomas,
    sintomas,
    especialidad,
    nivelUrgencia: hayAlarma ? "emergencia" : "medio",
    motivoDerivacion:
      idioma === "en"
        ? `(Simulated) Based on what you described, ${especialidad} is the most suitable specialty.`
        : `(Simulado) Por lo que describiste, ${especialidad} es la especialidad más adecuada para evaluarte.`,
    especialidadesAlternativas: otras.map((nombre, i) => ({
      especialidad: nombre,
      correspondencia: i === 0 ? "alta" : "media",
    })),
  };
}
