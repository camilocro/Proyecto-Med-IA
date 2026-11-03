'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import Modal from './Modal'

interface ConfirmarDialogoProps {
  abierto:        boolean
  titulo:         string
  mensaje:        React.ReactNode
  textoConfirmar: string
  /** "peligro" pinta el botón en rojo (desactivar, eliminar) */
  tono?:          'peligro' | 'normal'
  cargando?:      boolean
  error?:         string | null
  onConfirmar:    () => void
  onCancelar:     () => void
}

export default function ConfirmarDialogo({
  abierto, titulo, mensaje, textoConfirmar, tono = 'normal', cargando = false, error, onConfirmar, onCancelar,
}: ConfirmarDialogoProps) {
  const esPeligro = tono === 'peligro'

  return (
    <Modal abierto={abierto} titulo={titulo} onCerrar={onCancelar} bloqueado={cargando}>
      <div className="flex items-start gap-3">
        {esPeligro && (
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
        )}
        <div className="text-sm text-gray-600 space-y-2">{mensaje}</div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
        <button
          type="button"
          onClick={onCancelar}
          disabled={cargando}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700
                     hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={cargando}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors
                      flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                        esPeligro ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-accent'
                      }`}
        >
          {cargando && <Loader2 className="w-4 h-4 animate-spin" />}
          {textoConfirmar}
        </button>
      </div>
    </Modal>
  )
}
