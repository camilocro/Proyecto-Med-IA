"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  Loader2,
  AlertCircle,
  AlertTriangle,
  SearchX,
  FileSpreadsheet,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Modal from "./Modal";
import {
  adminService,
  PaginaAccesos,
  DetalleIp,
} from "@/services/admin.service";
import { mensajeDeError } from "@/lib/errores";
import { descargarCSV, fechaParaArchivo } from "@/lib/exportar";
import { EsqueletoFilas } from "@/components/ui/Esqueleto";

const POR_PAGINA = 25;
const MAX_EXPORTACION = 2000; // mismo tope que el backend
const ESPERA_BUSQUEDA_MS = 400;
const CUENTAS_SOSPECHOSAS = 3; // desde una IP se probaron varias cuentas distintas

interface FiltrosPantalla {
  usuario: string;
  desde: string;
  hasta: string;
  resultado: "" | "exitoso" | "fallido";
}

const FILTROS_VACIOS: FiltrosPantalla = {
  usuario: "",
  desde: "",
  hasta: "",
  resultado: "",
};

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function BadgeResultado({ exitoso }: { exitoso: boolean }) {
  return exitoso ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
      <CheckCircle2 className="w-3 h-3" /> Exitoso
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 whitespace-nowrap">
      <XCircle className="w-3 h-3" /> Fallido
    </span>
  );
}

// ── Detalle de una IP ─────────────────────────────────────────────────────────

function DetalleIpModal({
  ip,
  onCerrar,
}: {
  ip: string | null;
  onCerrar: () => void;
}) {
  const [detalle, setDetalle] = useState<DetalleIp | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ip) return;
    setDetalle(null);
    setError(null);
    adminService
      .getDetalleIp(ip)
      .then(setDetalle)
      .catch((err) =>
        setError(mensajeDeError(err, "No se pudo cargar el detalle de la IP.")),
      );
  }, [ip]);

  return (
    <Modal
      abierto={ip !== null}
      titulo={`Accesos desde ${ip ?? ""}`}
      subtitulo="Resumen de todos los intentos de inicio de sesión desde esta IP"
      onCerrar={onCerrar}
      ancho="amplio"
    >
      {error ? (
        <p className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      ) : !detalle ? (
        <EsqueletoFilas filas={6} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                etiqueta: "Intentos",
                valor: detalle.total,
                clases: "text-gray-900",
              },
              {
                etiqueta: "Exitosos",
                valor: detalle.exitosos,
                clases: "text-green-600",
              },
              {
                etiqueta: "Fallidos",
                valor: detalle.fallidos,
                clases: "text-red-600",
              },
            ].map((d) => (
              <div
                key={d.etiqueta}
                className="bg-gray-50 rounded-xl p-3 text-center"
              >
                <p className={`text-2xl font-bold tabular-nums ${d.clases}`}>
                  {d.valor}
                </p>
                <p className="text-xs text-gray-500">{d.etiqueta}</p>
              </div>
            ))}
          </div>

          {detalle.primero && detalle.ultimo && (
            <p className="text-sm text-gray-600">
              Primer acceso:{" "}
              <span className="font-medium">
                {fecha(detalle.primero)} {hora(detalle.primero)}
              </span>
              {" · "}
              Último:{" "}
              <span className="font-medium">
                {fecha(detalle.ultimo)} {hora(detalle.ultimo)}
              </span>
            </p>
          )}

          {detalle.correos.length >= CUENTAS_SOSPECHOSAS && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Desde esta IP se intentó entrar con {detalle.correos.length}{" "}
                cuentas distintas.
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              Correos usados desde esta IP
            </p>
            <div className="flex flex-wrap gap-2">
              {detalle.correos.map((correo) => (
                <span
                  key={correo}
                  className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full break-all"
                >
                  {correo}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              Últimos {detalle.recientes.length} accesos
            </p>
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full min-w-[480px]">
                <tbody className="divide-y divide-gray-50">
                  {detalle.recientes.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        {fecha(a.fecha)} {hora(a.fecha)}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-700 break-all">
                        {a.correo_intentado}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <BadgeResultado exitoso={a.exitoso} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

/** HU-047: registro de accesos con filtros, detalle por IP y exportación a CSV. */
export default function AccesosPanel() {
  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState<FiltrosPantalla>(FILTROS_VACIOS);
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaAccesos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ipDetalle, setIpDetalle] = useState<string | null>(null);

  const rangoInvalido = Boolean(
    filtros.desde && filtros.hasta && filtros.desde > filtros.hasta,
  );

  // La búsqueda por usuario se aplica cuando se deja de escribir
  useEffect(() => {
    const espera = setTimeout(() => {
      const termino = busqueda.trim();
      setFiltros((prev) =>
        prev.usuario === termino ? prev : { ...prev, usuario: termino },
      );
      setPagina(1);
    }, ESPERA_BUSQUEDA_MS);
    return () => clearTimeout(espera);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    if (rangoInvalido) return;
    setCargando(true);
    setError(null);
    try {
      setDatos(
        await adminService.listarAccesos({
          ...filtros,
          pagina,
          porPagina: POR_PAGINA,
        }),
      );
    } catch (err) {
      setError(
        mensajeDeError(err, "No se pudo cargar el registro de accesos."),
      );
    } finally {
      setCargando(false);
    }
  }, [filtros, pagina, rangoInvalido]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function cambiarFiltro<K extends keyof FiltrosPantalla>(
    campo: K,
    valor: FiltrosPantalla[K],
  ) {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
    setPagina(1);
    setAviso(null);
  }

  function limpiarFiltros() {
    setBusqueda("");
    setFiltros(FILTROS_VACIOS);
    setPagina(1);
    setAviso(null);
  }

  async function exportarCSV() {
    setExportando(true);
    setAviso(null);
    try {
      const { accesos, total } = await adminService.listarAccesos({
        ...filtros,
        pagina: 1,
        porPagina: MAX_EXPORTACION,
      });
      if (accesos.length === 0) {
        setAviso("No hay accesos con esos filtros: no se generó el archivo.");
        return;
      }
      descargarCSV(
        `accesos-${fechaParaArchivo()}.csv`,
        ["Fecha", "Hora", "Usuario", "Correo", "IP", "Resultado"],
        accesos.map((a) => [
          fecha(a.fecha),
          hora(a.fecha),
          a.usuario?.nombre ?? "Sin cuenta",
          a.correo_intentado,
          a.ip_address,
          a.exitoso ? "Exitoso" : "Fallido",
        ]),
      );
      if (total > accesos.length) {
        setAviso(
          `Se exportaron los ${accesos.length} accesos más recientes de ${total}. Acotá las fechas para incluir el resto.`,
        );
      }
    } catch (err) {
      setAviso(
        mensajeDeError(err, "No se pudo generar el archivo. Intentá de nuevo."),
      );
    } finally {
      setExportando(false);
    }
  }

  const hayFiltros = Boolean(
    busqueda || filtros.desde || filtros.hasta || filtros.resultado,
  );
  const total = datos?.total ?? 0;
  const porPagina = datos?.porPagina ?? POR_PAGINA;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const primera = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const ultima = Math.min(pagina * porPagina, total);

  return (
    <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Encabezado y exportación */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gray-400" />
          Registro de accesos
          {datos && (
            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {total} en total
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={exportarCSV}
          disabled={exportando || rangoInvalido}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-700
                     hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exportando ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
          )}
          Exportar CSV
        </button>
      </div>

      {/* Filtros: se aplican al cambiar y se pueden combinar */}
      <div className="px-6 py-4 border-b border-gray-100 grid grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] gap-3 items-end">
        <label className="col-span-2 lg:col-span-1 text-xs text-gray-500">
          Usuario
          <div className="relative mt-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setAviso(null);
              }}
              placeholder="Nombre o correo"
              className="input-field py-2 pl-9"
            />
          </div>
        </label>
        <label className="text-xs text-gray-500">
          Desde
          <input
            type="date"
            value={filtros.desde}
            max={filtros.hasta || undefined}
            onChange={(e) => cambiarFiltro("desde", e.target.value)}
            className="input-field py-2 mt-1"
          />
        </label>
        <label className="text-xs text-gray-500">
          Hasta
          <input
            type="date"
            value={filtros.hasta}
            min={filtros.desde || undefined}
            onChange={(e) => cambiarFiltro("hasta", e.target.value)}
            className="input-field py-2 mt-1"
          />
        </label>
        <label className="text-xs text-gray-500">
          Resultado
          <select
            value={filtros.resultado}
            onChange={(e) =>
              cambiarFiltro(
                "resultado",
                e.target.value as FiltrosPantalla["resultado"],
              )
            }
            className="input-field py-2 mt-1"
          >
            <option value="">Todos</option>
            <option value="exitoso">Exitosos</option>
            <option value="fallido">Fallidos</option>
          </select>
        </label>
        <button
          type="button"
          onClick={limpiarFiltros}
          disabled={!hayFiltros}
          className="text-sm text-primary hover:underline disabled:text-gray-300 disabled:no-underline py-2"
        >
          Limpiar filtros
        </button>
      </div>

      {rangoInvalido && (
        <p
          role="alert"
          className="px-6 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100"
        >
          La fecha &quot;Desde&quot; no puede ser posterior a &quot;Hasta&quot;.
        </p>
      )}
      {aviso && (
        <p
          role="status"
          className="px-6 py-3 text-sm text-amber-700 bg-amber-50 border-b border-amber-100"
        >
          {aviso}
        </p>
      )}

      {/* Contenido */}
      {error ? (
        <div className="px-6 py-12 text-center space-y-3">
          <p className="flex items-center justify-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
          <button
            type="button"
            onClick={cargar}
            className="btn-primary py-2 px-5 text-sm"
          >
            Reintentar
          </button>
        </div>
      ) : cargando && !datos ? (
        <EsqueletoFilas filas={6} />
      ) : total === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <SearchX className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {hayFiltros
              ? "No hay accesos con esos filtros."
              : "Todavía no hay accesos registrados."}
          </p>
          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="text-sm text-primary hover:underline mt-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div
            className={`overflow-x-auto transition-opacity ${cargando ? "opacity-50" : ""}`}
          >
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-medium">Usuario</th>
                  <th className="px-6 py-3 text-left font-medium">Fecha</th>
                  <th className="px-6 py-3 text-left font-medium">Hora</th>
                  <th className="px-6 py-3 text-left font-medium">IP</th>
                  <th className="px-6 py-3 text-left font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {datos?.accesos.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-800">
                        {a.usuario?.nombre ?? "Sin cuenta"}
                      </p>
                      <p className="text-xs text-gray-400 break-all">
                        {a.correo_intentado}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {fecha(a.fecha)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap tabular-nums">
                      {hora(a.fecha)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setIpDetalle(a.ip_address)}
                        className="text-sm font-mono text-primary hover:underline"
                        title="Ver el detalle de esta IP"
                      >
                        {a.ip_address}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <BadgeResultado exitoso={a.exitoso} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between gap-3 text-sm text-gray-500">
            <span>
              {primera}–{ultima} de {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPagina((p) => p - 1)}
                disabled={pagina <= 1 || cargando}
                aria-label="Página anterior"
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="tabular-nums">
                {pagina} / {totalPaginas}
              </span>
              <button
                type="button"
                onClick={() => setPagina((p) => p + 1)}
                disabled={pagina >= totalPaginas || cargando}
                aria-label="Página siguiente"
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      <DetalleIpModal ip={ipDetalle} onCerrar={() => setIpDetalle(null)} />
    </section>
  );
}
