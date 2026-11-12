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
import ConfirmarDialogo from "@/components/admin/ConfirmarDialogo";
import Modal from "@/components/admin/Modal";
import DetalleConsulta from "@/components/admin/DetalleConsulta";
import { ConsultaDetalleAdmin } from "@/services/admin.service";
import { esCasoComplejo } from "@/lib/triage";
import {
  descargarPDF,
  fechaParaArchivo,
  fechaHoraLegible,
} from "@/lib/exportar";
import { mensajeDeError } from "@/lib/errores";
import {
  Calendar,
  ClipboardList,
  AlertCircle,
  SearchX,
  FileDown,
  Loader2,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { EsqueletoPagina } from "@/components/ui/Esqueleto";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const CONSULTAS_POR_PAGINA = 10; // HU-025 CA-4

/** El detalle reusa el componente del administrador: se adapta la consulta a su forma */
function aDetalle(consulta: Consulta): ConsultaDetalleAdmin {
  return {
    id_consulta: consulta.id_consulta,
    descripcion_sintomas: consulta.descripcion_sintomas,
    nivel_urgencia: consulta.nivel_urgencia ?? null,
    estado: consulta.estado,
    fecha_consulta: consulta.fecha_consulta,
    especialidad_sugerida: consulta.especialidad_sugerida ?? null,
    paciente: null,
    motivo_derivacion: consulta.motivo_derivacion ?? null,
    resumen_sintomas: consulta.resumen_sintomas ?? null,
    sintomas_extraidos: consulta.sintomas_extraidos ?? [],
    rondas: consulta.rondas ?? [],
    medicos_sugeridos: (consulta.medicos_sugeridos ?? []).map(({ medico }) => ({
      medico: {
        id_medico: medico.id_medico,
        usuario: { nombre: medico.usuario?.nombre ?? "Médico" },
        especialidad: { nombre: medico.especialidad?.nombre ?? "—" },
        centro_salud: { nombre: medico.centro_salud?.nombre ?? "—" },
      },
    })),
  };
}

type EstadoDetalle =
  | { tipo: "cargando" }
  | { tipo: "listo"; consulta: Consulta }
  | { tipo: "error"; mensaje: string };

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
  // HU-053: la IA ya tiene un resultado, pero el paciente no lo confirmó
  esperando_confirmacion: {
    texto: "Por confirmar",
    clases: "bg-sky-100 text-sky-700",
  },
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

/** "Sin terminar" agrupa las que esperan respuestas y las que quedaron en proceso */
function coincideEstado(
  estado: EstadoConsulta,
  filtro: EstadoConsulta,
): boolean {
  if (filtro === "esperando_respuestas")
    return estado === "esperando_respuestas" || estado === "en_proceso";
  return estado === filtro;
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
    if (filtros.estado && !coincideEstado(consulta.estado, filtros.estado))
      return false;

    const fecha = new Date(consulta.fecha_consulta);
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    return true;
  });
}

/** Filtros activos en texto, para el encabezado del PDF (HU-064 CA-3) */
function describirFiltros(filtros: FiltrosHistorial): string[] {
  const lineas: string[] = [];
  if (filtros.desde || filtros.hasta) {
    lineas.push(
      `Período: ${filtros.desde ? `desde el ${filtros.desde}` : ""}${filtros.desde && filtros.hasta ? " " : ""}${filtros.hasta ? `hasta el ${filtros.hasta}` : ""}`,
    );
  }
  if (filtros.especialidad)
    lineas.push(`Especialidad: ${filtros.especialidad}`);
  if (filtros.urgencia)
    lineas.push(`Urgencia: ${ETIQUETA_URGENCIA[filtros.urgencia].texto}`);
  if (filtros.estado)
    lineas.push(
      `Estado: ${filtros.estado === "completada" ? "Completada" : (ETIQUETA_ESTADO[filtros.estado]?.texto ?? filtros.estado)}`,
    );
  return lineas;
}

/** HU-064: PDF con las consultas que se ven en pantalla, de la más reciente a la más antigua */
async function descargarHistorialPDF(
  consultas: Consulta[],
  filtros: FiltrosHistorial,
) {
  await descargarPDF({
    nombreArchivo: `med-ia-mi-historial-${fechaParaArchivo()}.pdf`,
    titulo: "Mi historial de consultas",
    detalles: [
      ...describirFiltros(filtros),
      "Orientación preliminar generada por IA: no reemplaza el diagnóstico de un médico.",
    ],
    columnas: [
      "Fecha",
      "Síntomas",
      "Especialidad",
      "Urgencia",
      "Médicos recomendados",
    ],
    filas: consultas.map((c) => [
      fechaHoraLegible(c.fecha_consulta),
      c.descripcion_sintomas,
      c.especialidad_sugerida?.nombre ??
        ETIQUETA_ESTADO[c.estado]?.texto ??
        "—",
      c.nivel_urgencia ? ETIQUETA_URGENCIA[c.nivel_urgencia].texto : "—",
      c.medicos_sugeridos
        ?.map(({ medico }) => medico.usuario?.nombre)
        .filter(Boolean)
        .join(", ") || "—",
    ]),
    mensajeVacio: "No hay consultas para exportar.",
    horizontal: true,
  });
}

// ─── Componente ────────────────────────────────────────────────────────────────

export default function HistorialPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosHistorial>(FILTROS_VACIOS);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [avisoPDF, setAvisoPDF] = useState<string | null>(null);
  // HU-065: eliminar una consulta del historial
  const [aEliminar, setAEliminar] = useState<Consulta | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
  const [avisoEliminada, setAvisoEliminada] = useState(false);
  const [pagina, setPagina] = useState(1);
  // HU-025 CA-2 / HU-024 CA-3: detalle completo de una consulta (preguntas, respuestas, médicos)
  const [detalle, setDetalle] = useState<EstadoDetalle | null>(null);

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

  const totalPaginas = Math.max(
    1,
    Math.ceil(consultasFiltradas.length / CONSULTAS_POR_PAGINA),
  );
  const paginaActual = Math.min(pagina, totalPaginas);
  const consultasPagina = consultasFiltradas.slice(
    (paginaActual - 1) * CONSULTAS_POR_PAGINA,
    paginaActual * CONSULTAS_POR_PAGINA,
  );

  function verDetalle(idConsulta: number) {
    setDetalle({ tipo: "cargando" });
    triageService
      .obtenerConsulta(idConsulta)
      .then((consulta) => setDetalle({ tipo: "listo", consulta }))
      .catch((err) =>
        setDetalle({
          tipo: "error",
          mensaje: mensajeDeError(
            err,
            "No se pudo cargar el detalle de la consulta.",
          ),
        }),
      );
  }

  async function handleDescargarPDF() {
    // CA-4: sin consultas no se genera un archivo vacío
    if (consultasFiltradas.length === 0) {
      setAvisoPDF("No hay registros para exportar con los filtros actuales.");
      return;
    }
    setGenerandoPDF(true);
    setAvisoPDF(null);
    try {
      await descargarHistorialPDF(consultasFiltradas, filtros);
    } catch {
      setAvisoPDF("No se pudo generar el PDF. Intentá de nuevo.");
    } finally {
      setGenerandoPDF(false);
    }
  }

  async function confirmarEliminar() {
    if (!aEliminar) return;
    setEliminando(true);
    setErrorEliminar(null);
    const eliminada = await triageService
      .eliminarConsulta(aEliminar.id_consulta)
      .then(() => true)
      .catch((err) => {
        setErrorEliminar(
          mensajeDeError(
            err,
            "No se pudo eliminar la consulta. Intentá de nuevo.",
          ),
        );
        return false;
      })
      .finally(() => setEliminando(false));

    if (!eliminada) return;
    setConsultas((prev) =>
      prev.filter((c) => c.id_consulta !== aEliminar.id_consulta),
    );
    setAEliminar(null);
    setAvisoEliminada(true);
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <EsqueletoPagina />
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
                onChange={(nuevos) => {
                  setFiltros(nuevos);
                  setPagina(1);
                  setAvisoPDF(null);
                }}
              />

              <div className="flex items-center justify-between gap-4 mb-3">
                <p className="text-xs text-gray-400">
                  Mostrando {consultasFiltradas.length} de {consultas.length}{" "}
                  consultas
                  {totalPaginas > 1 &&
                    ` · página ${paginaActual} de ${totalPaginas}`}
                </p>
                {/* HU-064: descarga lo que se ve, con los filtros aplicados */}
                <button
                  type="button"
                  onClick={handleDescargarPDF}
                  disabled={generandoPDF}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline
                             disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {generandoPDF ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  Descargar PDF
                </button>
              </div>

              {avisoEliminada && (
                <p
                  role="status"
                  className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3"
                >
                  La consulta se eliminó de tu historial.
                </p>
              )}

              {avisoPDF && (
                <p
                  role="status"
                  className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3"
                >
                  {avisoPDF}
                </p>
              )}

              {/* Sin resultados con los filtros */}
              {consultasFiltradas.length === 0 && (
                <div className="text-center py-12">
                  <SearchX className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">
                    No encontramos consultas con ese filtro
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFiltros(FILTROS_VACIOS);
                      setPagina(1);
                    }}
                    className="text-sm text-primary hover:underline mt-2"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {consultasPagina.map((consulta) => {
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
                          {esCasoComplejo(consulta.motivo_derivacion) && (
                            <p className="text-xs font-medium text-amber-700 mb-1">
                              Derivación automática - caso complejo
                            </p>
                          )}
                          <p className="text-sm text-gray-500 line-clamp-2">
                            {consulta.descripcion_sintomas}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatearFecha(consulta.fecha_consulta)}
                            </span>
                            <button
                              type="button"
                              onClick={() => verDetalle(consulta.id_consulta)}
                              className="flex items-center gap-1 font-medium text-primary hover:underline"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver detalle
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {badge && (
                            <span className={badge.clases}>{badge.texto}</span>
                          )}
                          {badgeEstado && (
                            <span
                              className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${badgeEstado.clases}`}
                            >
                              {badgeEstado.texto}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setErrorEliminar(null);
                              setAvisoEliminada(false);
                              setAEliminar(consulta);
                            }}
                            aria-label="Eliminar consulta del historial"
                            title="Eliminar del historial"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6 text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={() => setPagina(paginaActual - 1)}
                    disabled={paginaActual <= 1}
                    aria-label="Página anterior"
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>
                    Página {paginaActual} de {totalPaginas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPagina(paginaActual + 1)}
                    disabled={paginaActual >= totalPaginas}
                    aria-label="Página siguiente"
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Modal
        abierto={detalle !== null}
        titulo="Detalle de la consulta"
        ancho="amplio"
        onCerrar={() => setDetalle(null)}
      >
        {detalle?.tipo === "cargando" && (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando detalle…
          </p>
        )}
        {detalle?.tipo === "error" && (
          <p
            role="alert"
            className="flex items-center gap-2 py-6 text-sm text-red-600"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {detalle.mensaje}
          </p>
        )}
        {detalle?.tipo === "listo" && (
          <DetalleConsulta
            consulta={aDetalle(detalle.consulta)}
            mostrarPaciente={false}
          />
        )}
      </Modal>

      <ConfirmarDialogo
        abierto={aEliminar !== null}
        titulo="Eliminar consulta"
        mensaje={
          <>
            <p>
              La consulta del{" "}
              <span className="font-medium text-gray-800">
                {aEliminar ? formatearFecha(aEliminar.fecha_consulta) : ""}
              </span>{" "}
              dejará de aparecer en tu historial.
            </p>
            <p className="font-medium text-red-700">
              Esta acción no se puede deshacer.
            </p>
          </>
        }
        textoConfirmar="Eliminar"
        tono="peligro"
        cargando={eliminando}
        error={errorEliminar}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
      />

      <Footer />
    </div>
  );
}
