'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import Modal from './Modal'
import DetalleConsulta from './DetalleConsulta'
import { adminService, ConsultaDetalleAdmin } from '@/services/admin.service'
import { mensajeDeError } from '@/lib/errores'

interface ConsultaDetalleModalProps {
  idConsulta: number
  onCerrar:   () => void
}

export default function ConsultaDetalleModal({ idConsulta, onCerrar }: ConsultaDetalleModalProps) {
  const [consulta, setConsulta] = useState<ConsultaDetalleAdmin | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    let vigente = true // si se cierra antes de que responda, no se actualiza el estado
    adminService
      .getDetalleConsulta(idConsulta)
      .then((datos) => vigente && setConsulta(datos))
      .catch((err) => vigente && setError(mensajeDeError(err, 'No se pudo cargar la consulta.')))
    return () => { vigente = false }
  }, [idConsulta])

  return (
    <Modal
      abierto
      ancho="amplio"
      titulo={`Consulta #${idConsulta}`}
      subtitulo="El acceso a este detalle queda registrado en la auditoría"
      onCerrar={onCerrar}
      pie={
        <button
          type="button"
          onClick={onCerrar}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cerrar
        </button>
      }
    >
      {error ? (
        <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : consulta ? (
        <DetalleConsulta consulta={consulta} />
      ) : (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}
    </Modal>
  )
}
