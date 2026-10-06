export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
export const SALT_ROUNDS = 12;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
export const DEFAULT_DAILY_LIMIT = 5;
export const MAX_TRIAGE_ROUNDS = 3;
export const CONFIG_KEY_DAILY_LIMIT = "limite_consultas_diarias";
// ─── IA ───────────────────────────────────────────────────────────────────────
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
export const IA_TIMEOUT_MS = 30_000;
export const IA_MAX_REINTENTOS_RED = 2;
export const IA_MAX_INTENTOS_FORMATO = 2;
export const MAX_PREGUNTAS_POR_RONDA = 5;
export const ESPECIALIDAD_POR_DEFECTO = "Medicina General";
// Modo simulado (para pruebas sin consumir la API real de OpenAI)
export const IA_MODO_SIMULADO = process.env.IA_MODO_SIMULADO === "true";
export const IA_SIMULADO_LATENCIA_MS = 800; // imita la demora real (sirve para el indicador de carga)
// ─── Triage ───────────────────────────────────────────────────────────────────
export const MIN_LONGITUD_DESCRIPCION = 10;
export const MAX_LONGITUD_DESCRIPCION = 2000;
export const MAX_LONGITUD_SESION_ID = 100;
export const URGENCIA_CASO_COMPLEJO = "medio" as const;
export const MOTIVO_CASO_COMPLEJO =
  "Derivación automática - caso complejo: tus síntomas necesitan una evaluación presencial " +
  "para poder aclararlos. Te recomendamos acudir a Medicina General.";

//
export const MAX_LONGITUD_RESPUESTA = 500;

export const MAX_MEDICOS_SUGERIDOS = 5;
