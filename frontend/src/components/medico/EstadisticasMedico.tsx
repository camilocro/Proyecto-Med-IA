'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { medicoPanelService, EstadisticasMedico as Datos } from '@/services/medicoPanel.service'
import { mensajeDeError } from '@/lib/errores'

/** Compara el mes actual con el anterior (HU-061 CA-4) */
function tendencia(actual: number, anterior: number) {
  if (actual === anterior) return { texto: 'Igual que el mes anterior', Icono: Minus, clases: 'text-gray-500' }
  const sube = actual > anterior
  const texto = anterior === 0
    ? `+${actual} respecto al mes anterior`
    : `${sube ? '+' : ''}${Math.round(((actual - anterior) / anterior) * 100)} % respecto al mes anterior`
  return sube
    ? { texto, Icono: TrendingUp, clases: 'text-green-600' }
    : { texto, Icono: TrendingDown, clases: 'text-red-600' }
}

function describirPeriodo(datos: Datos, personalizado: boolean): string {
  if (datos.desde && datos.hasta) return `Del ${datos.desde} al ${datos.hasta}${personalizado ? '' : ' (último mes)'}`
  if (datos.desde) return `Desde el ${datos.desde}`
  if (datos.hasta) return `Hasta el ${datos.hasta}`
  return 'Todas las fechas'
}

/** HU-061: cuántas veces el médico fue sugerido a pacientes */
export default function EstadisticasMedico() {
  const [desde,    setDesde]    = useState('')
  const [hasta,    setHasta]    = useState('')
  const [datos,    setDatos]    = useState<Datos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const ultimaPeticion = useRef(0)

  const rangoInvalido = Boolean(desde && hasta && desde > hasta)
  const personalizado = Boolean(desde || hasta)

  useEffect(() => {
    if (rangoInvalido) return
    const peticion = ++ultimaPeticion.current
    setCargando(true)
    setError(null)
    medicoPanelService
      .obtenerEstadisticas({ desde, hasta }) // CA-3: se actualiza con el período elegido
      .then((respuesta) => peticion === ultimaPeticion.current && setDatos(respuesta))
      .catch((err) => peticion === ultimaPeticion.current && setError(mensajeDeError(err, 'No se pudieron cargar tus estadísticas.')))
      .finally(() => peticion === ultimaPeticion.current && setCargando(false))
  }, [desde, hasta, rangoInvalido])

  const comparacion = datos ? tendencia(datos.mesActual, datos.mesAnterior) : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">Mis derivaciones</h3>
            <p className="text-xs text-gray-400">Veces que el triage te sugirió a un paciente</p>
          </div>
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
          {personalizado && (
            <button type="button" onClick={() => { setDesde(''); setHasta('') }}
              className="text-xs text-primary hover:underline pb-2.5">
              Último mes
            </button>
          )}
        </div>
      </div>

      {rangoInvalido ? (
        <p role="alert" className="text-sm text-red-600">La fecha &quot;Desde&quot; no puede ser posterior a &quot;Hasta&quot;.</p>
      ) : error ? (
        <p role="alert" className="flex items-center gap-2 text-sm text-red-600"><AlertCircle className="w-4 h-4" /> {error}</p>
      ) : !datos ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-opacity ${cargando ? 'opacity-50' : ''}`}>
          {/* CA-1 / CA-2 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400">{describirPeriodo(datos, personalizado)}</p>
            {datos.total > 0 ? (
              <p className="mt-1">
                <span className="text-3xl font-bold text-gray-900">{datos.total}</span>{' '}
                <span className="text-sm text-gray-500">{datos.total === 1 ? 'vez sugerido' : 'veces sugerido'}</span>
              </p>
            ) : (
              <p className="mt-2 text-sm font-medium text-gray-500">Sin derivaciones en este período</p>
            )}
          </div>

          {/* CA-4 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400">Este mes frente al anterior</p>
            <p className="mt-1 text-sm text-gray-700">
              <span className="text-2xl font-bold text-gray-900">{datos.mesActual}</span> este mes ·{' '}
              <span className="font-semibold">{datos.mesAnterior}</span> el mes pasado
            </p>
            {comparacion && (
              <p className={`flex items-center gap-1.5 mt-1 text-xs font-medium ${comparacion.clases}`}>
                <comparacion.Icono className="w-3.5 h-3.5" />
                {comparacion.texto}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
