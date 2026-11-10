import apiClient from "@/lib/apiClient";
import { ApiResponse } from "@/types";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PerfilUsuario {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  verificado: boolean;
  created_at: string;
  recibir_correos: boolean;
  doble_factor: boolean;
}

export interface ActualizarPerfilInput {
  nombre?: string;
  correo?: string;
  contrasena?: string;
  contrasena_actual?: string;
  recibir_correos?: boolean;
}

// ── Servicio ──────────────────────────────────────────────────────────────────

export const perfilService = {
  getPerfil(): Promise<PerfilUsuario> {
    return apiClient
      .get<ApiResponse<PerfilUsuario>>("/usuarios/perfil")
      .then((res: { data: ApiResponse<PerfilUsuario> }) => res.data.data);
  },

  /** Si cambió la contraseña, trae un token nuevo: las demás sesiones se cerraron (HU-043 CA-4) */
  actualizarPerfil(
    cambios: ActualizarPerfilInput,
  ): Promise<PerfilUsuario & { token?: string }> {
    return apiClient
      .patch<ApiResponse<PerfilUsuario & { token?: string }>>(
        "/usuarios/perfil",
        cambios,
      )
      .then((res) => res.data.data);
  },

  eliminarCuenta(password: string): Promise<void> {
    // DELETE con body: axios lo envía en "data"
    return apiClient
      .delete("/usuarios/perfil", { data: { password } })
      .then(() => undefined);
  },

  cambiarDobleFactor(
    activar: boolean,
    password: string,
  ): Promise<{ doble_factor: boolean; codigosRecuperacion?: string[] }> {
    return apiClient
      .patch<
        ApiResponse<{ doble_factor: boolean; codigosRecuperacion?: string[] }>
      >("/usuarios/perfil/doble-factor", { activar, password })
      .then((res) => res.data.data);
  },
};
