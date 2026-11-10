// ─── Enums ────────────────────────────────────────────────────────────────────

export type RolUsuario = "paciente" | "medico" | "administrador";
export type NivelUrgencia = "bajo" | "medio" | "alto" | "emergencia";
export type EstadoConsulta =
  | "en_proceso"
  | "esperando_respuestas"
  | "esperando_confirmacion"
  | "completada"
  | "cancelada";

// ─── Entidades ────────────────────────────────────────────────────────────────

export interface Usuario {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  verificado: boolean;
}

export interface Especialidad {
  id_especialidad: number;
  nombre: string;
  descripcion: string;
}

export interface CentroSalud {
  nombre: string;
  direccion: string;
  zona: string;
  telefono?: string;
}

export interface Medico {
  id_medico: number;
  descripcion_profesional: string;
  telefono_contacto: string;
  foto_url?: string | null; // data URL de la foto (HU-060)
  disponible: boolean;
  usuario?: { nombre: string };
  especialidad?: Especialidad;
  centro_salud?: CentroSalud;
}

export interface PreguntaRespuesta {
  id_pr: number;
  pregunta: string;
  respuesta: string;
  orden: number;
}

export interface RondaPreguntas {
  id_ronda: number;
  id_consulta: number;
  numero_ronda: number;
  preguntas: PreguntaRespuesta[];
}

export interface SintomaExtraido {
  descripcion: string;
  zona_cuerpo: string;
  duracion_estimada: string;
}

/** HU-057: otra especialidad que también podría atender el caso */
export interface EspecialidadAlternativa {
  id_especialidad: number;
  nombre: string;
  correspondencia: "alta" | "media";
}

export interface Consulta {
  id_consulta: number;
  descripcion_sintomas: string;
  nivel_urgencia?: NivelUrgencia;
  estado: EstadoConsulta;
  fecha_consulta: string;
  especialidad_sugerida?: Especialidad;
  motivo_derivacion?: string | null; // por qué se sugiere esa especialidad (HU-010 CA-5, HU-029)
  medicos_sugeridos?: { medico: Medico }[];
  rondas?: RondaPreguntas[];
  sintomas_extraidos?: SintomaExtraido[];
  resumen_sintomas?: string | null; // HU-055
  especialidades_alternativas?: EspecialidadAlternativa[] | null; // HU-057
  correoEnviado?: boolean | null; // solo al completarse (HU-070); null = no corresponde enviar
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginInput {
  correo: string;
  password: string;
}

export interface RegisterInput {
  nombre: string;
  correo: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
