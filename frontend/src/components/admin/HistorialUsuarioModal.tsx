'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle, ChevronDown, ShieldCheck } from 'lucide-react'
import Modal from './Modal'
import DetalleConsulta from './DetalleConsulta'
import { BadgeEstado, BadgeUrgencia, formatearFechaCorta } from './BadgesConsulta'
import { adminService, HistorialUsuarioAdmin, UsuarioAdmin } from '@/services/admin.service'
import { mensajeDeError } from '@/lib/errores'

interface HistorialUsuarioModalProps {
  usuario:  UsuarioAdmin
  onCerrar: () => void
}

/** HU-026: el administrador ve todas las consultas de un usuario, con su detalle completo */
export default function HistorialUsuarioModal({ usuario, onCerrar }: HistorialUsuarioModalProps) {
  const [desde,     setDesde]     = useState('')
  const [hasta,     setHasta]     = useState('')
  const [historial, setHistorial] = useState<HistorialUsuarioAdmin | null>(null)
  const [cargando,  setCargando]  = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [abierta,   setAbierta]   = useState<number | null>(null)
  const ultimaPeticion = useRef(0)

  const rangoInvalido = Boolean(desde && hasta && desde > hasta)

  useEffect(() => {
    if (rangoInvalido) return
    const peticion = ++ultimaPeticion.current
    setCargando(true)
    setError(null)
    adminService
      .getHistorialUsuario(usuario.id_usuario, { desde, hasta }) // CA-4: filtro por fechas
      .then((datos) => peticion === ultimaPeticion.current && setHistorial(datos))
      .catch((err) => peticion === ultimaPeticion.current && setError(mensajeDeError(err, 'No se pudo cargar el historial.')))
      .finally(() => peticion === ultimaPeticion.current && setCargando(false))
  }, [usuario.id_usuario, desde, hasta, rangoInvalido])

  const consultas = historial?.consultas ?? []
  const hayFiltro = Boolean(desde || hasta)

  return (
    <Modal
      abierto
      ancho="amplio"
      titulo={`Consultas de ${usuario.nombre}`}
      subtitulo={usuario.correo}
      onCerrar={onCerrar}
      pie={
        <button
          type="button"
          onClick={onCerrar}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cerrar
        </button>
      }
    >
      <div className="space-y-4">
        {/* CA-2: el acceso queda registrado */}
        <p className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
          <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
          Este acceso quedó registrado en la auditoría con tu usuario, la fecha y la hora.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-500">
            Desde
            <input id="historial-desde" type="date" value={desde} max={hasta || undefined}
              onChange={(e) => { setDesde(e.target.value); setAbierta(null) }} className="input-field py-2 mt-1" />
          </label>
          <label className="text-xs text-gray-500">
            Hasta
            <input id="historial-hasta" type="date" value={hasta} min={desde || undefined}
              onChange={(e) => { setHasta(e.target.value); setAbierta(null) }} className="input-field py-2 mt-1" />
          </label>
        </div>

        {rangoInvalido ? (
          <p role="alert" className="text-sm text-red-600">La fecha &quot;Desde&quot; no puede ser posterior a &quot;Hasta&quot;.</p>
        ) : error ? (
          <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : cargando && !historial ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : consultas.length === 0 ? (
          // CA-3
          <p className="py-10 text-center text-sm text-gray-400">
            {hayFiltro ? 'No hay consultas en ese período.' : `${usuario.nombre} no tiene consultas registradas.`}
          </p>
        ) : (
          <ul className={`space-y-2 transition-opacity ${cargando ? 'opacity-50' : ''}`}>
            <li className="text-xs text-gray-400">{consultas.length} consulta{consultas.length === 1 ? '' : 's'}</li>
            {consultas.map((c) => {
              const expandida = abierta === c.id_consulta
              return (
                <li key={c.id_consulta} className="border border-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAbierta(expandida ? null : c.id_consulta)}
                    aria-expanded={expandida}
                    className="w-full flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-left hover:bg-gray-50 rounded-xl"
                  >
                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatearFechaCorta(c.fecha_consulta)}</span>
                    <span className="text-sm font-medium text-gray-800 flex-1 min-w-[120px] truncate">
                      {c.especialidad_sugerida?.nombre ?? c.descripcion_sintomas}
                    </span>
                    <BadgeUrgencia nivel={c.nivel_urgencia} />
                    <BadgeEstado estado={c.estado} />
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandida ? 'rotate-180' : ''}`} />
                  </button>
                  {expandida && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                      <DetalleConsulta consulta={c} conCabecera={false} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}
