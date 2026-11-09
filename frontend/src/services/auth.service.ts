import apiClient from "@/lib/apiClient";
import { AuthResponse, LoginInput, RegisterInput } from "@/types";

export const authService = {
  async login(credentials: LoginInput): Promise<AuthResponse> {
    const { data } = await apiClient.post<{ data: AuthResponse }>(
      "/auth/login",
      credentials,
    );
    return data.data;
  },

  async register(input: RegisterInput): Promise<AuthResponse> {
    const { data } = await apiClient.post<{ data: AuthResponse }>(
      "/auth/register",
      input,
    );
    return data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  async solicitarRecuperacion(correo: string): Promise<string> {
    const { data } = await apiClient.post<{ data: { message: string } }>(
      "/auth/recuperar",
      { correo },
    );
    return data.data.message;
  },

  async restablecerPassword(token: string, password: string): Promise<string> {
    const { data } = await apiClient.post<{ data: { message: string } }>(
      "/auth/restablecer",
      { token, password },
    );
    return data.data.message;
  },

  async verificarCorreo(token: string): Promise<string> {
    const { data } = await apiClient.post<{ data: { message: string } }>(
      "/auth/verificar",
      { token },
    );
    return data.data.message;
  },

  async reenviarVerificacion(correo: string): Promise<string> {
    const { data } = await apiClient.post<{ data: { message: string } }>(
      "/auth/reenviar-verificacion",
      { correo },
    );
    return data.data.message;
  },
};
