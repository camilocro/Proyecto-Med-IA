'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  SearchX,
} from 'lucide-react'
import {
  adminService,
  ConsultaReciente,
  FiltrosConsultasAdmin,
  PaginaConsultas,
} from '@/services/admin.service'
import { BadgeEstado, BadgeUrgencia, ESTADO_BADGE, URGENCIA_LABEL, formatearFechaCorta } from './BadgesConsulta'
import ConsultaDetalleModal from './ConsultaDetalleModal'
import { descargarCSV, descargarPDF, fechaParaArchivo, fechaHoraLegible, Celda } from '@/lib/exportar'
import { mensajeDeError } from '@/lib/errores'

// Mismo tope que el backend (MAX_CONSULTAS_EXPORTACION)
const MAX_EXPORTACION = 1000
const MENSAJE_SIN_DATOS = 'No hay consultas en el período seleccionado.'

type Filtros = Required<Pick<FiltrosConsultasAdmin, 'desde' | 'hasta' | 'urgencia' | 'estado'>>
const FILTROS_VACIOS: Filtros = { desde: '', hasta: '', urgencia: '', estado: '' }

const OPCIONES_URGENCIA = ['bajo', 'medio', 'alto', 'emergencia'] as const
const OPCIONES_ESTADO   = ['completada', 'esperando_confirmacion', 'esperando_respuestas', 'en_proceso', 'cancelada'] as const

const nombreUsuario = (c: ConsultaReciente) => c.paciente?.usuario.nombre ?? 'Anónimo'
const textoUrgencia = (nivel: string | null) => (nivel ? URGENCIA_LABEL[nivel] ?? nivel : '—')
const textoEstado   = (estado: string) => ESTADO_BADGE[estado]?.texto ?? estado

/** Texto de los filtros activos, para el encabezado del PDF */
function describirFiltros(f: Filtros): string[] {
  const periodo =
    f.desde && f.hasta ? `Período: del ${f.desde} al ${f.hasta}`
    : f.desde ? `Período: desde el ${f.desde}`
    : f.hasta ? `Período: hasta el ${f.hasta}`
    : 'Período: todas las fechas'
  const lineas = [periodo]
  if (f.urgencia) lineas.push(`Urgencia: ${textoUrgencia(f.urgencia)}`)
  if (f.estado)   lineas.push(`Resultado: ${textoEstado(f.estado)}`)
  return lineas
}

/** HU-068 CA-2: cantidad y porcentaje por especialidad, de mayor a menor */
function totalesPorEspecialidad(consultas: ConsultaReciente[]): Celda[][] {
  const conteo = new Map<string, number>()
  for (const c of consultas) {
    const nombre = c.especialidad_sugerida?.nombre ?? 'Sin especialidad'
    conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1)
  }
  const filas: Celda[][] = [...conteo]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .map(([nombre, cantidad]) => [nombre, cantidad, `${Math.round((cantidad / consultas.length) * 100)} %`])
  return [...filas, ['Total', consultas.length, '100 %']]
}

// ── Componente ────────────────────────────────────────────────────────────────

/** Sección "Consultas" del panel: todas las consultas con filtros, detalle y exportación */
export default function ConsultasPanel() {
  const [filtros,    setFiltros]    = useState<Filtros>(FILTROS_VACIOS)
  const [pagina,     setPagina]     = useState(1)
  const [datos,      setDatos]      = useState<PaginaConsultas | null>(null)
  const [cargando,   setCargando]   = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [exportando, setExportando] = useState<'csv' | 'pdf' | null>(null)
  const [avisoExportacion, setAvisoExportacion] = useState<string | null>(null)
  const [detalle,    setDetalle]    = useState<number | null>(null)

  // Si el admin cambia los filtros rápido, solo cuenta la última respuesta
  const ultimaPeticion = useRef(0)

  const rangoInvalido = Boolean(filtros.desde && filtros.hasta && filtros.desde > filtros.hasta)

  const cargar = useCallback(async () => {
    if (rangoInvalido) return
    const peticion = ++ultimaPeticion.current
    setCargando(true)
    setError(null)
    try {
      const respuesta = await adminService.listarConsultas({ ...filtros, pagina })
      if (peticion === ultimaPeticion.current) setDatos(respuesta)
    } catch (err) {
      if (peticion === ultimaPeticion.current) {
        setError(mensajeDeError(err, 'No se pudieron cargar las consultas. Intentá de nuevo.'))
      }
    } finally {
      if (peticion === ultimaPeticion.current) setCargando(false)
    }
  }, [filtros, pagina, rangoInvalido])

  useEffect(() => { cargar() }, [cargar])

  function cambiarFiltro(campo: keyof Filtros, valor: string) {
    setFiltros((prev) => ({ ...prev, [campo]: valor }))
    setPagina(1) // con otros filtros, la página 3 puede no existir
    setAvisoExportacion(null)
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_VACIOS)
    setPagina(1)
    setAvisoExportacion(null)
  }

  /** HU-068: exporta todas las consultas que cumplen los filtros, no solo la página visible (CA-4) */
  async function exportar(formato: 'csv' | 'pdf') {
    setExportando(formato)
    setAvisoExportacion(null)
    try {
      const { consultas, total } = await adminService.listarConsultas({ ...filtros, pagina: 1, porPagina: MAX_EXPORTACION })
      const columnas = ['Fecha', 'Usuario', 'Síntomas', 'Especialidad', 'Urgencia', 'Resultado']
      const filas: Celda[][] = consultas.map((c) => [
        fechaHoraLegible(c.fecha_consulta),
        nombreUsuario(c),
        c.descripcion_sintomas,
        c.especialidad_sugerida?.nombre ?? '—',
        textoUrgencia(c.nivel_urgencia),
        textoEstado(c.estado),
      ])
      const nombre = `med-ia-consultas-${fechaParaArchivo()}`

      if (formato === 'csv') {
        // CA-3: el archivo indica que no hay datos en vez de quedar vacío
        descargarCSV(`${nombre}.csv`, columnas, filas.length ? filas : [[MENSAJE_SIN_DATOS]])
      } else {
        await descargarPDF({
          nombreArchivo: `${nombre}.pdf`,
          titulo: 'Reporte de consultas',
          detalles: [...describirFiltros(filtros), `Total: ${total} consulta${total === 1 ? '' : 's'}`],
          columnas,
          filas,
          mensajeVacio: MENSAJE_SIN_DATOS,
          totales: filas.length
            ? { titulo: 'Totales por especialidad', columnas: ['Especialidad', 'Consultas', '%'], filas: totalesPorEspecialidad(consultas) }
            : undefined,
          horizontal: true,
        })
      }

      if (total > consultas.length) {
        setAvisoExportacion(`Se exportaron las ${consultas.length} consultas más recientes de ${total}. Acotá las fechas para incluir el resto.`)
      }
    } catch (err) {
      setAvisoExportacion(mensajeDeError(err, 'No se pudo generar el archivo. Intentá de nuevo.'))
    } finally {
      setExportando(null)
    }
  }

  const hayFiltros = Object.values(filtros).some(Boolean)
  const total      = datos?.total ?? 0
  const porPagina  = datos?.porPagina ?? 20
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const primera = total === 0 ? 0 : (pagina - 1) * porPagina + 1
  const ultima  = Math.min(pagina * porPagina, total)

  return (
    <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Encabezado y exportación */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-gray-400" />
          Consultas
          {datos && (
            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {total} en total
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          {(['csv', 'pdf'] as const).map((formato) => (
            <button
              key={formato}
              type="button"
              onClick={() => exportar(formato)}
              disabled={exportando !== null || rangoInvalido}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-700
                         hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportando === formato ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : formato === 'csv' ? (
                <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-red-600" />
              )}
              Exportar {formato.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros (HU-031): se aplican al cambiar y se pueden combinar */}
      <div className="px-6 py-4 border-b border-gray-100 grid grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] gap-3 items-end">
        <label className="text-xs text-gray-500">
          Desde
          <input
            id="consultas-desde"
            type="date"
            value={filtros.desde}
            max={filtros.hasta || undefined}
            onChange={(e) => cambiarFiltro('desde', e.target.value)}
            className="input-field py-2 mt-1"
          />
        </label>
        <label className="text-xs text-gray-500">
          Hasta
          <input
            id="consultas-hasta"
            type="date"
            value={filtros.hasta}
            min={filtros.desde || undefined}
            onChange={(e) => cambiarFiltro('hasta', e.target.value)}
            className="input-field py-2 mt-1"
          />
        </label>
        <label className="text-xs text-gray-500">
          Urgencia
          <select
            id="consultas-urgencia"
            value={filtros.urgencia}
            onChange={(e) => cambiarFiltro('urgencia', e.target.value)}
            className="input-field py-2 mt-1"
          >
            <option value="">Todas</option>
            {OPCIONES_URGENCIA.map((u) => <option key={u} value={u}>{URGENCIA_LABEL[u]}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-500">
          Resultado
          <select
            id="consultas-estado"
            value={filtros.estado}
            onChange={(e) => cambiarFiltro('estado', e.target.value)}
            className="input-field py-2 mt-1"
          >
            <option value="">Todos</option>
            {OPCIONES_ESTADO.map((e) => <option key={e} value={e}>{textoEstado(e)}</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={limpiarFiltros}
          disabled={!hayFiltros}
          className="col-span-2 lg:col-span-1 text-sm text-primary hover:underline disabled:text-gray-300 disabled:no-underline py-2"
        >
          Limpiar filtros
        </button>
      </div>

      {rangoInvalido && (
        <p role="alert" className="px-6 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
          La fecha &quot;Desde&quot; no puede ser posterior a &quot;Hasta&quot;.
        </p>
      )}
      {avisoExportacion && (
        <p role="status" className="px-6 py-3 text-sm text-amber-700 bg-amber-50 border-b border-amber-100">
          {avisoExportacion}
        </p>
      )}

      {/* Contenido */}
      {error ? (
        <div className="px-6 py-12 text-center space-y-3">
          <p className="flex items-center justify-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
          <button type="button" onClick={cargar} className="btn-primary py-2 px-5 text-sm">Reintentar</button>
        </div>
      ) : cargando && !datos ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : total === 0 ? (
        // CA-4: mensaje informativo cuando el filtro no encuentra nada
        <div className="py-16 text-center text-gray-400">
          <SearchX className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{hayFiltros ? 'No hay consultas con esos filtros.' : 'Todavía no hay consultas registradas.'}</p>
          {hayFiltros && (
            <button type="button" onClick={limpiarFiltros} className="text-sm text-primary hover:underline mt-2">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={`relative overflow-x-auto transition-opacity ${cargando ? 'opacity-50' : ''}`}>
            <table className="w-full min-w-[820px]">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-medium">Fecha</th>
                  <th className="px-6 py-3 text-left font-medium">Usuario</th>
                  <th className="px-6 py-3 text-left font-medium">Síntomas</th>
                  <th className="px-6 py-3 text-left font-medium">Especialidad</th>
                  <th className="px-6 py-3 text-left font-medium">Urgencia</th>
                  <th className="px-6 py-3 text-left font-medium">Resultado</th>
                  <th className="px-6 py-3 text-right font-medium"><span className="sr-only">Detalle</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {datos?.consultas.map((c) => (
                  <tr
                    key={c.id_consulta}
                    onClick={() => setDetalle(c.id_consulta)}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{formatearFechaCorta(c.fecha_consulta)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-800 whitespace-nowrap">{nombreUsuario(c)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[220px]">
                      <span className="truncate block">{c.descripcion_sintomas}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {c.especialidad_sugerida?.nombre ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4"><BadgeUrgencia nivel={c.nivel_urgencia} /></td>
                    <td className="px-6 py-4"><BadgeEstado estado={c.estado} /></td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDetalle(c.id_consulta) }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between gap-4 text-xs text-gray-500">
            <span>Mostrando {primera}–{ultima} de {total}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPagina((p) => p - 1)}
                disabled={pagina <= 1 || cargando}
                aria-label="Página anterior"
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Página {pagina} de {totalPaginas}</span>
              <button
                type="button"
                onClick={() => setPagina((p) => p + 1)}
                disabled={pagina >= totalPaginas || cargando}
                aria-label="Página siguiente"
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {detalle !== null && <ConsultaDetalleModal idConsulta={detalle} onCerrar={() => setDetalle(null)} />}
    </section>
  )
}
