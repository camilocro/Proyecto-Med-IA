import { badRequest } from "../errors/AppError";

export function getTodayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// ─── Filtros por fecha de los reportes (Sprint 4) ────────────────────────────

const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'AAAA-MM-DD' en hora local del servidor (la misma que usa el límite diario) */
export function formatearFechaLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** 'AAAA-MM-DD' → inicio de ese día en hora local. null si no es una fecha real. */
export function parsearFechaLocal(valor: string): Date | null {
  const partes = FORMATO_FECHA.exec(valor);
  if (!partes) return null;
  const [anio, mes, dia] = partes.slice(1).map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  // new Date(2026, 1, 31) "se pasa" a marzo: así se descartan fechas imposibles
  if (fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return null;
  return fecha;
}

/** Rango listo para Prisma: `gte` inclusivo y `lt` exclusivo (el día siguiente a "hasta"). */
export interface RangoFechas {
  gte?: Date;
  lt?: Date;
}

/**
 * Lee los parámetros ?desde&hasta (AAAA-MM-DD, ambos días incluidos).
 * Sin fechas y con `diasPorDefecto`, usa los últimos N días contando hoy.
 */
export function parsearRangoFechas(
  desde: unknown,
  hasta: unknown,
  diasPorDefecto?: number,
): RangoFechas {
  const leer = (valor: unknown, nombre: string): Date | undefined => {
    if (valor === undefined || valor === "") return undefined;
    const fecha = typeof valor === "string" ? parsearFechaLocal(valor) : null;
    if (!fecha) {
      throw badRequest(`La fecha "${nombre}" no es válida. Usa el formato AAAA-MM-DD`);
    }
    return fecha;
  };

  const inicio = leer(desde, "desde");
  const fin = leer(hasta, "hasta");
  if (inicio && fin && inicio > fin) {
    throw badRequest('La fecha "desde" no puede ser posterior a "hasta"');
  }

  if (!inicio && !fin && diasPorDefecto) {
    const { start, end } = getTodayRange();
    start.setDate(start.getDate() - (diasPorDefecto - 1));
    return { gte: start, lt: end };
  }

  const rango: RangoFechas = {};
  if (inicio) rango.gte = inicio;
  if (fin) {
    rango.lt = new Date(fin);
    rango.lt.setDate(rango.lt.getDate() + 1);
  }
  return rango;
}
