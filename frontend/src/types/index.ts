// ─── Enums ────────────────────────────────────────────────────────────────────

export type RolUsuario     = 'paciente' | 'medico' | 'administrador'
export type NivelUrgencia  = 'bajo' | 'medio' | 'alto' | 'emergencia'
export type EstadoConsulta = 'en_proceso' | 'esperando_respuestas' | 'completada' | 'cancelada'

// ─── Entidades ────────────────────────────────────────────────────────────────

export interface Usuario {
  id_usuario: number
  nombre:     string
  correo:     string
  rol:        RolUsuario
  activo:     boolean
  verificado: boolean
}

export interface Especialidad {
  id_especialidad: number
  nombre:          string
  descripcion:     string
}

export interface CentroSalud {
  nombre:    string
  direccion: string
  zona:      string
}

export interface Medico {
  id_medico:               number
  descripcion_profesional: string
  telefono_contacto:       string
  foto_url?:               string
  disponible:              boolean
  usuario?:                { nombre: string }
  especialidad?:           Especialidad
  centro_salud?:           CentroSalud
}

export interface PreguntaRespuesta {
  id_pr:     number
  pregunta:  string
  respuesta: string
  orden:     number
}

export interface RondaPreguntas {
  id_ronda:     number
  id_consulta:  number
  numero_ronda: number
  preguntas:    PreguntaRespuesta[]
}

export interface Consulta {
  id_consulta:          number
  descripcion_sintomas: string
  nivel_urgencia?:      NivelUrgencia
  estado:               EstadoConsulta
  fecha_consulta:       string
  especialidad_sugerida?: Especialidad
  medicos_sugeridos?:     { medico: Medico }[]
  rondas?:                RondaPreguntas[]
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginInput {
  correo:   string
  password: string
}

export interface RegisterInput {
  nombre:   string
  correo:   string
  password: string
}

export interface AuthResponse {
  token:   string
  usuario: Usuario
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data:    T
  message?: string
}
