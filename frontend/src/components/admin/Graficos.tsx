"use client";

import {
  ConsultasPorDia,
  EspecialidadEstadistica,
} from "@/services/admin.service";

// ── Gráfico de barras: consultas por día ──────────────────────────────────────

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const ALTURA_MAXIMA = 85; // % del alto disponible: deja lugar al número encima de la barra

function nombreDelDia(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return DIAS_SEMANA[new Date(anio, mes - 1, dia).getDay()];
}

export function GraficoBarras({ datos }: { datos: ConsultasPorDia[] }) {
  const maximo = Math.max(0, ...datos.map((d) => d.total));

  if (maximo === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-12">
        Sin consultas en los últimos {datos.length} días.
      </p>
    );
  }

  return (
    <div className="flex items-end gap-2 h-40 mt-2">
      {datos.map((d, i) => {
        const esHoy = i === datos.length - 1;
        const altura = (d.total / maximo) * ALTURA_MAXIMA;

        return (
          <div
            key={d.fecha}
            className="flex-1 h-full flex flex-col items-center gap-1.5"
          >
            <div className="relative w-full flex-1">
              <div
                className={`absolute inset-x-0 bottom-0 rounded-t-lg transition-colors ${
                  esHoy ? "bg-primary" : "bg-primary/60 hover:bg-primary/80"
                }`}
                style={{
                  height: `${altura}%`,
                  minHeight: d.total > 0 ? "4px" : "0",
                }}
                title={`${d.total} consultas`}
              />
              <span
                className="absolute inset-x-0 text-center text-xs font-medium text-gray-500 tabular-nums"
                style={{ bottom: `calc(${altura}% + 4px)` }}
              >
                {d.total}
              </span>
            </div>
            <span
              className={`text-xs ${esHoy ? "font-semibold text-primary" : "text-gray-400"}`}
            >
              {esHoy ? "Hoy" : nombreDelDia(d.fecha)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Gráfico de dona: distribución por especialidad ───────────────────────────

const MAX_SEGMENTOS = 4;
const COLORES = ["#1B4F72", "#2E86C1", "#16a34a", "#d97706"];
const COLOR_OTRAS = "#9ca3af";

export function GraficoDonut({ datos }: { datos: EspecialidadEstadistica[] }) {
  const total = datos.reduce((suma, d) => suma + d.cantidad, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-12">
        Todavía no hay consultas con especialidad asignada.
      </p>
    );
  }

  // Las 4 principales y el resto agrupado en "Otras"
  const principales = datos.slice(0, MAX_SEGMENTOS);
  const resto = datos.slice(MAX_SEGMENTOS);
  const items = [
    ...principales.map((d, i) => ({
      nombre: d.nombre,
      cantidad: d.cantidad,
      color: COLORES[i],
    })),
    ...(resto.length > 0
      ? [
          {
            nombre: "Otras",
            cantidad: resto.reduce((s, d) => s + d.cantidad, 0),
            color: COLOR_OTRAS,
          },
        ]
      : []),
  ].map((item) => ({ ...item, porcentaje: (item.cantidad / total) * 100 }));

  const radio = 50;
  const circunferencia = 2 * Math.PI * radio;
  const separacion = items.length > 1 ? 1.5 : 0;

  let acumulado = 0;
  const segmentos = items.map((item) => {
    const largo = Math.max(
      0,
      (item.porcentaje / 100) * circunferencia - separacion,
    );
    const offset = circunferencia - (acumulado / 100) * circunferencia;
    acumulado += item.porcentaje;
    return { ...item, largo, offset };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={radio}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="22"
          />
          {segmentos.map((s) => (
            <circle
              key={s.nombre}
              cx="60"
              cy="60"
              r={radio}
              fill="none"
              stroke={s.color}
              strokeWidth="22"
              strokeDasharray={`${s.largo} ${circunferencia}`}
              strokeDashoffset={s.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-800 tabular-nums">
            {total}
          </span>
          <span className="text-[10px] text-gray-400">consultas</span>
        </div>
      </div>

      <div className="space-y-3 flex-1 w-full sm:w-auto">
        {segmentos.map((s) => (
          <div
            key={s.nombre}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-sm text-gray-600 truncate">{s.nombre}</span>
            </div>
            <span className="text-sm font-semibold text-gray-800 flex-shrink-0 tabular-nums">
              {Math.round(s.porcentaje)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
