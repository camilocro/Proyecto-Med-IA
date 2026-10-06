'use client'

import { useState } from 'react'
import { RondaPreguntas } from '@/types'
import { Bot, ChevronRight } from 'lucide-react'

interface PreguntasIAProps {
  descripcionOriginal: string
  ronda:               RondaPreguntas
  numeroRonda:         number
  cargando:            boolean
  onResponder:         (respuestas: { id_pr: number; respuesta: string }[]) => void
}

export default function PreguntasIA({
  descripcionOriginal,
  ronda,
  numeroRonda,
  cargando,
  onResponder,
}: PreguntasIAProps) {
  const [respuestas, setRespuestas] = useState<Record<number, string>>({})

  const todasRespondidas = ronda.preguntas.every(
    (p) => respuestas[p.id_pr]?.trim().length > 0
  )

  function actualizarRespuesta(idPr: number, valor: string) {
    setRespuestas((prev) => ({ ...prev, [idPr]: valor }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!todasRespondidas || cargando) return

    const respuestasFormateadas = ronda.preguntas.map((p) => ({
      id_pr:     p.id_pr,
      respuesta: respuestas[p.id_pr].trim(),
    }))

    onResponder(respuestasFormateadas)
  }

  return (
    <div className="space-y-6">
      {/* Burbuja con síntomas originales */}
      <div className="bg-gray-100 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-500 mb-1">Describiste:</p>
        <p className="text-sm text-gray-700 italic">"{descripcionOriginal}"</p>
      </div>

      {/* Respuesta de la IA */}
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="bg-primary-100 rounded-xl rounded-tl-none p-4 flex-1">
          <p className="text-sm font-medium text-primary mb-1">Med-IA</p>
          <p className="text-sm text-gray-700">
            Ronda {numeroRonda} — Necesito un poco más de información para orientarte mejor:
          </p>
        </div>
      </div>

      {/* Formulario de preguntas */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {ronda.preguntas
          .slice()
          .sort((a, b) => a.orden - b.orden)
          .map((pregunta, index) => (
            <div key={pregunta.id_pr}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {index + 1}. {pregunta.pregunta}
              </label>
              <input
                type="text"
                value={respuestas[pregunta.id_pr] ?? ''}
                onChange={(e) => actualizarRespuesta(pregunta.id_pr, e.target.value)}
                disabled={cargando}
                placeholder="Tu respuesta..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                           disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          ))}

        <button
          type="submit"
          disabled={!todasRespondidas || cargando}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-medium
                     py-3 px-6 rounded-lg transition-colors
                     hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cargando ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Procesando respuestas...
            </>
          ) : (
            <>
              Continuar
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
