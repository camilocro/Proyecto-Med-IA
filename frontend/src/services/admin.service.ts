import apiClient from "@/lib/apiClient";
import { ApiResponse } from "@/types";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  consultasHoy: number;
  urgenciasAltas: number;
  medicosActivos: number;
  usuariosRegistrados: number;
}

export interface ConsultaReciente {
  id_consulta: number;
  descripcion_sintomas: string;
  nivel_urgencia: string | null;
  estado: string;
  fecha_consulta: string;
  especialidad_sugerida?: { nombre: string };
  paciente?: { usuario: { nombre: string } };
}

/** Lo que devuelve GET /admin/usuarios (nunca incluye password_hash) */
export interface UsuarioAdmin {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  created_at: string;
}
export interface ConsultasPorDia {
  fecha: string; // 'YYYY-MM-DD'
  total: number;
}

export interface EspecialidadEstadistica {
  nombre: string;
  cantidad: number;
  porcentaje: number;
}

/** Lo que devuelve GET /admin/estadisticas (HU-032) */
export interface EstadisticasAdmin {
  consultasPorDia: ConsultasPorDia[];
  porEspecialidad: EspecialidadEstadistica[];
  resumen: {
    consultasHoy: number;
    consultasAyer: number;
    usuariosNuevosSemana: number;
    especialidadesConMedicos: number;
  };
}

// ── Servicio ──────────────────────────────────────────────────────────────────

export const adminService = {
  getDashboard(): Promise<DashboardMetrics> {
    return apiClient
      .get<ApiResponse<DashboardMetrics>>("/admin/dashboard")
      .then((res) => res.data.data);
  },
  getEstadisticas(): Promise<EstadisticasAdmin> {
    return apiClient
      .get<ApiResponse<EstadisticasAdmin>>("/admin/estadisticas")
      .then((res) => res.data.data);
  },

  getConsultasRecientes(): Promise<ConsultaReciente[]> {
    return apiClient
      .get<ApiResponse<ConsultaReciente[]>>("/admin/consultas")
      .then((res) => res.data.data)
      .catch(() => []);
  },

  getUsuarios(): Promise<UsuarioAdmin[]> {
    return apiClient
      .get<ApiResponse<UsuarioAdmin[]>>("/admin/usuarios")
      .then((res) => res.data.data);
  },

  cambiarEstadoUsuario(id: number, activo: boolean): Promise<UsuarioAdmin> {
    return apiClient
      .patch<
        ApiResponse<UsuarioAdmin>
      >(`/admin/usuarios/${id}/estado`, { activo })
      .then((res) => res.data.data);
  },
};
