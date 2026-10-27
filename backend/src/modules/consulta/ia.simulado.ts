import type { EntradaAnalisis } from "./ia.service";
import { ESPECIALIDAD_POR_DEFECTO } from "../../constants";

// Palabras clave para probar los distintos caminos del flujo sin gastar crédito:
//   [complejo] → caso complejo (RN-002)
//   [sin_fin]  → siempre pide preguntas (para probar el límite de rondas)
const MARCA_COMPLEJO = "[complejo]";
const MARCA_SIN_FIN = "[sin_fin]";

const PALABRAS_ALARMA = ["pecho", "respirar", "desmay", "convuls", "sangrado"];

const MAPA_ESPECIALIDADES: { palabras: string[]; especialidad: string }[] = [
  { palabras: ["cabeza", "mareo"], especialidad: "Neurología" },
  { palabras: ["pecho", "corazón", "palpita"], especialidad: "Cardiología" },
  {
    palabras: ["estómago", "barriga", "diarrea"],
    especialidad: "Gastroenterología",
  },
  { palabras: ["rodilla", "hueso", "espalda"], especialidad: "Traumatología" },
  { palabras: ["piel", "granos", "mancha"], especialidad: "Dermatología" },
  { palabras: ["ojo", "vista", "borroso"], especialidad: "Oftalmología" },
  {
    palabras: ["oído", "garganta", "nariz"],
    especialidad: "Otorrinolaringología",
  },
];

const PREGUNTAS_EJEMPLO = [
  "¿Hace cuánto tiempo empezaron las molestias?",
  "¿Qué tan fuerte es la molestia, del 1 al 10?",
  "¿Tienes algún otro síntoma, como fiebre o náuseas?",
];

function textoCompleto(entrada: EntradaAnalisis): string {
  const respuestas = entrada.rondas.flatMap((r) =>
    r.preguntas.map((p) => p.respuesta),
  );
  return [entrada.descripcion, ...respuestas].join(" ").toLowerCase();
}

function elegirEspecialidad(texto: string, catalogo: string[]): string {
  const coincidencia = MAPA_ESPECIALIDADES.find(
    (m) =>
      catalogo.includes(m.especialidad) &&
      m.palabras.some((p) => texto.includes(p)),
  );
  return coincidencia?.especialidad ?? ESPECIALIDAD_POR_DEFECTO;
}

export function generarRespuestaSimulada(entrada: EntradaAnalisis): unknown {
  const texto = textoCompleto(entrada);

  if (texto.includes(MARCA_COMPLEJO)) {
    return {
      suficienteInformacion: false,
      casoComplejo: true,
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

  const hayAlarma = PALABRAS_ALARMA.some((p) => texto.includes(p));
  const pedirPreguntas =
    texto.includes(MARCA_SIN_FIN) ||
    (!hayAlarma && entrada.rondas.length === 0);

  if (pedirPreguntas) {
    const numeroRonda = entrada.rondas.length + 1;
    return {
      suficienteInformacion: false,
      casoComplejo: false,
      preguntasSeguimiento: PREGUNTAS_EJEMPLO.map(
        (p) => `(Ronda ${numeroRonda}) ${p}`,
      ),
      sintomas,
    };
  }

  const especialidad = elegirEspecialidad(texto, entrada.especialidades);
  return {
    suficienteInformacion: true,
    sintomas,
    especialidad,
    nivelUrgencia: hayAlarma ? "emergencia" : "medio",
    motivoDerivacion: `(Simulado) Por lo que describiste, ${especialidad} es la especialidad más adecuada para evaluarte.`,
  };
}
