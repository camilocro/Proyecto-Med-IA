'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Stethoscope, Plus, Search, Pencil, AlertCircle, UserX, UserCheck } from 'lucide-react'
import { medicoService, MedicoAdmin, MedicoCreado, CentroSaludResumen } from '@/services/medico.service'
import { especialidadService, EspecialidadAdmin } from '@/services/especialidad.service'
import { mensajeDeError } from '@/lib/errores'
import MedicoForm from './MedicoForm'
import CredencialesMedico from './CredencialesMedico'
import ConfirmarDialogo from './ConfirmarDialogo'

type FiltroEstado = 'todos' | 'activos' | 'inactivos'

/** Normaliza para buscar sin distinguir mayúsculas ni tildes ("garcia" encuentra "García") */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

interface MedicosPanelProps {
  /** Avisa al panel para refrescar métricas y la lista de usuarios */
  onDatosCambiados?: () => void
}

export default function MedicosPanel({ onDatosCambiados }: MedicosPanelProps) {
  const [medicos,        setMedicos]        = useState<MedicoAdmin[]>([])
  const [especialidades, setEspecialidades] = useState<EspecialidadAdmin[]>([])
  const [centros,        setCentros]        = useState<CentroSaludResumen[]>([])
  const [cargando,       setCargando]       = useState(true)
  const [error,          setError]          = useState<string | null>(null)

  // Filtros (HU-021): en el navegador, se combinan entre sí
  const [busqueda,           setBusqueda]           = useState('')
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('')
  const [filtroEstado,       setFiltroEstado]       = useState<FiltroEstado>('todos')

  // Modales
  const [formulario,   setFormulario]   = useState<{ medico?: MedicoAdmin } | null>(null)
  const [credenciales, setCredenciales] = useState<MedicoCreado | null>(null)
  const [aCambiar,     setACambiar]     = useState<MedicoAdmin | null>(null)
  const [cambiando,    setCambiando]    = useState(false)
  const [errorEstado,  setErrorEstado]  = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [listaMedicos, listaEspecialidades, listaCentros] = await Promise.all([
        medicoService.listar(),
        especialidadService.listar(),
        medicoService.listarCentros(),
      ])
      setMedicos(listaMedicos)
      setEspecialidades(listaEspecialidades)
      setCentros(listaCentros)
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los médicos. Intentá de nuevo.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const medicosFiltrados = useMemo(() => {
    const texto = normalizar(busqueda)
    return medicos.filter((m) => {
      const coincideTexto        = !texto || normalizar(`${m.usuario.nombre} ${m.usuario.correo}`).includes(texto)
      const coincideEspecialidad = !filtroEspecialidad || m.id_especialidad === Number(filtroEspecialidad)
      const coincideEstado       =
        filtroEstado === 'todos' || (filtroEstado === 'activos' ? m.usuario.activo : !m.usuario.activo)
      return coincideTexto && coincideEspecialidad && coincideEstado
    })
  }, [medicos, busqueda, filtroEspecialidad, filtroEstado])

  // Opciones del filtro: especialidades activas + las desactivadas que aún tienen médicos
  const opcionesEspecialidad = useMemo(() => {
    const mapa = new Map<number, string>()
    especialidades.forEach((e) => mapa.set(e.id_especialidad, e.nombre))
    medicos.forEach((m) => {
      if (!mapa.has(m.id_especialidad)) mapa.set(m.id_especialidad, `${m.especialidad.nombre} (desactivada)`)
    })
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [especialidades, medicos])

  const hayFiltros = Boolean(busqueda || filtroEspecialidad || filtroEstado !== 'todos')

  function reemplazar(actualizado: MedicoAdmin) {
    setMedicos((prev) => prev.map((m) => (m.id_medico === actualizado.id_medico ? actualizado : m)))
  }

  function alCrear(resultado: MedicoCreado) {
    setMedicos((prev) =>
      [...prev, resultado.medico].sort((a, b) => a.usuario.nombre.localeCompare(b.usuario.nombre, 'es')),
    )
    setFormulario(null)
    setCredenciales(resultado)
    onDatosCambiados?.()
  }

  function alActualizar(medico: MedicoAdmin) {
    reemplazar(medico)
    setFormulario(null)
    onDatosCambiados?.()
  }

  async function confirmarCambioEstado() {
    if (!aCambiar) return
    setCambiando(true)
    setErrorEstado(null)
    try {
      reemplazar(await medicoService.cambiarEstado(aCambiar.id_medico, !aCambiar.usuario.activo))
      setACambiar(null)
      onDatosCambiados?.()
    } catch (err) {
      setErrorEstado(mensajeDeError(err, 'No se pudo cambiar el estado del médico. Intentá de nuevo.'))
    } finally {
      setCambiando(false)
    }
  }

  function limpiarFiltros() {
    setBusqueda('')
    setFiltroEspecialidad('')
    setFiltroEstado('todos')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Encabezado */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-gray-400" />
          Gestión de Médicos
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {medicos.length} médicos
          </span>
        </h2>
        <button
          type="button"
          onClick={() => setFormulario({})}
          disabled={cargando || Boolean(error)}
          className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo médico
        </button>
      </div>

      {/* Filtros (HU-021) */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar médico por nombre o correo"
            className="input-field pl-9 py-2"
          />
        </div>
        <select
          value={filtroEspecialidad}
          onChange={(e) => setFiltroEspecialidad(e.target.value)}
          aria-label="Filtrar por especialidad"
          className="input-field py-2 sm:w-52"
        >
          <option value="">Todas las especialidades</option>
          {opcionesEspecialidad.map(([id, nombre]) => (
            <option key={id} value={id}>{nombre}</option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
          aria-label="Filtrar por estado"
          className="input-field py-2 sm:w-36"
        >
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </div>

      {/* Contenido */}
      {cargando ? (
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-40" />
              <div className="h-4 bg-gray-200 rounded flex-1" />
              <div className="h-6 bg-gray-200 rounded w-20" />
              <div className="h-8 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="m-4 sm:m-6 flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button type="button" onClick={cargar} className="text-sm font-medium text-red-700 hover:underline flex-shrink-0">
            Reintentar
          </button>
        </div>
      ) : medicos.length === 0 ? (
        <div className="py-16 text-center text-gray-400 px-4">
          <Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Todavía no hay médicos registrados.</p>
          <p className="text-xs mt-1">Registrá el primero para que aparezca en las sugerencias del triage.</p>
        </div>
      ) : medicosFiltrados.length === 0 ? (
        <div className="py-12 text-center text-gray-400 px-4">
          <p className="text-sm">No se encontraron médicos con esos filtros.</p>
          {hayFiltros && (
            <button type="button" onClick={limpiarFiltros} className="text-sm text-accent hover:underline mt-2">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px]">
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Médico</th>
                <th className="px-5 py-3 text-left font-medium">Especialidad y centro</th>
                <th className="px-5 py-3 text-left font-medium">Teléfono</th>
                <th className="px-5 py-3 text-left font-medium">Estado</th>
                <th className="px-5 py-3 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {medicosFiltrados.map((m) => (
                <tr key={m.id_medico} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{m.usuario.nombre}</p>
                    <p className="text-xs text-gray-400 whitespace-nowrap">{m.usuario.correo}</p>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-700">{m.especialidad.nombre}</p>
                    {m.especialidad.activo ? (
                      <p className="text-xs text-gray-400">{m.centro_salud.nombre}</p>
                    ) : (
                      <p className="text-xs text-amber-600">Especialidad desactivada</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{m.telefono_contacto}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        m.usuario.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {m.usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      {m.usuario.activo && !m.disponible && (
                        <span className="text-xs text-gray-400 whitespace-nowrap">No disponible</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormulario({ medico: m })}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700
                                   hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => { setErrorEstado(null); setACambiar(m) }}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors
                                    flex items-center gap-1.5 min-w-[100px] justify-center ${
                                      m.usuario.activo
                                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                                        : 'border-green-200 text-green-700 hover:bg-green-50'
                                    }`}
                      >
                        {m.usuario.activo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        {m.usuario.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modales */}
      {formulario && (
        <MedicoForm
          medico={formulario.medico}
          especialidades={especialidades}
          centros={centros}
          onCreado={alCrear}
          onActualizado={alActualizar}
          onCerrar={() => setFormulario(null)}
        />
      )}

      {credenciales && (
        <CredencialesMedico resultado={credenciales} onCerrar={() => setCredenciales(null)} />
      )}

      <ConfirmarDialogo
        abierto={Boolean(aCambiar)}
        titulo={aCambiar?.usuario.activo ? 'Desactivar médico' : 'Activar médico'}
        tono={aCambiar?.usuario.activo ? 'peligro' : 'normal'}
        textoConfirmar={aCambiar?.usuario.activo ? 'Desactivar' : 'Activar'}
        cargando={cambiando}
        error={errorEstado}
        onConfirmar={confirmarCambioEstado}
        onCancelar={() => setACambiar(null)}
        mensaje={
          aCambiar?.usuario.activo ? (
            <>
              <p><strong>{aCambiar.usuario.nombre}</strong> dejará de aparecer en las sugerencias del triage y no podrá iniciar sesión.</p>
              <p>Las consultas donde ya fue sugerido no cambian, y podés reactivarlo cuando quieras.</p>
            </>
          ) : (
            <p><strong>{aCambiar?.usuario.nombre}</strong> podrá iniciar sesión y volverá a aparecer como disponible en las sugerencias.</p>
          )
        }
      />
    </section>
  )
}
