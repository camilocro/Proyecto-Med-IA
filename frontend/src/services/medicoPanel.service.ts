import apiClient from '@/lib/apiClient'
import { ApiResponse, Medico } from '@/types'

// ── Tipos ─────────────────────────────────────────────────────────────────────

/** Lo que devuelve GET /medicos/perfil: el médico con su especialidad y centro de salud */
export interface PerfilMedico extends Medico {
  usuario:      { nombre: string }
  especialidad: NonNullable<Medico['especialidad']>
  centro_salud: NonNullable<Medico['centro_salud']>
}

/** HU-041: lo único que el médico puede editar de su perfil */
export interface CambiosPerfilMedico {
  descripcion_profesional?: string
  telefono_contacto?:       string
}

/** HU-061: lo que devuelve GET /medicos/estadisticas */
export interface EstadisticasMedico {
  total:       number         // veces sugerido en el período
  desde:       string | null  // 'AAAA-MM-DD'
  hasta:       string | null
  mesActual:   number
  mesAnterior: number
}

// ── Servicio ──────────────────────────────────────────────────────────────────

export const medicoPanelService = {
  /** HU-040: perfil del médico que inició sesión */
  obtenerPerfil(): Promise<PerfilMedico> {
    return apiClient
      .get<ApiResponse<PerfilMedico>>('/medicos/perfil')
      .then((res) => res.data.data)
  },

  /** HU-041 */
  actualizarPerfil(cambios: CambiosPerfilMedico): Promise<PerfilMedico> {
    return apiClient
      .patch<ApiResponse<PerfilMedico>>('/medicos/perfil', cambios)
      .then((res) => res.data.data)
  },

  /** HU-042: no disponible = deja de aparecer en las sugerencias del triage */
  cambiarDisponibilidad(disponible: boolean): Promise<PerfilMedico> {
    return apiClient
      .patch<ApiResponse<PerfilMedico>>('/medicos/disponibilidad', { disponible })
      .then((res) => res.data.data)
  },

  /** HU-061: sin fechas, el backend usa el último mes */
  obtenerEstadisticas(periodo: { desde?: string; hasta?: string } = {}): Promise<EstadisticasMedico> {
    const params = Object.fromEntries(Object.entries(periodo).filter(([, valor]) => valor))
    return apiClient
      .get<ApiResponse<EstadisticasMedico>>('/medicos/estadisticas', { params })
      .then((res) => res.data.data)
  },

  /** HU-060: la foto ya recortada, como data URL JPEG */
  actualizarFoto(imagen: string): Promise<PerfilMedico> {
    return apiClient
      .patch<ApiResponse<PerfilMedico>>('/medicos/perfil/foto', { imagen })
      .then((res) => res.data.data)
  },

  eliminarFoto(): Promise<PerfilMedico> {
    return apiClient
      .delete<ApiResponse<PerfilMedico>>('/medicos/perfil/foto')
      .then((res) => res.data.data)
  },

  /** HU-059: detalle público de un médico sugerido (no requiere sesión) */
  obtenerDetalle(idMedico: number): Promise<PerfilMedico> {
    return apiClient
      .get<ApiResponse<PerfilMedico>>(`/medicos/${idMedico}`)
      .then((res) => res.data.data)
  },
}
