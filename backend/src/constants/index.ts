export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
export const SALT_ROUNDS = 12;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
export const DEFAULT_DAILY_LIMIT = 5;
export const MAX_TRIAGE_ROUNDS = 3;
export const CONFIG_KEY_DAILY_LIMIT = "limite_consultas_diarias";
// ─── IA ───────────────────────────────────────────────────────────────────────
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
export const IA_TIMEOUT_MS = 15_000;
export const IA_MAX_REINTENTOS_RED = 1;
export const IA_MAX_INTENTOS_FORMATO = 2;
export const MAX_PREGUNTAS_POR_RONDA = 5;
export const PREGUNTAS_RECOMENDADAS = 3; // lo que se le pide a la IA; MAX_PREGUNTAS_POR_RONDA es el tope duro
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
export const MAX_ESPECIALIDADES_ALTERNATIVAS = 2; // HU-057
export const MAX_ITEMS_RESUMEN = 5; // HU-055: "Entendí que tienes: …"
export const MENSAJE_IDIOMA_NO_SOPORTADO =
  "Med-IA opera en español e inglés; por favor, reformulá tu consulta."; // HU-054

// ─── Admin ────────────────────────────────────────────────────────────────────
export const MAX_CONSULTAS_RECIENTES_ADMIN = 20; // también es el tamaño de página de la sección Consultas

// ─── Perfil ───────────────────────────────────────────────────────────────────
export const MIN_LONGITUD_NOMBRE = 2;
export const MAX_LONGITUD_NOMBRE = 100;
export const MIN_LONGITUD_PASSWORD = 8;

export const DIAS_GRAFICO_CONSULTAS = 7;

// Consultas completadas anteriores que se envían a la IA como contexto (HU-014, HU-056)
export const MAX_CONSULTAS_HISTORIAL_IA = 3;

// ─── Médicos y especialidades ─────────────────────────────────────────────────
export const MIN_LONGITUD_DESCRIPCION_MEDICO = 10;
export const MAX_LONGITUD_DESCRIPCION_MEDICO = 500;
export const MIN_LONGITUD_TELEFONO = 7;
export const MAX_LONGITUD_TELEFONO = 15;
export const LONGITUD_PASSWORD_TEMPORAL = 10;
export const MAX_LONGITUD_NOMBRE_ESPECIALIDAD = 60;
export const MIN_LONGITUD_DESCRIPCION_ESPECIALIDAD = 10;
export const MAX_LONGITUD_DESCRIPCION_ESPECIALIDAD = 300;
export const MAX_LIMITE_DIARIO = 100;

// ─── Consultas del admin, reportes y estadísticas (Sprint 4) ─────────────────
export const MAX_CONSULTAS_EXPORTACION = 1000; // tope de filas al exportar CSV/PDF (HU-068)
export const MAX_MEDICOS_RANKING = 10; // HU-069
export const DIAS_PERIODO_POR_DEFECTO = 30; // "último mes" en ranking y estadísticas
export const MAX_BYTES_FOTO_MEDICO = 64 * 1024; // foto ya recortada a 256×256 (HU-060)
// ─── Enlaces por correo (HU-004, HU-044) ──────────────────────────────────────
export const HORAS_VIGENCIA_TOKEN_CORREO = 24;
export const MINUTOS_ENTRE_CORREOS = 2; // evita usar el formulario para llenar el buzón de alguien
// ─── Verificación en dos pasos (HU-046) ───────────────────────────────────────
export const MINUTOS_VIGENCIA_CODIGO_2FA = 10;
export const MAX_INTENTOS_2FA = 3;
export const CANTIDAD_CODIGOS_RECUPERACION = 8;
// ─── Registro de accesos (HU-047) ─────────────────────────────────────────────
export const MAX_ACCESOS_POR_PAGINA = 25;
export const MAX_ACCESOS_EXPORTACION = 2000; // tope de filas al exportar CSV
export const MAX_ACCESOS_DETALLE_IP = 20; // últimos accesos que muestra el detalle de una IP
