import apiClient from '@/lib/apiClient'
import { Consulta } from '@/types'

interface RespuestaRonda {
  id_pr:     number
  respuesta: string
}

export const triageService = {
  async iniciarConsulta(descripcionSintomas: string): Promise<Consulta> {
    const { data } = await apiClient.post<{ data: Consulta }>('/consultas', { descripcion_sintomas: descripcionSintomas })
    return data.data
  },

  async responderRonda(idConsulta: number, idRonda: number, respuestas: RespuestaRonda[]): Promise<Consulta> {
    const { data } = await apiClient.post<{ data: Consulta }>(
      `/consultas/${idConsulta}/rondas/${idRonda}/respuestas`,
      { respuestas },
    )
    return data.data
  },

  async obtenerConsulta(idConsulta: number): Promise<Consulta> {
    const { data } = await apiClient.get<{ data: Consulta }>(`/consultas/${idConsulta}`)
    return data.data
  },

  async cancelarConsulta(idConsulta: number): Promise<void> {
    await apiClient.patch(`/consultas/${idConsulta}/cancelar`)
  },

  async obtenerHistorial(): Promise<Consulta[]> {
    const { data } = await apiClient.get<{ data: Consulta[] }>('/consultas/historial')
    return data.data
  },
}
