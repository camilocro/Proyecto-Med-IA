import apiClient from '@/lib/apiClient'
import { ApiResponse } from '@/types'

// ── Tipos ─────────────────────────────────────────────────────────────────────

/** Lo que devuelve GET /especialidades: solo las activas, con la cantidad de médicos */
export interface EspecialidadAdmin {
  id_especialidad: number
  nombre:          string
  descripcion:     string
  activo:          boolean
  _count:          { medicos: number }
}

export interface DatosEspecialidad {
  nombre:      string
  descripcion: string
}

// ── Servicio ──────────────────────────────────────────────────────────────────

export const especialidadService = {
  listar(): Promise<EspecialidadAdmin[]> {
    return apiClient
      .get<ApiResponse<EspecialidadAdmin[]>>('/especialidades')
      .then((res) => res.data.data)
  },

  crear(datos: DatosEspecialidad): Promise<EspecialidadAdmin> {
    return apiClient
      .post<ApiResponse<EspecialidadAdmin>>('/especialidades', datos)
      .then((res) => res.data.data)
  },

  actualizar(idEspecialidad: number, cambios: Partial<DatosEspecialidad>): Promise<EspecialidadAdmin> {
    return apiClient
      .patch<ApiResponse<EspecialidadAdmin>>(`/especialidades/${idEspecialidad}`, cambios)
      .then((res) => res.data.data)
  },

  desactivar(idEspecialidad: number): Promise<{ medicosVinculados: number }> {
    return apiClient
      .delete<ApiResponse<{ message: string; medicosVinculados: number }>>(`/especialidades/${idEspecialidad}`)
      .then((res) => ({ medicosVinculados: res.data.data.medicosVinculados }))
  },
}
