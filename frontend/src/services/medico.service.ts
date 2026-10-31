import apiClient from '@/lib/apiClient'
import { ApiResponse } from '@/types'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface EspecialidadResumen {
  id_especialidad: number
  nombre:          string
  descripcion:     string
  activo:          boolean
}

export interface CentroSaludResumen {
  id_centro_salud: number
  nombre:          string
  direccion:       string
  zona:            string
}

/** Lo que devuelve GET /medicos para el administrador (nunca incluye password_hash) */
export interface MedicoAdmin {
  id_medico:               number
  id_usuario:              number
  id_especialidad:         number
  id_centro_salud:         number
  descripcion_profesional: string
  telefono_contacto:       string
  disponible:              boolean
  usuario:                 { id_usuario: number; nombre: string; correo: string; activo: boolean }
  especialidad:            EspecialidadResumen
  centro_salud:            CentroSaludResumen
}

export interface DatosMedico {
  nombre:                  string
  correo:                  string
  id_especialidad:         number
  id_centro_salud:         number
  descripcion_profesional: string
  telefono_contacto:       string
}

export interface MedicoCreado {
  medico:           MedicoAdmin
  passwordTemporal: string
}

// ── Servicio ──────────────────────────────────────────────────────────────────

export const medicoService = {
  listar(): Promise<MedicoAdmin[]> {
    return apiClient
      .get<ApiResponse<MedicoAdmin[]>>('/medicos')
      .then((res) => res.data.data)
  },

  listarCentros(): Promise<CentroSaludResumen[]> {
    return apiClient
      .get<ApiResponse<CentroSaludResumen[]>>('/medicos/centros')
      .then((res) => res.data.data)
  },

  crear(datos: DatosMedico): Promise<MedicoCreado> {
    return apiClient
      .post<ApiResponse<MedicoCreado>>('/medicos', datos)
      .then((res) => res.data.data)
  },

  actualizar(idMedico: number, cambios: Partial<DatosMedico>): Promise<MedicoAdmin> {
    return apiClient
      .patch<ApiResponse<MedicoAdmin>>(`/medicos/${idMedico}`, cambios)
      .then((res) => res.data.data)
  },

  cambiarEstado(idMedico: number, activo: boolean): Promise<MedicoAdmin> {
    return apiClient
      .patch<ApiResponse<MedicoAdmin>>(`/medicos/${idMedico}/estado`, { activo })
      .then((res) => res.data.data)
  },
}
