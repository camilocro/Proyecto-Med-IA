'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { BookOpen, Plus, Pencil, Trash2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { especialidadService, EspecialidadAdmin } from '@/services/especialidad.service'
import { medicoService, MedicoAdmin } from '@/services/medico.service'
import { mensajeDeError } from '@/lib/errores'
import EspecialidadForm from './EspecialidadForm'
import ConfirmarDialogo from './ConfirmarDialogo'

interface EspecialidadesPanelProps {
  onDatosCambiados?: () => void
}

export default function EspecialidadesPanel({ onDatosCambiados }: EspecialidadesPanelProps) {
  const [especialidades, setEspecialidades] = useState<EspecialidadAdmin[]>([])
  const [medicos,        setMedicos]        = useState<MedicoAdmin[]>([])
  const [cargando,       setCargando]       = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  const [expandida,      setExpandida]      = useState<number | null>(null)

  const [formulario,     setFormulario]     = useState<{ especialidad?: EspecialidadAdmin } | null>(null)
  const [aEliminar,      setAEliminar]      = useState<EspecialidadAdmin | null>(null)
  const [eliminando,     setEliminando]     = useState(false)
  const [errorEliminar,  setErrorEliminar]  = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [listaEspecialidades, listaMedicos] = await Promise.all([
        especialidadService.listar(),
        medicoService.listar(),
      ])
      setEspecialidades(listaEspecialidades)
      setMedicos(listaMedicos)
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar las especialidades. Intentá de nuevo.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function alGuardar(guardada: EspecialidadAdmin) {
    setEspecialidades((prev) => {
      const existe = prev.some((e) => e.id_especialidad === guardada.id_especialidad)
      const lista  = existe
        ? prev.map((e) => (e.id_especialidad === guardada.id_especialidad ? guardada : e))
        : [...prev, guardada]
      return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    })
    setFormulario(null)
    onDatosCambiados?.()
  }

  async function confirmarEliminar() {
    if (!aEliminar) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await especialidadService.desactivar(aEliminar.id_especialidad)
      setEspecialidades((prev) => prev.filter((e) => e.id_especialidad !== aEliminar.id_especialidad))
      if (expandida === aEliminar.id_especialidad) setExpandida(null)
      setAEliminar(null)
      onDatosCambiados?.()
    } catch (err) {
      setErrorEliminar(mensajeDeError(err, 'No se pudo eliminar la especialidad. Intentá de nuevo.'))
    } finally {
      setEliminando(false)
    }
  }

  const medicosDe = (idEspecialidad: number) => medicos.filter((m) => m.id_especialidad === idEspecialidad)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gray-400" />
          Especialidades Médicas
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {especialidades.length} especialidades
          </span>
        </h2>
        <button
          type="button"
          onClick={() => setFormulario({})}
          disabled={cargando || Boolean(error)}
          className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva especialidad
        </button>
      </div>

      {cargando ? (
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-36" />
              <div className="h-4 bg-gray-200 rounded flex-1" />
              <div className="h-6 bg-gray-200 rounded w-16" />
              <div className="h-8 bg-gray-200 rounded w-28" />
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
      ) : especialidades.length === 0 ? (
        /* HU-022 CA-2 */
        <div className="py-16 text-center text-gray-400 px-4">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Todavía no hay especialidades registradas.</p>
          <button type="button" onClick={() => setFormulario({})} className="text-sm text-accent hover:underline mt-2">
            Crear la primera especialidad
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-3 text-left font-medium">Especialidad</th>
                <th className="px-6 py-3 text-left font-medium">Descripción</th>
                <th className="px-6 py-3 text-center font-medium">Médicos</th>
                <th className="px-6 py-3 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {especialidades.map((e) => {
                const abierta  = expandida === e.id_especialidad
                const asignados = medicosDe(e.id_especialidad)
                return (
                  <Fragment key={e.id_especialidad}>
                    <tr className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800 whitespace-nowrap">{e.nombre}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[280px]">{e.descripcion}</td>
                      <td className="px-6 py-4 text-center">
                        {/* HU-022 CA-3 y CA-4: cantidad de médicos y su listado */}
                        <button
                          type="button"
                          onClick={() => setExpandida(abierta ? null : e.id_especialidad)}
                          aria-expanded={abierta}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full
                                     bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          {e._count.medicos}
                          {abierta ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFormulario({ especialidad: e })}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700
                                       hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => { setErrorEliminar(null); setAEliminar(e) }}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600
                                       hover:bg-red-50 transition-colors flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                    {abierta && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={4} className="px-6 py-3">
                          {asignados.length === 0 ? (
                            <p className="text-sm text-gray-400">No hay médicos asignados a esta especialidad.</p>
                          ) : (
                            <ul className="flex flex-wrap gap-2">
                              {asignados.map((m) => (
                                <li
                                  key={m.id_medico}
                                  className="text-xs bg-white border border-gray-100 rounded-lg px-3 py-1.5 text-gray-700"
                                >
                                  {m.usuario.nombre}
                                  {!m.usuario.activo && <span className="text-red-600"> · Inactivo</span>}
                                  {m.usuario.activo && !m.disponible && <span className="text-gray-400"> · No disponible</span>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {formulario && (
        <EspecialidadForm
          especialidad={formulario.especialidad}
          onGuardada={alGuardar}
          onCerrar={() => setFormulario(null)}
        />
      )}

      {/* HU-062: con médicos vinculados advierte; sin médicos, confirmación simple */}
      <ConfirmarDialogo
        abierto={Boolean(aEliminar)}
        titulo="Eliminar especialidad"
        tono="peligro"
        textoConfirmar="Eliminar"
        cargando={eliminando}
        error={errorEliminar}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
        mensaje={
          aEliminar && aEliminar._count.medicos > 0 ? (
            <>
              <p>
                <strong>{aEliminar.nombre}</strong> tiene <strong>{aEliminar._count.medicos}</strong>{' '}
                {aEliminar._count.medicos === 1 ? 'médico vinculado' : 'médicos vinculados'}.
              </p>
              <p>
                La IA dejará de derivar a esta especialidad y esos médicos no aparecerán en las sugerencias
                hasta que les asignes otra desde la pestaña Médicos.
              </p>
            </>
          ) : (
            <p>¿Eliminar <strong>{aEliminar?.nombre}</strong>? La IA dejará de derivar a esta especialidad.</p>
          )
        }
      />
    </section>
  )
}
