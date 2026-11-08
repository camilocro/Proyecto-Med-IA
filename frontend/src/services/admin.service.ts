import apiClient from "@/lib/apiClient";
import {
  ApiResponse,
  EstadoConsulta,
  NivelUrgencia,
  RondaPreguntas,
} from "@/types";

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
  especialidad_sugerida?: { nombre: string } | null;
  paciente?: { usuario: { id_usuario?: number; nombre: string } } | null;
}

/** GET /admin/consultas: una página de resultados (HU-031) */
export interface PaginaConsultas {
  consultas: ConsultaReciente[];
  total: number;
  pagina: number;
  porPagina: number;
}

/** Filtros de la sección Consultas; las fechas van en 'AAAA-MM-DD' */
export interface FiltrosConsultasAdmin {
  desde?: string;
  hasta?: string;
  urgencia?: NivelUrgencia | "";
  estado?: EstadoConsulta | "";
  pagina?: number;
  porPagina?: number;
}

/** GET /admin/consultas/:id y cada consulta del historial de un usuario (HU-026) */
export interface ConsultaDetalleAdmin extends ConsultaReciente {
  motivo_derivacion: string | null;
  resumen_sintomas?: string | null;
  sintomas_extraidos: {
    descripcion: string;
    zona_cuerpo: string | null;
    duracion_estimada: string | null;
  }[];
  rondas: RondaPreguntas[];
  medicos_sugeridos: {
    medico: {
      id_medico: number;
      usuario: { nombre: string };
      especialidad: { nombre: string };
      centro_salud: { nombre: string };
    };
  }[];
}

export interface HistorialUsuarioAdmin {
  usuario: Pick<UsuarioAdmin, "id_usuario" | "nombre" | "correo" | "rol">;
  consultas: ConsultaDetalleAdmin[];
}

/** GET /admin/ranking-medicos (HU-069) */
export interface MedicoRanking {
  id_medico: number;
  nombre: string;
  especialidad: string;
  total: number;
  sugerencias: { id_consulta: number; fecha: string; especialidad: string }[];
}

export interface RankingMedicos {
  desde: string | null;
  hasta: string | null;
  medicos: MedicoRanking[];
}

/** Quita los filtros vacíos para no mandar "?urgencia=" al backend */
function paramsSinVacios(
  filtros: Record<string, string | number | undefined>,
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(filtros).filter(
      (entrada): entrada is [string, string | number] =>
        entrada[1] !== undefined && entrada[1] !== "",
    ),
  );
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

/** Lo que devuelve GET /admin/configuracion */
export interface ConfiguracionSistema {
  id_config: number;
  clave: string;
  valor: string;
  updated_at: string;
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

  /** Las más recientes para el Dashboard: la primera página sin filtros */
  getConsultasRecientes(): Promise<ConsultaReciente[]> {
    return apiClient
      .get<ApiResponse<PaginaConsultas>>("/admin/consultas")
      .then((res) => res.data.data?.consultas ?? [])
      .catch(() => []);
  },

  listarConsultas(filtros: FiltrosConsultasAdmin): Promise<PaginaConsultas> {
    return apiClient
      .get<ApiResponse<PaginaConsultas>>("/admin/consultas", {
        params: paramsSinVacios({ ...filtros }),
      })
      .then((res) => res.data.data);
  },

  getDetalleConsulta(id: number): Promise<ConsultaDetalleAdmin> {
    return apiClient
      .get<ApiResponse<ConsultaDetalleAdmin>>(`/admin/consultas/${id}`)
      .then((res) => res.data.data);
  },

  getHistorialUsuario(
    id: number,
    fechas: { desde?: string; hasta?: string } = {},
  ): Promise<HistorialUsuarioAdmin> {
    return apiClient
      .get<ApiResponse<HistorialUsuarioAdmin>>(`/admin/usuarios/${id}/consultas`, {
        params: paramsSinVacios(fechas),
      })
      .then((res) => res.data.data);
  },

  getRankingMedicos(
    fechas: { desde?: string; hasta?: string } = {},
  ): Promise<RankingMedicos> {
    return apiClient
      .get<ApiResponse<RankingMedicos>>("/admin/ranking-medicos", {
        params: paramsSinVacios(fechas),
      })
      .then((res) => res.data.data);
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

  getConfiguracion(): Promise<ConfiguracionSistema[]> {
    return apiClient
      .get<ApiResponse<ConfiguracionSistema[]>>("/admin/configuracion")
      .then((res) => res.data.data);
  },

  actualizarConfiguracion(
    clave: string,
    valor: string,
  ): Promise<ConfiguracionSistema> {
    return apiClient
      .patch<
        ApiResponse<ConfiguracionSistema>
      >("/admin/configuracion", { clave, valor })
      .then((res) => res.data.data);
  },
};
