'use client'

import { Consulta } from '@/types'
import Semaforo from './Semaforo'
import MedicoCard from './MedicoCard'
import { AlertTriangle, CheckCircle, Stethoscope, RotateCcw } from 'lucide-react'
import Link from 'next/link'

interface ResultadoTriageProps {
  consulta:       Consulta
  onNuevaConsulta: () => void
}

export default function ResultadoTriage({ consulta, onNuevaConsulta }: ResultadoTriageProps) {
  const especialidad    = consulta.especialidad_sugerida
  const medicosLista    = consulta.medicos_sugeridos ?? []
  const sintomasLista   = consulta.rondas?.flatMap((r) => r.preguntas) ?? []
  const nivelUrgencia   = consulta.nivel_urgencia ?? 'bajo'

  return (
    <div className="space-y-6">
      {/* Aviso de no diagnóstico — siempre visible y destacado */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Orientación preliminar — </span>
          Este resultado NO constituye un diagnóstico médico. Solo un profesional de la salud
          puede diagnosticar y tratar enfermedades.
        </p>
      </div>

      {/* Semáforo de urgencia */}
      <Semaforo nivel={nivelUrgencia} />

      {/* Especialidad sugerida */}
      {especialidad && (
        <div className="bg-white rounded-xl border border-primary-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            <p className="font-semibold text-gray-900">Especialidad sugerida</p>
          </div>
          <p className="text-xl font-bold text-primary">{especialidad.nombre}</p>
          {especialidad.descripcion && (
            <p className="text-sm text-gray-500 mt-1">{especialidad.descripcion}</p>
          )}
        </div>
      )}

      {/* Síntomas identificados */}
      {sintomasLista.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-900 mb-3">Información recopilada</p>
          <ul className="space-y-2">
            {sintomasLista.map((item) => (
              <li key={item.id_pr} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{item.pregunta}: <span className="font-medium text-gray-800">{item.respuesta}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Médicos sugeridos */}
      <div>
        <p className="font-semibold text-gray-900 mb-3">
          Médicos disponibles{especialidad ? ` en ${especialidad.nombre}` : ''}
        </p>
        {medicosLista.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {medicosLista.map(({ medico }) => (
              <MedicoCard key={medico.id_medico} medico={medico} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
            No hay médicos disponibles en esta especialidad en este momento.
            Te recomendamos contactar directamente a un centro de salud.
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={onNuevaConsulta}
          className="flex items-center justify-center gap-2 flex-1 border border-primary text-primary
                     font-medium py-3 px-6 rounded-lg hover:bg-primary-100 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Nueva consulta
        </button>
        <Link
          href="/historial"
          className="flex items-center justify-center gap-2 flex-1 bg-primary text-white
                     font-medium py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors"
        >
          Ver mi historial
        </Link>
      </div>
    </div>
  )
}
