// Ayudas compartidas por el resultado del triage y el historial.

/** Mismo texto con el que el backend marca la derivación automática (MOTIVO_CASO_COMPLEJO) */
const PREFIJO_CASO_COMPLEJO = "Derivación automática - caso complejo";

/** HU-029: la consulta se derivó automáticamente por ser un caso complejo */
export function esCasoComplejo(motivo: string | null | undefined): boolean {
  return Boolean(motivo?.startsWith(PREFIJO_CASO_COMPLEJO));
}
