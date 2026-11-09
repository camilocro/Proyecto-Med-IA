/**
 * HU-070 (Persona 3): envía al paciente registrado el resumen de su consulta completada.
 * Punto de integración acordado con el triage (HU-053): devuelve true si el correo
 * se envió y nunca lanza errores. Mientras no esté implementado no envía nada.
 */
export async function notificarConsultaCompletada(_idConsulta: number): Promise<boolean> {
  return false
}
