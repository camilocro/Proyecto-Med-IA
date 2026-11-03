'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  abierto:    boolean
  titulo:     string
  subtitulo?: string
  onCerrar:   () => void
  /** Mientras se guarda no se puede cerrar (evita perder una petición a medias) */
  bloqueado?: boolean
  /** Botones de acción: quedan fijos abajo y siempre visibles aunque el contenido tenga scroll */
  pie?:       React.ReactNode
  children:   React.ReactNode
}

export default function Modal({ abierto, titulo, subtitulo, onCerrar, bloqueado = false, pie, children }: ModalProps) {
  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return
    function alPresionarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape' && !bloqueado) onCerrar()
    }
    document.addEventListener('keydown', alPresionarTecla)
    return () => document.removeEventListener('keydown', alPresionarTecla)
  }, [abierto, bloqueado, onCerrar])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={() => !bloqueado && onCerrar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl
                   max-h-[92vh] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
            {subtitulo && <p className="text-xs text-gray-400 mt-0.5">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={bloqueado}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto min-h-0 flex-1">{children}</div>

        {pie && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {pie}
          </div>
        )}
      </div>
    </div>
  )
}
