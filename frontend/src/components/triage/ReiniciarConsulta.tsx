'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import ConfirmarDialogo from '@/components/admin/ConfirmarDialogo'

interface ReiniciarConsultaProps {
  onConfirmar:   () => void
  deshabilitado: boolean
}

/** HU-052: volver a describir los síntomas sin gastar otra consulta */
export default function ReiniciarConsulta({ onConfirmar, deshabilitado }: ReiniciarConsultaProps) {
  const [confirmando, setConfirmando] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        disabled={deshabilitado}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary
                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RotateCcw className="w-4 h-4" />
        Reiniciar consulta
      </button>

      <ConfirmarDialogo
        abierto={confirmando}
        titulo="Reiniciar la consulta"
        mensaje={
          <>
            <p>Se borrarán las preguntas y tus respuestas, y vas a describir tus síntomas de nuevo.</p>
            <p>No se descuenta otra consulta de tu límite diario.</p>
          </>
        }
        textoConfirmar="Sí, reiniciar"
        onConfirmar={() => {
          setConfirmando(false)
          onConfirmar()
        }}
        onCancelar={() => setConfirmando(false)}
      />
    </>
  )
}
