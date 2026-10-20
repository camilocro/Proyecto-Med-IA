import apiClient from '@/lib/apiClient'
import { ApiResponse } from '@/types'

export interface DashboardMetrics {
  consultasHoy:        number
  urgenciasAltas:      number
  medicosActivos:      number
  usuariosRegistrados: number
}

export interface ConsultaReciente {
  id_consulta:          number
  descripcion_sintomas: string
  nivel_urgencia:       string | null
  estado:               string
  fecha_consulta:       string
  especialidad_sugerida?: { nombre: string }
  paciente?:              { usuario: { nombre: string } }
}

export const adminService = {
  getDashboard(): Promise<DashboardMetrics> {
    return apiClient
      .get<ApiResponse<DashboardMetrics>>('/admin/dashboard')
      .then((res) => res.data.data)
  },

  getConsultasRecientes(): Promise<ConsultaReciente[]> {
    return apiClient
      .get<ApiResponse<ConsultaReciente[]>>('/admin/consultas')
      .then((res) => res.data.data)
      .catch(() => [])
  },
}