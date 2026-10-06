'use client'

import { Medico } from '@/types'
import { Phone, MapPin, User } from 'lucide-react'

interface MedicoCardProps {
  medico: Medico
}

export default function MedicoCard({ medico }: MedicoCardProps) {
  const nombre      = medico.usuario?.nombre ?? 'Médico disponible'
  const especialidad = medico.especialidad?.nombre ?? ''
  const centro      = medico.centro_salud?.nombre ?? ''
  const direccion   = medico.centro_salud?.direccion ?? ''

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Cabecera */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{nombre}</p>
          <p className="text-sm text-primary-600">{especialidad}</p>
        </div>

        {/* Badge disponibilidad */}
        <span
          className={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${
            medico.disponible
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {medico.disponible ? 'Disponible' : 'No disponible'}
        </span>
      </div>

      {/* Información de contacto */}
      <div className="space-y-2 text-sm text-gray-600">
        {medico.telefono_contacto && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{medico.telefono_contacto}</span>
          </div>
        )}
        {(centro || direccion) && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{centro}{direccion ? ` — ${direccion}` : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}
