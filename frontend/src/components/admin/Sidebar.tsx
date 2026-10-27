'use client'

import { useRouter }   from 'next/navigation'
import { useAuth }     from '@/hooks/useAuth'
import { authService } from '@/services/auth.service'
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  BookOpen,
  ClipboardList,
  Settings,
  LogOut,
  LucideIcon,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

/** Secciones del panel que ya están implementadas como pestañas de /admin */
export type SeccionAdmin = 'dashboard' | 'usuarios'

interface EnlaceSidebar {
  label:    string
  Icono:    LucideIcon
  seccion?: SeccionAdmin   // sin sección = módulo aún no implementado
}

// ── Constantes (fuera del componente para evitar recreación) ──────────────────

const ENLACES: EnlaceSidebar[] = [
  { label: 'Dashboard',      Icono: LayoutDashboard, seccion: 'dashboard' },
  { label: 'Usuarios',       Icono: Users,           seccion: 'usuarios'  },
  { label: 'Médicos',        Icono: Stethoscope     },
  { label: 'Especialidades', Icono: BookOpen        },
  { label: 'Consultas',      Icono: ClipboardList   },
  { label: 'Configuración',  Icono: Settings        },
]

// ── Subcomponente Avatar ──────────────────────────────────────────────────────

function InicialAvatar({ nombre }: { nombre: string }) {
  const iniciales = nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center
                    text-white text-sm font-bold flex-shrink-0 select-none">
      {iniciales}
    </div>
  )
}

// ── Sidebar principal ─────────────────────────────────────────────────────────

interface SidebarProps {
  seccionActiva:     SeccionAdmin
  onCambiarSeccion:  (seccion: SeccionAdmin) => void
}

export default function Sidebar({ seccionActiva, onCambiarSeccion }: SidebarProps) {
  const router   = useRouter()
  const { usuario, cerrarSesion } = useAuth()

  async function handleLogout() {
    await authService.logout().catch(() => {})
    cerrarSesion()
    router.push('/')
  }

  return (
    <aside className="hidden md:flex w-64 bg-primary flex-col flex-shrink-0 border-t border-white/10">

      {/* Navegación del panel */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {ENLACES.map(({ label, Icono, seccion }) => {
          if (!seccion) {
            // Módulos planificados en el backlog pero aún no disponibles: no navegan a una ruta inexistente
            return (
              <span
                key={label}
                aria-disabled="true"
                title="Disponible en un próximo sprint"
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                           text-white/40 cursor-not-allowed select-none"
              >
                <Icono className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                <span className="text-[10px] uppercase tracking-wide bg-white/10 px-1.5 py-0.5 rounded">
                  Pronto
                </span>
              </span>
            )
          }

          const esActivo = seccionActiva === seccion
          return (
            <button
              key={label}
              type="button"
              onClick={() => onCambiarSeccion(seccion)}
              aria-current={esActivo ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                esActivo
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icono className="w-5 h-5 flex-shrink-0" />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Usuario en el pie */}
      {usuario && (
        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <InicialAvatar nombre={usuario.nombre} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{usuario.nombre}</p>
              <p className="text-white/60 text-xs capitalize">{usuario.rol}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-white/80 hover:text-white
                       text-sm transition-colors border border-white/30 rounded-lg px-3 py-2
                       hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      )}

    </aside>
  )
}
