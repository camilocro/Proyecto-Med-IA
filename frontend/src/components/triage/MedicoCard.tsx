'use client'

import { useState } from 'react'
import { Medico } from '@/types'
import { Phone, MapPin, User, ChevronRight } from 'lucide-react'
import MedicoDetalleModal from './MedicoDetalleModal'
import AvatarMedico from '@/components/ui/AvatarMedico'

interface MedicoCardProps {
  medico: Medico
}

export default function MedicoCard({ medico }: MedicoCardProps) {
  const [verDetalle, setVerDetalle] = useState(false)

  const nombre      = medico.usuario?.nombre ?? 'Médico disponible'
  const especialidad = medico.especialidad?.nombre ?? ''
  const centro      = medico.centro_salud?.nombre ?? ''
  const direccion   = medico.centro_salud?.direccion ?? ''

  return (
    <>
      {/* Toda la tarjeta abre el detalle del médico (HU-059) */}
      <button
        type="button"
        onClick={() => setVerDetalle(true)}
        aria-haspopup="dialog"
        className="w-full text-left bg-white rounded-xl border border-gray-200 p-5 shadow-sm
                   hover:shadow-md hover:border-primary/30 transition-all
                   focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {/* Cabecera */}
        <span className="flex items-center gap-3 mb-4">
          <AvatarMedico
            fotoUrl={medico.foto_url}
            nombre={nombre}
            className="w-12 h-12 rounded-full"
            sinFoto={
              <span className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-primary" />
              </span>
            }
          />
          <span className="block min-w-0">
            <span className="block font-semibold text-gray-900">{nombre}</span>
            <span className="block text-sm text-primary-600">{especialidad}</span>
          </span>

          {/* Badge disponibilidad */}
          <span
            className={`ml-auto text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
              medico.disponible
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {medico.disponible ? 'Disponible' : 'No disponible'}
          </span>
        </span>

        {/* Información de contacto */}
        <span className="block space-y-2 text-sm text-gray-600">
          {medico.telefono_contacto && (
            <span className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{medico.telefono_contacto}</span>
            </span>
          )}
          {(centro || direccion) && (
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{centro}{direccion ? ` — ${direccion}` : ''}</span>
            </span>
          )}
        </span>

        <span className="flex items-center justify-end gap-1 mt-4 text-xs font-medium text-primary">
          Ver detalle
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </button>

      {verDetalle && <MedicoDetalleModal medico={medico} onCerrar={() => setVerDetalle(false)} />}
    </>
  )
}
