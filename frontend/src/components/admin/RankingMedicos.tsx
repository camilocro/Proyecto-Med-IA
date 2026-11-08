'use client'

import { useEffect, useRef, useState } from 'react'
import { Trophy, Loader2, AlertCircle, ChevronDown } from 'lucide-react'
import { adminService, RankingMedicos as DatosRanking } from '@/services/admin.service'
import { formatearFechaCorta } from './BadgesConsulta'
import { mensajeDeError } from '@/lib/errores'

// Detalle de un médico: las más recientes primero; el resto se resume
const MAX_SUGERENCIAS_VISIBLES = 8

function describirPeriodo(datos: DatosRanking | null, personalizado: boolean): string {
  if (!datos) return 'Último mes'
  if (datos.desde && datos.hasta) return `Del ${datos.desde} al ${datos.hasta}${personalizado ? '' : ' (último mes)'}`
  if (datos.desde) return `Desde el ${datos.desde}`
  if (datos.hasta) return `Hasta el ${datos.hasta}`
  return 'Todas las fechas'
}

/** HU-069: los 10 médicos más sugeridos del período (por defecto, el último mes) */
export default function RankingMedicos() {
  const [desde,    setDesde]    = useState('')
  const [hasta,    setHasta]    = useState('')
  const [datos,    setDatos]    = useState<DatosRanking | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [abierto,  setAbierto]  = useState<number | null>(null)
  const ultimaPeticion = useRef(0)

  const rangoInvalido = Boolean(desde && hasta && desde > hasta)
  const periodoPersonalizado = Boolean(desde || hasta)

  useEffect(() => {
    if (rangoInvalido) return
    const peticion = ++ultimaPeticion.current
    setCargando(true)
    setError(null)
    adminService
      .getRankingMedicos({ desde, hasta }) // CA-3: el ranking sigue al período elegido
      .then((respuesta) => peticion === ultimaPeticion.current && setDatos(respuesta))
      .catch((err) => peticion === ultimaPeticion.current && setError(mensajeDeError(err, 'No se pudo cargar el ranking.')))
      .finally(() => peticion === ultimaPeticion.current && setCargando(false))
  }, [desde, hasta, rangoInvalido])

  const medicos = datos?.medicos ?? []
  const maximo  = medicos[0]?.total ?? 1

  return (
    <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Médicos más sugeridos
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{describirPeriodo(datos, periodoPersonalizado)}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-500">
            Desde
            <input id="ranking-desde" type="date" value={desde} max={hasta || undefined}
              onChange={(e) => setDesde(e.target.value)} className="input-field py-1.5 mt-1 text-sm" />
          </label>
          <label className="text-xs text-gray-500">
            Hasta
            <input id="ranking-hasta" type="date" value={hasta} min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)} className="input-field py-1.5 mt-1 text-sm" />
          </label>
          {periodoPersonalizado && (
            <button type="button" onClick={() => { setDesde(''); setHasta('') }}
              className="text-xs text-primary hover:underline pb-2.5">
              Último mes
            </button>
          )}
        </div>
      </div>

      {rangoInvalido ? (
        <p role="alert" className="px-6 py-6 text-sm text-red-600">La fecha &quot;Desde&quot; no puede ser posterior a &quot;Hasta&quot;.</p>
      ) : error ? (
        <p role="alert" className="px-6 py-6 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      ) : cargando && !datos ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : medicos.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-gray-400">Sin derivaciones en este período.</p>
      ) : (
        <ol className={`divide-y divide-gray-50 transition-opacity ${cargando ? 'opacity-50' : ''}`}>
          {medicos.map((m, i) => {
            const expandido = abierto === m.id_medico
            return (
              <li key={m.id_medico}>
                {/* CA-4: clic → cuándo y para qué especialidad fue sugerido */}
                <button
                  type="button"
                  onClick={() => setAbierto(expandido ? null : m.id_medico)}
                  aria-expanded={expandido}
                  className="w-full px-6 py-3 flex items-center gap-4 text-left hover:bg-gray-50/60 transition-colors"
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-800 truncate">{m.nombre}</span>
                    <span className="block text-xs text-gray-400">{m.especialidad}</span>
                    <span className="block h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                      <span className="block h-full bg-primary-600 rounded-full" style={{ width: `${(m.total / maximo) * 100}%` }} />
                    </span>
                  </span>
                  <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
                    {m.total} <span className="text-xs font-normal text-gray-400">{m.total === 1 ? 'vez' : 'veces'}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandido ? 'rotate-180' : ''}`} />
                </button>
                {expandido && (
                  <ul className="px-6 pb-3 pl-[4.25rem] space-y-1 text-xs text-gray-500">
                    {m.sugerencias.slice(0, MAX_SUGERENCIAS_VISIBLES).map((s) => (
                      <li key={s.id_consulta} className="flex justify-between gap-4">
                        <span>{formatearFechaCorta(s.fecha)}</span>
                        <span className="text-gray-700">{s.especialidad}</span>
                      </li>
                    ))}
                    {m.sugerencias.length > MAX_SUGERENCIAS_VISIBLES && (
                      <li className="text-gray-400">y {m.sugerencias.length - MAX_SUGERENCIAS_VISIBLES} más</li>
                    )}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
