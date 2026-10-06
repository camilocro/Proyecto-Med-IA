'use client'

import { useState } from 'react'
import { Stethoscope, AlertCircle } from 'lucide-react'

const MIN_CARACTERES = 20
const MAX_CARACTERES = 500

interface SintomasFormProps {
  onSubmit:    (descripcion: string) => void
  cargando:    boolean
  consultasRestantes: number
}

export default function SintomasForm({ onSubmit, cargando, consultasRestantes }: SintomasFormProps) {
  const [descripcion, setDescripcion] = useState('')

  const caracteresActuales = descripcion.trim().length
  const esValido           = caracteresActuales >= MIN_CARACTERES
  const limiteSuperado     = consultasRestantes <= 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!esValido || cargando || limiteSuperado) return
    onSubmit(descripcion.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Aviso de límite */}
      {limiteSuperado && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            Alcanzaste el límite de consultas diarias. Volvé mañana para realizar una nueva consulta.
          </p>
        </div>
      )}

      {/* Contador de consultas restantes */}
      {!limiteSuperado && (
        <p className="text-sm text-gray-500">
          Consultas disponibles hoy:{' '}
          <span className={`font-semibold ${consultasRestantes === 1 ? 'text-amber-600' : 'text-green-600'}`}>
            {consultasRestantes} de 5
          </span>
        </p>
      )}

      {/* Textarea */}
      <div>
        <label htmlFor="sintomas" className="block text-sm font-medium text-gray-700 mb-2">
          Describí tus síntomas
        </label>
        <textarea
          id="sintomas"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={MAX_CARACTERES}
          disabled={limiteSuperado || cargando}
          rows={5}
          placeholder="Ej: Me duele mucho la cabeza desde esta mañana, veo borroso y tengo náuseas. El dolor comenzó de repente..."
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     disabled:bg-gray-50 disabled:text-gray-400 resize-none"
        />
        <div className="flex justify-between mt-1">
          <p className="text-xs text-gray-400">
            {!esValido && caracteresActuales > 0 && `Mínimo ${MIN_CARACTERES} caracteres`}
          </p>
          <p className={`text-xs ${caracteresActuales > MAX_CARACTERES * 0.9 ? 'text-amber-600' : 'text-gray-400'}`}>
            {caracteresActuales} / {MAX_CARACTERES}
          </p>
        </div>
      </div>

      {/* Botón */}
      <button
        type="submit"
        disabled={!esValido || cargando || limiteSuperado}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white font-medium
                   py-3 px-6 rounded-lg transition-colors
                   hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {cargando ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analizando síntomas...
          </>
        ) : (
          <>
            <Stethoscope className="w-5 h-5" />
            Iniciar Triage
          </>
        )}
      </button>

      {/* Aviso no diagnóstico */}
      <p className="text-xs text-center text-gray-400">
        Med-IA te orienta hacia el especialista correcto. No emite diagnósticos médicos.
      </p>
    </form>
  )
}
