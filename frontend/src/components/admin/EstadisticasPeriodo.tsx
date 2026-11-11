'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, Loader2, AlertCircle, FileSpreadsheet, FileText } from 'lucide-react'
import { adminService, EstadisticasPeriodo as Datos } from '@/services/admin.service'
import { URGENCIA_LABEL, URGENCIA_PUNTO } from './BadgesConsulta'
import { descargarCSV, descargarPDF, fechaParaArchivo, Celda } from '@/lib/exportar'
import { mensajeDeError } from '@/lib/errores'

const MAX_ESPECIALIDADES_VISIBLES = 5

function describirPeriodo(datos: Datos | null, personalizado: boolean): string {
  if (!datos) return 'Último mes'
  if (datos.desde && datos.hasta) return `Del ${datos.desde} al ${datos.hasta}${personalizado ? '' : ' (último mes)'}`
  if (datos.desde) return `Desde el ${datos.desde}`
  if (datos.hasta) return `Hasta el ${datos.hasta}`
  return 'Todas las fechas'
}

/** Filas del reporte: las mismas en CSV y PDF (HU-032 CA-4) */
function filasReporte(datos: Datos): Celda[][] {
  return [
    ['Resumen', 'Consultas del período', datos.total, ''],
    ['Resumen', 'Consultas con resultado', datos.totalConResultado, ''],
    ['Resumen', 'Derivación automática por caso complejo', datos.casosComplejos, `${datos.porcentajeCasosComplejos} %`],
    ...datos.porUrgencia.map((u): Celda[] => ['Urgencia', URGENCIA_LABEL[u.nivel] ?? u.nivel, u.cantidad, `${u.porcentaje} %`]),
    ...datos.porEspecialidad.map((e): Celda[] => ['Especialidad', e.nombre, e.cantidad, `${e.porcentaje} %`]),
  ]
}

function Barra({ etiqueta, cantidad, porcentaje, color }: { etiqueta: string; cantidad: number; porcentaje: number; color: string }) {
  return (
    <li>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-gray-700 truncate">{etiqueta}</span>
        <span className="text-gray-500 whitespace-nowrap">
          {cantidad} <span className="text-xs text-gray-400">({porcentaje} %)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 mt-1 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(porcentaje, 100)}%` }} />
      </div>
    </li>
  )
}

/** HU-032: total de consultas, especialidades frecuentes, urgencias y casos complejos por período, con exportación */
export default function EstadisticasPeriodo() {
  const [desde,      setDesde]      = useState('')
  const [hasta,      setHasta]      = useState('')
  const [datos,      setDatos]      = useState<Datos | null>(null)
  const [cargando,   setCargando]   = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)
  const ultimaPeticion = useRef(0)

  const rangoInvalido = Boolean(desde && hasta && desde > hasta)
  const periodoPersonalizado = Boolean(desde || hasta)

  useEffect(() => {
    if (rangoInvalido) return
    const peticion = ++ultimaPeticion.current
    setCargando(true)
    setError(null)
    adminService
      .getEstadisticasPeriodo({ desde, hasta }) // CA-2: las métricas siguen al período elegido
      .then((respuesta) => peticion === ultimaPeticion.current && setDatos(respuesta))
      .catch((err) => peticion === ultimaPeticion.current && setError(mensajeDeError(err, 'No se pudieron cargar las estadísticas.')))
      .finally(() => peticion === ultimaPeticion.current && setCargando(false))
  }, [desde, hasta, rangoInvalido])

  const periodo = describirPeriodo(datos, periodoPersonalizado)
  const columnas = ['Grupo', 'Detalle', 'Cantidad', 'Porcentaje']
  const nombreArchivo = `med-ia-estadisticas-${fechaParaArchivo()}`

  function exportarCSV() {
    if (!datos) return
    descargarCSV(`${nombreArchivo}.csv`, columnas, datos.total === 0 ? [['Sin datos', 'No hay consultas en el período seleccionado', 0, '']] : filasReporte(datos))
  }

  function exportarPDF() {
    if (!datos) return
    setExportando(true)
    descargarPDF({
      nombreArchivo: `${nombreArchivo}.pdf`,
      titulo:        'Estadísticas de consultas',
      detalles:      [`Período: ${periodo}`, 'Los porcentajes se calculan sobre las consultas con resultado.'],
      columnas,
      filas:         datos.total === 0 ? [] : filasReporte(datos),
      mensajeVacio:  'No hay consultas en el período seleccionado.',
    })
      .catch((err) => setError(mensajeDeError(err, 'No se pudo generar el PDF.')))
      .finally(() => setExportando(false))
  }

  const especialidades = datos?.porEspecialidad.slice(0, MAX_ESPECIALIDADES_VISIBLES) ?? []

  return (
    <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Estadísticas del período
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{periodo}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-500">
            Desde
            <input id="estadisticas-desde" type="date" value={desde} max={hasta || undefined}
              onChange={(e) => setDesde(e.target.value)} className="input-field py-1.5 mt-1 text-sm" />
          </label>
          <label className="text-xs text-gray-500">
            Hasta
            <input id="estadisticas-hasta" type="date" value={hasta} min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)} className="input-field py-1.5 mt-1 text-sm" />
          </label>
          {periodoPersonalizado && (
            <button type="button" onClick={() => { setDesde(''); setHasta('') }}
              className="text-xs text-primary hover:underline pb-2.5">
              Último mes
            </button>
          )}
          <button type="button" onClick={exportarCSV} disabled={!datos || cargando}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200
                       text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
            CSV
          </button>
          <button type="button" onClick={exportarPDF} disabled={!datos || cargando || exportando}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200
                       text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {exportando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-red-600" />}
            PDF
          </button>
        </div>
      </div>

      {rangoInvalido ? (
        <p role="alert" className="px-6 py-6 text-sm text-red-600">La fecha &quot;Desde&quot; no puede ser posterior a &quot;Hasta&quot;.</p>
      ) : error ? (
        <p role="alert" className="px-6 py-6 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </p>
      ) : cargando && !datos ? (
        <p className="px-6 py-8 text-sm text-gray-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando estadísticas…
        </p>
      ) : datos && datos.total === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-gray-400">No hay consultas en el período seleccionado.</p>
      ) : datos && (
        <div className={`p-6 space-y-6 ${cargando ? 'opacity-60' : ''}`}>
          {/* CA-1 y CA-3: totales y casos complejos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Consultas del período</p>
              <p className="text-2xl font-bold text-gray-900">{datos.total}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Con resultado</p>
              <p className="text-2xl font-bold text-gray-900">{datos.totalConResultado}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-xs text-amber-700">Derivación automática (caso complejo)</p>
              <p className="text-2xl font-bold text-amber-800">
                {datos.porcentajeCasosComplejos} %
                <span className="text-sm font-normal text-amber-700"> · {datos.casosComplejos}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribución de urgencias</h3>
              <ul className="space-y-3">
                {datos.porUrgencia.map((u) => (
                  <Barra key={u.nivel} etiqueta={URGENCIA_LABEL[u.nivel] ?? u.nivel} cantidad={u.cantidad}
                    porcentaje={u.porcentaje} color={URGENCIA_PUNTO[u.nivel] ?? 'bg-gray-400'} />
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Especialidades más frecuentes</h3>
              {especialidades.length === 0 ? (
                <p className="text-sm text-gray-400">Todavía no hay derivaciones en este período.</p>
              ) : (
                <ul className="space-y-3">
                  {especialidades.map((e) => (
                    <Barra key={e.nombre} etiqueta={e.nombre} cantidad={e.cantidad} porcentaje={e.porcentaje} color="bg-primary" />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
