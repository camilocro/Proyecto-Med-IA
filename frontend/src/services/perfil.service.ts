import apiClient from '@/lib/apiClient'
import { ApiResponse } from '@/types'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PerfilUsuario {
  id_usuario: number
  nombre:     string
  correo:     string
  rol:        string
  activo:     boolean
  verificado: boolean
  created_at: string
}

export interface ActualizarPerfilInput {
  nombre?:            string
  contrasena?:        string
  contrasena_actual?: string
}

// ── Servicio ──────────────────────────────────────────────────────────────────

export const perfilService = {
  getPerfil(): Promise<PerfilUsuario> {
    return apiClient
      .get<ApiResponse<PerfilUsuario>>('/usuarios/perfil')
      .then((res: { data: ApiResponse<PerfilUsuario> }) => res.data.data)
  },

  actualizarPerfil(cambios: ActualizarPerfilInput): Promise<PerfilUsuario> {
    return apiClient
      .patch<ApiResponse<PerfilUsuario>>('/usuarios/perfil', cambios)
      .then((res: { data: ApiResponse<PerfilUsuario> }) => res.data.data)
  },
}