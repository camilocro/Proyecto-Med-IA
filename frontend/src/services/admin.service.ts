import apiClient from '@/lib/apiClient'
import { ApiResponse, Usuario } from '@/types'

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

export interface UsuarioAdmin extends Usuario {
  activo: boolean
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

  getUsuarios(): Promise<UsuarioAdmin[]> {
    return apiClient
      .get<ApiResponse<UsuarioAdmin[]>>('/admin/usuarios')
      .then((res) => res.data.data)
  },

  cambiarEstadoUsuario(id: number, activo: boolean): Promise<UsuarioAdmin> {
    return apiClient
      .patch<ApiResponse<UsuarioAdmin>>(`/admin/usuarios/${id}/estado`, { activo })
      .then((res) => res.data.data)
  },
}