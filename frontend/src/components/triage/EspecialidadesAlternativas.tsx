'use client'

import { useState } from 'react'
import { EspecialidadAlternativa, Medico } from '@/types'
import { triageService } from '@/services/triage.service'
import { mensajeDeError } from '@/lib/errores'
import { ChevronDown, Loader2, AlertCircle } from 'lucide-react'
import MedicoCard from './MedicoCard'

type EstadoMedicos =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; medicos: Medico[] }
  | { tipo: 'error'; mensaje: string }

const CORRESPONDENCIA: Record<EspecialidadAlternativa['correspondencia'], string> = {
  alta:  'Coincidencia alta',
  media: 'Coincidencia media',
}

/** HU-057: otras especialidades que también podrían atender el caso, con sus médicos */
export default function EspecialidadesAlternativas({ alternativas }: { alternativas: EspecialidadAlternativa[] }) {
  const [abierta, setAbierta] = useState<number | null>(null)
  const [medicos, setMedicos] = useState<Record<number, EstadoMedicos>>({})

  function alternar(idEspecialidad: number) {
    if (abierta === idEspecialidad) {
      setAbierta(null)
      return
    }
    setAbierta(idEspecialidad)
    if (medicos[idEspecialidad]?.tipo === 'listo') return

    // Se piden una sola vez; si falló, al volver a abrirla se reintenta
    setMedicos((prev) => ({ ...prev, [idEspecialidad]: { tipo: 'cargando' } }))
    triageService
      .obtenerMedicosDeEspecialidad(idEspecialidad)
      .then((lista) => setMedicos((prev) => ({ ...prev, [idEspecialidad]: { tipo: 'listo', medicos: lista } })))
      .catch((err) =>
        setMedicos((prev) => ({
          ...prev,
          [idEspecialidad]: { tipo: 'error', mensaje: mensajeDeError(err, 'No se pudieron cargar los médicos.') },
        })),
      )
  }

  if (alternativas.length === 0) return null

  return (
    <div className="border-t border-primary-100 pt-3 mt-3">
      <p className="text-xs text-gray-500 mb-2">También podría atenderte:</p>
      <div className="space-y-2">
        {alternativas.map((alt) => {
          const expandida = abierta === alt.id_especialidad
          const estado = medicos[alt.id_especialidad]
          return (
            <div key={alt.id_especialidad}>
              <button
                type="button"
                onClick={() => alternar(alt.id_especialidad)}
                aria-expanded={expandida}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50
                           hover:bg-gray-100 transition-colors text-left"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-800">{alt.nombre}</span>
                  <span className="block text-xs text-gray-500">{CORRESPONDENCIA[alt.correspondencia]}</span>
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-primary flex-shrink-0">
                  Ver médicos
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandida ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {expandida && (
                <div className="pt-3">
                  {estado?.tipo === 'cargando' && (
                    <p className="flex items-center gap-2 text-xs text-gray-400 py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando médicos…
                    </p>
                  )}
                  {estado?.tipo === 'error' && (
                    <p role="alert" className="flex items-center gap-2 text-xs text-red-600 py-2">
                      <AlertCircle className="w-3.5 h-3.5" /> {estado.mensaje}
                    </p>
                  )}
                  {estado?.tipo === 'listo' &&
                    (estado.medicos.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {estado.medicos.map((m) => <MedicoCard key={m.id_medico} medico={m} />)}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 text-center">
                        No hay médicos disponibles en {alt.nombre} en este momento.
                      </p>
                    ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
