'use client'

import { useEffect, useState } from 'react'
import { Medico } from '@/types'
import { medicoPanelService } from '@/services/medicoPanel.service'
import Modal from '@/components/admin/Modal'
import AvatarMedico from '@/components/ui/AvatarMedico'
import { User, Phone, MapPin, Building2, FileText, Loader2, AlertTriangle } from 'lucide-react'

interface MedicoDetalleModalProps {
  /** Datos que ya trae el resultado del triage: se muestran al instante mientras se actualizan */
  medico:   Medico
  onCerrar: () => void
}

type EstadoDetalle = 'cargando' | 'listo' | 'no_disponible' | 'error'

function Seccion({ icono: Icono, titulo, children }: {
  icono:    React.ElementType
  titulo:   string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icono className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{titulo}</p>
        <div className="text-sm text-gray-800 break-words">{children}</div>
      </div>
    </div>
  )
}

/** HU-059: información completa del médico sugerido (GET /medicos/:id, público) */
export default function MedicoDetalleModal({ medico: inicial, onCerrar }: MedicoDetalleModalProps) {
  const [medico, setMedico] = useState<Medico>(inicial)
  const [estado, setEstado] = useState<EstadoDetalle>('cargando')

  useEffect(() => {
    let vigente = true // evita actualizar el estado si el modal ya se cerró
    medicoPanelService
      .obtenerDetalle(inicial.id_medico)
      .then((detalle) => {
        if (!vigente) return
        setMedico(detalle)
        setEstado('listo')
      })
      .catch((err: { response?: { status?: number } }) => {
        if (!vigente) return
        setEstado(err.response?.status === 404 ? 'no_disponible' : 'error')
      })
    return () => { vigente = false }
  }, [inicial.id_medico])

  const nombre       = medico.usuario?.nombre ?? 'Médico'
  const especialidad = medico.especialidad
  const centro       = medico.centro_salud

  return (
    <Modal
      abierto
      titulo="Detalle del médico"
      subtitulo="Sugerido según tu consulta"
      onCerrar={onCerrar}
      pie={
        <button
          type="button"
          onClick={onCerrar}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700
                     hover:bg-gray-50 transition-colors"
        >
          Cerrar
        </button>
      }
    >
      <div className="space-y-5">
        {/* Cabecera */}
        <div className="flex items-center gap-3">
          <AvatarMedico
            fotoUrl={medico.foto_url}
            nombre={nombre}
            className="w-14 h-14 rounded-full"
            sinFoto={
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <User className="w-7 h-7 text-primary" />
              </div>
            }
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 break-words">{nombre}</p>
            {especialidad && <p className="text-sm text-primary-600">{especialidad.nombre}</p>}
          </div>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
              medico.disponible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {medico.disponible ? 'Disponible' : 'No disponible'}
          </span>
        </div>

        {estado === 'cargando' && (
          <p className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Actualizando información…
          </p>
        )}
        {(estado === 'no_disponible' || estado === 'error') && (
          <div role="alert" className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              {estado === 'no_disponible'
                ? 'Este médico ya no atiende por Med-IA. Te recomendamos elegir otro de la lista.'
                : 'No pudimos actualizar la información. Se muestran los datos del resultado de tu consulta.'}
            </p>
          </div>
        )}

        {medico.descripcion_profesional && (
          <Seccion icono={FileText} titulo="Sobre el médico">
            <p className="text-gray-700 whitespace-pre-line">{medico.descripcion_profesional}</p>
          </Seccion>
        )}

        {medico.telefono_contacto && (
          <Seccion icono={Phone} titulo="Teléfono de contacto">
            <a href={`tel:${medico.telefono_contacto.replace(/[\s-]/g, '')}`} className="font-medium text-primary hover:underline">
              {medico.telefono_contacto}
            </a>
          </Seccion>
        )}

        {centro && (
          <>
            <Seccion icono={Building2} titulo="Centro de salud">
              <p className="font-medium">{centro.nombre}</p>
              {centro.telefono && (
                <a href={`tel:${centro.telefono.replace(/[\s-]/g, '')}`} className="text-xs text-primary hover:underline">
                  Tel. del centro: {centro.telefono}
                </a>
              )}
            </Seccion>
            <Seccion icono={MapPin} titulo="Dirección">
              {centro.direccion}{centro.zona ? ` — ${centro.zona}` : ''}
            </Seccion>
          </>
        )}

        {especialidad?.descripcion && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
            <span className="font-medium text-gray-600">{especialidad.nombre}:</span> {especialidad.descripcion}
          </p>
        )}
      </div>
    </Modal>
  )
}
