import { LucideIcon, TrendingUp } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface StatsCardProps {
  titulo:    string
  valor:     number | string
  icono:     LucideIcon
  color:     'azul' | 'rojo' | 'verde' | 'amarillo'
  subtexto?: string
  cargando?: boolean
}

// ── Paleta de colores por variante ────────────────────────────────────────────

const COLORES = {
  azul:     { icono: 'bg-blue-100 text-blue-600',   borde: 'border-blue-100'   },
  rojo:     { icono: 'bg-red-100 text-red-600',     borde: 'border-red-100'    },
  verde:    { icono: 'bg-green-100 text-green-600', borde: 'border-green-100'  },
  amarillo: { icono: 'bg-amber-100 text-amber-600', borde: 'border-amber-100'  },
} as const

// ── Componente ────────────────────────────────────────────────────────────────

export default function StatsCard({
  titulo,
  valor,
  icono: Icono,
  color,
  subtexto,
  cargando = false,
}: StatsCardProps) {
  const c = COLORES[color]

  return (
    <div className={`bg-white rounded-2xl border ${c.borde} p-6 flex flex-col gap-4`}>

      {/* Ícono + subtexto */}
      <div className="flex flex-wrap xl:flex-nowrap items-start justify-between gap-2 xl:gap-0">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icono}`}>
          <Icono className="w-6 h-6" />
        </div>
        {subtexto && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-700
                           bg-green-50 px-2.5 py-1 rounded-full whitespace-nowrap">
            <TrendingUp className="w-3 h-3 flex-shrink-0" />
            {subtexto}
          </span>
        )}
      </div>

      {/* Valor + título */}
      <div>
        {cargando ? (
          <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse mb-1.5" />
        ) : (
          <p className="text-4xl font-bold text-gray-900 tabular-nums">{valor}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">{titulo}</p>
      </div>

    </div>
  )
}
