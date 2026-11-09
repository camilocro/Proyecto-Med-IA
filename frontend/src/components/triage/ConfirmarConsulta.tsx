'use client'

import { useState } from 'react'
import { Consulta } from '@/types'
import { CheckCircle2, Pencil, Loader2 } from 'lucide-react'
import ResumenEntendido from './ResumenEntendido'

const MAX_LONGITUD_RESPUESTA = 500 // mismo límite que el backend

interface ConfirmarConsultaProps {
  consulta:    Consulta
  cargando:    boolean
  onConfirmar: () => void
  /** Devuelve true si se guardó, para cerrar el campo de edición */
  onEditar:    (idPr: number, respuesta: string) => Promise<boolean>
}

/** HU-053: el paciente revisa lo que entendió la IA y confirma antes de ver el resultado */
export default function ConfirmarConsulta({ consulta, cargando, onConfirmar, onEditar }: ConfirmarConsultaProps) {
  const [editando, setEditando] = useState<number | null>(null)
  const [texto,    setTexto]    = useState('')

  const sintomas = consulta.sintomas_extraidos ?? []
  const rondas   = consulta.rondas ?? []

  function empezarEdicion(idPr: number, respuesta: string) {
    setEditando(idPr)
    setTexto(respuesta)
  }

  async function guardarEdicion(idPr: number) {
    if (await onEditar(idPr, texto.trim())) setEditando(null)
  }

  return (
    <div className="space-y-6">
      <ResumenEntendido resumen={consulta.resumen_sintomas} />

      <div className="bg-gray-100 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-500 mb-1">Describiste:</p>
        <p className="text-sm text-gray-700 italic">&quot;{consulta.descripcion_sintomas}&quot;</p>
      </div>

      {/* Síntomas y duración */}
      {sintomas.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Síntomas identificados</p>
          <ul className="space-y-1.5">
            {sintomas.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>
                  {s.descripcion}
                  <span className="text-gray-400">
                    {' · '}{s.zona_cuerpo} · {s.duracion_estimada}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Respuestas, con Editar en cada una */}
      {rondas.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Tus respuestas</p>
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
            {rondas.flatMap((ronda) => ronda.preguntas).map((p) => (
              <li key={p.id_pr} className="px-4 py-3">
                <p className="text-sm text-gray-500">{p.pregunta}</p>
                {editando === p.id_pr ? (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      maxLength={MAX_LONGITUD_RESPUESTA}
                      disabled={cargando}
                      aria-label={`Corregir respuesta: ${p.pregunta}`}
                      className="input-field py-2"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditando(null)}
                        disabled={cargando}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600
                                   hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => guardarEdicion(p.id_pr)}
                        disabled={cargando || !texto.trim()}
                        className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-xs"
                      >
                        {cargando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Guardar y analizar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3 mt-0.5">
                    <p className="text-sm font-medium text-gray-800 break-words min-w-0">{p.respuesta}</p>
                    <button
                      type="button"
                      onClick={() => empezarEdicion(p.id_pr, p.respuesta)}
                      disabled={cargando || editando !== null}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline flex-shrink-0
                                 disabled:opacity-40 disabled:no-underline"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-2">
            Si corregís una respuesta, volvemos a analizar tu consulta sin descontar otra.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onConfirmar}
        disabled={cargando || editando !== null}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white font-medium
                   py-3 px-6 rounded-lg transition-colors
                   hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {cargando ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5" />
            Confirmar y ver resultado
          </>
        )}
      </button>
    </div>
  )
}
