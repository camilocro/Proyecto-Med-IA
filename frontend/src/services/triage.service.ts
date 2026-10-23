import apiClient from "@/lib/apiClient";
import { Consulta } from "@/types";

// Las peticiones que llaman a la IA tardan más que el resto:
// el backend puede esperar hasta ~60 s, así que el frontend espera un poco más.
const TIMEOUT_TRIAGE_MS = 65_000;

interface RespuestaRonda {
  id_pr: number;
  respuesta: string;
}

export const triageService = {
  async iniciarConsulta(descripcionSintomas: string): Promise<Consulta> {
    const { data } = await apiClient.post<{ data: Consulta }>(
      "/consultas",
      { descripcion_sintomas: descripcionSintomas },
      { timeout: TIMEOUT_TRIAGE_MS },
    );
    return data.data;
  },

  async responderRonda(
    idConsulta: number,
    idRonda: number,
    respuestas: RespuestaRonda[],
  ): Promise<Consulta> {
    const { data } = await apiClient.post<{ data: Consulta }>(
      `/consultas/${idConsulta}/rondas/${idRonda}/respuestas`,
      { respuestas },
      { timeout: TIMEOUT_TRIAGE_MS },
    );
    return data.data;
  },

  async obtenerConsulta(idConsulta: number): Promise<Consulta> {
    const { data } = await apiClient.get<{ data: Consulta }>(
      `/consultas/${idConsulta}`,
    );
    return data.data;
  },

  async cancelarConsulta(idConsulta: number): Promise<void> {
    await apiClient.patch(`/consultas/${idConsulta}/cancelar`);
  },

  async obtenerHistorial(): Promise<Consulta[]> {
    const { data } = await apiClient.get<{ data: Consulta[] }>(
      "/consultas/historial",
    );
    return data.data;
  },
};
