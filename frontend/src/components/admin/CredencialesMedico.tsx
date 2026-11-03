'use client'

import { useState } from 'react'
import { CheckCircle2, Copy, Check, KeyRound } from 'lucide-react'
import Modal from './Modal'
import { MedicoCreado } from '@/services/medico.service'

interface CredencialesMedicoProps {
  resultado: MedicoCreado
  onCerrar:  () => void
}

/**
 * HU-018 CA-3: muestra las credenciales de acceso del médico recién registrado.
 * Hasta tener servicio de correo, el administrador se las entrega personalmente.
 */
export default function CredencialesMedico({ resultado, onCerrar }: CredencialesMedicoProps) {
  const { medico, passwordTemporal } = resultado
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    const texto = `Med-IA — Acceso\nCorreo: ${medico.usuario.correo}\nContraseña temporal: ${passwordTemporal}`
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // El navegador no permite el portapapeles (p. ej. sin HTTPS): el admin puede copiarlo a mano
      setCopiado(false)
    }
  }

  return (
    <Modal abierto titulo="Médico registrado" subtitulo={medico.usuario.nombre} onCerrar={onCerrar}>
      <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-5">
        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-green-700">
          Ya está disponible para las sugerencias de {medico.especialidad.nombre}.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Correo</p>
          <p className="text-sm font-medium text-gray-800 break-words">{medico.usuario.correo}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Contraseña temporal</p>
          <p className="flex items-center gap-2 font-mono text-base font-semibold text-primary bg-light/50
                        rounded-xl px-3 py-2 select-all break-all">
            <KeyRound className="w-4 h-4 flex-shrink-0" />
            {passwordTemporal}
          </p>
        </div>
      </div>

      <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mt-4">
        Esta contraseña no se volverá a mostrar. Entregásela al médico y pedile que la cambie desde
        &quot;Mi Perfil&quot; al ingresar.
      </p>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
        <button
          type="button"
          onClick={copiar}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700
                     hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          {copiado ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          {copiado ? 'Copiado' : 'Copiar credenciales'}
        </button>
        <button type="button" onClick={onCerrar} className="btn-primary py-2.5 px-6">
          Entendido
        </button>
      </div>
    </Modal>
  )
}
