import apiClient from "@/lib/apiClient";
import { Consulta, Medico } from "@/types";

// Las peticiones que llaman a la IA tardan más que el resto:
// el backend puede esperar hasta ~60 s, así que el frontend espera un poco más.
const TIMEOUT_TRIAGE_MS = 65_000;

interface RespuestaRonda {
  id_pr: number;
  respuesta: string;
}
export interface ContadorConsultas {
  limite: number;
  usadas: number;
  restantes: number;
  reinicio: string; // ISO
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

  /** HU-053: corrige una respuesta antes de confirmar (vuelve a analizar) */
  async editarRespuesta(
    idConsulta: number,
    idPr: number,
    respuesta: string,
  ): Promise<Consulta> {
    const { data } = await apiClient.patch<{ data: Consulta }>(
      `/consultas/${idConsulta}/respuestas/${idPr}`,
      { respuesta },
      { timeout: TIMEOUT_TRIAGE_MS },
    );
    return data.data;
  },

  /** HU-053: confirma el resumen; la respuesta trae el resultado y correoEnviado */
  async confirmarConsulta(idConsulta: number): Promise<Consulta> {
    const { data } = await apiClient.post<{ data: Consulta }>(
      `/consultas/${idConsulta}/confirmar`,
      undefined,
      { timeout: TIMEOUT_TRIAGE_MS },
    );
    return data.data;
  },

  /** HU-052: misma consulta con otra descripción (no descuenta otra del límite) */
  async reiniciarConsulta(
    idConsulta: number,
    descripcionSintomas: string,
  ): Promise<Consulta> {
    const { data } = await apiClient.post<{ data: Consulta }>(
      `/consultas/${idConsulta}/reiniciar`,
      { descripcion_sintomas: descripcionSintomas },
      { timeout: TIMEOUT_TRIAGE_MS },
    );
    return data.data;
  },

  async cancelarConsulta(idConsulta: number): Promise<void> {
    await apiClient.patch(`/consultas/${idConsulta}/cancelar`);
  },

  /** HU-065: la quita del historial del paciente */
  async eliminarConsulta(idConsulta: number): Promise<void> {
    await apiClient.delete(`/consultas/${idConsulta}`);
  },

  /** HU-057: médicos disponibles de una especialidad alternativa (público) */
  async obtenerMedicosDeEspecialidad(idEspecialidad: number): Promise<Medico[]> {
    const { data } = await apiClient.get<{ data: Medico[] }>(
      `/medicos/especialidad/${idEspecialidad}`,
    );
    return data.data;
  },

  async obtenerHistorial(): Promise<Consulta[]> {
    const { data } = await apiClient.get<{ data: Consulta[] }>(
      "/consultas/historial",
    );
    return data.data;
  },

  async obtenerRestantes(): Promise<ContadorConsultas> {
    const { data } = await apiClient.get<{ data: ContadorConsultas }>(
      "/consultas/restantes",
    );
    return data.data;
  },
};
