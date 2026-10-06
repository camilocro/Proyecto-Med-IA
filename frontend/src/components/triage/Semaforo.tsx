'use client'

import { NivelUrgencia } from '@/types'

interface SemaforoProps {
  nivel: NivelUrgencia
}

const CONFIGURACION_SEMAFORO: Record<NivelUrgencia, {
  color:      string
  fondo:      string
  borde:      string
  etiqueta:   string
  descripcion: string
}> = {
  bajo: {
    color:       'text-green-700',
    fondo:       'bg-green-50',
    borde:       'border-green-400',
    etiqueta:    'Urgencia Baja',
    descripcion: 'Podés programar una cita con normalidad. No requiere atención inmediata.',
  },
  medio: {
    color:       'text-amber-700',
    fondo:       'bg-amber-50',
    borde:       'border-amber-400',
    etiqueta:    'Urgencia Media',
    descripcion: 'Te recomendamos consultar con un especialista en los próximos 2 a 3 días.',
  },
  alto: {
    color:       'text-red-700',
    fondo:       'bg-red-50',
    borde:       'border-red-500',
    etiqueta:    'Urgencia Alta',
    descripcion: 'Buscá atención médica hoy. No postergues la consulta.',
  },
  emergencia: {
    color:       'text-red-800',
    fondo:       'bg-red-100',
    borde:       'border-red-700',
    etiqueta:    'Emergencia',
    descripcion: 'Dirigite a urgencias inmediatamente o llamá a emergencias.',
  },
}

const COLORES_LUZ: Record<NivelUrgencia, { activo: string; inactivo: string }> = {
  bajo:       { activo: 'bg-green-500',  inactivo: 'bg-gray-200' },
  medio:      { activo: 'bg-amber-500',  inactivo: 'bg-gray-200' },
  alto:       { activo: 'bg-red-500',    inactivo: 'bg-gray-200' },
  emergencia: { activo: 'bg-red-700',    inactivo: 'bg-gray-200' },
}

const ORDEN_LUCES: NivelUrgencia[] = ['alto', 'medio', 'bajo']

export default function Semaforo({ nivel }: SemaforoProps) {
  const config = CONFIGURACION_SEMAFORO[nivel]
  const luces  = COLORES_LUZ[nivel]

  return (
    <div className={`rounded-xl border-2 ${config.borde} ${config.fondo} p-6 flex items-center gap-6`}>
      {/* Semáforo visual */}
      <div className="flex flex-col items-center gap-2 bg-gray-800 rounded-xl p-3">
        {ORDEN_LUCES.map((luz) => (
          <div
            key={luz}
            className={`w-8 h-8 rounded-full transition-all ${
              luz === nivel ? `${luces.activo} shadow-lg` : luces.inactivo
            }`}
          />
        ))}
      </div>

      {/* Texto */}
      <div>
        <p className={`text-xl font-bold ${config.color}`}>{config.etiqueta}</p>
        <p className={`mt-1 text-sm ${config.color}`}>{config.descripcion}</p>
      </div>
    </div>
  )
}
