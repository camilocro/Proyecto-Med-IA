"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { triageService } from "@/services/triage.service";
import { Consulta, EstadoConsulta, NivelUrgencia } from "@/types";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HistorialFiltros, {
  FiltrosHistorial,
  FILTROS_VACIOS,
} from "@/components/historial/HistorialFiltros";
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  AlertCircle,
  SearchX,
} from "lucide-react";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const ETIQUETA_URGENCIA: Record<
  NivelUrgencia,
  { texto: string; clases: string }
> = {
  bajo: { texto: "Baja", clases: "badge-urgencia-bajo" },
  medio: { texto: "Media", clases: "badge-urgencia-medio" },
  alto: { texto: "Alta", clases: "badge-urgencia-alto" },
  emergencia: { texto: "Emergencia", clases: "badge-urgencia-alto" },
};

const BORDE_URGENCIA: Record<NivelUrgencia, string> = {
  bajo: "border-l-green-400",
  medio: "border-l-amber-400",
  alto: "border-l-red-500",
  emergencia: "border-l-red-700",
};

// Solo se muestra para las que no terminaron: las completadas ya tienen su urgencia
const ETIQUETA_ESTADO: Partial<
  Record<EstadoConsulta, { texto: string; clases: string }>
> = {
  cancelada: { texto: "Cancelada", clases: "bg-red-100 text-red-700" },
  esperando_respuestas: {
    texto: "Sin terminar",
    clases: "bg-amber-100 text-amber-700",
  },
  en_proceso: { texto: "Sin terminar", clases: "bg-amber-100 text-amber-700" },
};

function formatearFecha(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString("es-BO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Filtra en el navegador (HU-063): sin endpoint nuevo. Las fechas se toman en hora local. */
function aplicarFiltros(
  consultas: Consulta[],
  filtros: FiltrosHistorial,
): Consulta[] {
  const desde = filtros.desde ? new Date(`${filtros.desde}T00:00:00`) : null;
  const hasta = filtros.hasta
    ? new Date(`${filtros.hasta}T23:59:59.999`)
    : null;

  return consultas.filter((consulta) => {
    if (
      filtros.especialidad &&
      consulta.especialidad_sugerida?.nombre !== filtros.especialidad
    )
      return false;
    if (filtros.urgencia && consulta.nivel_urgencia !== filtros.urgencia)
      return false;
    if (filtros.estado && consulta.estado !== filtros.estado) return false;

    const fecha = new Date(consulta.fecha_consulta);
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    return true;
  });
}

// ─── Componente ────────────────────────────────────────────────────────────────

export default function HistorialPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosHistorial>(FILTROS_VACIOS);

  useEffect(() => {
    triageService
      .obtenerHistorial()
      .then(setConsultas)
      .catch(() =>
        setError("No se pudo cargar el historial. Verificá tu conexión."),
      )
      .finally(() => setCargando(false));
  }, []);

  // Solo las especialidades que aparecen en el historial del paciente
  const especialidades = useMemo(() => {
    const nombres = consultas
      .map((c) => c.especialidad_sugerida?.nombre)
      .filter((nombre): nombre is string => Boolean(nombre));
    return Array.from(new Set(nombres)).sort((a, b) =>
      a.localeCompare(b, "es"),
    );
  }, [consultas]);

  const consultasFiltradas = useMemo(
    () => aplicarFiltros(consultas, filtros),
    [consultas, filtros],
  );

  if (cargando) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Cargando historial...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between gap-4 mb-8">
            <h1 className="text-2xl font-bold text-primary">Mi Historial</h1>
            <Link
              href="/consulta"
              className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
            >
              Nueva consulta
            </Link>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Sin consultas */}
          {!error && consultas.length === 0 && (
            <div className="text-center py-16">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">
                Aún no tenés consultas
              </p>
              <p className="text-sm text-gray-400 mt-1 mb-6">
                Realizá tu primera consulta para ver el historial aquí.
              </p>
              <Link href="/consulta" className="btn-primary px-6 py-2.5">
                Iniciar consulta
              </Link>
            </div>
          )}

          {consultas.length > 0 && (
            <>
              <HistorialFiltros
                filtros={filtros}
                especialidades={especialidades}
                onChange={setFiltros}
              />

              <p className="text-xs text-gray-400 mb-3">
                Mostrando {consultasFiltradas.length} de {consultas.length}{" "}
                consultas
              </p>

              {/* Sin resultados con los filtros */}
              {consultasFiltradas.length === 0 && (
                <div className="text-center py-12">
                  <SearchX className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">
                    No hay consultas con esos filtros
                  </p>
                  <button
                    type="button"
                    onClick={() => setFiltros(FILTROS_VACIOS)}
                    className="text-sm text-primary hover:underline mt-2"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {consultasFiltradas.map((consulta) => {
                  const urgencia = consulta.nivel_urgencia;
                  const badge = urgencia ? ETIQUETA_URGENCIA[urgencia] : null;
                  const borde = urgencia
                    ? BORDE_URGENCIA[urgencia]
                    : "border-l-gray-300";
                  const badgeEstado = ETIQUETA_ESTADO[consulta.estado];

                  return (
                    <div
                      key={consulta.id_consulta}
                      className={`card border-l-4 ${borde} p-5`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {consulta.especialidad_sugerida && (
                            <p className="font-semibold text-gray-900 mb-1">
                              {consulta.especialidad_sugerida.nombre}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 line-clamp-2">
                            {consulta.descripcion_sintomas}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {formatearFecha(consulta.fecha_consulta)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {badge && (
                            <span className={badge.clases}>{badge.texto}</span>
                          )}
                          {badgeEstado && (
                            <span
                              className={`text-xs font-medium px-2.5 py-1 rounded-full ${badgeEstado.clases}`}
                            >
                              {badgeEstado.texto}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
