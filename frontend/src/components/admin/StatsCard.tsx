import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  titulo:    string
  valor:     number | string
  icono:     LucideIcon
  color:     'azul' | 'rojo' | 'verde' | 'amarillo'
  cargando?: boolean
}

const COLORES = {
  azul:     { borde: 'border-blue-100',   icono: 'bg-blue-100 text-blue-600',   valor: 'text-blue-700'   },
  rojo:     { borde: 'border-red-100',    icono: 'bg-red-100 text-red-600',     valor: 'text-red-700'    },
  verde:    { borde: 'border-green-100',  icono: 'bg-green-100 text-green-600', valor: 'text-green-700'  },
  amarillo: { borde: 'border-amber-100',  icono: 'bg-amber-100 text-amber-600', valor: 'text-amber-700'  },
} as const

export default function StatsCard({
  titulo,
  valor,
  icono: Icono,
  color,
  cargando = false,
}: StatsCardProps) {
  const c = COLORES[color]

  return (
    <div className={`card p-6 flex items-center gap-5 border ${c.borde}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${c.icono}`}>
        <Icono className="w-7 h-7" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium truncate">{titulo}</p>
        {cargando ? (
          <div className="mt-1 h-8 w-16 bg-gray-200 rounded-lg animate-pulse" />
        ) : (
          <p className={`text-3xl font-bold mt-0.5 ${c.valor}`}>{valor}</p>
        )}
      </div>
    </div>
  )
}