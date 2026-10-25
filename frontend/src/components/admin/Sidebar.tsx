'use client'

import Link           from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter }   from 'next/navigation'
import { useAuth }     from '@/hooks/useAuth'
import { authService } from '@/services/auth.service'
import {
  Shield,
  LayoutDashboard,
  Users,
  Stethoscope,
  BookOpen,
  ClipboardList,
  Settings,
  LogOut,
} from 'lucide-react'

// ── Constantes (fuera del componente para evitar recreación) ──────────────────

const ENLACES = [
  { href: '/admin',                label: 'Dashboard',      Icono: LayoutDashboard },
  { href: '/admin/usuarios',       label: 'Usuarios',       Icono: Users           },
  { href: '/admin/medicos',        label: 'Médicos',        Icono: Stethoscope     },
  { href: '/admin/especialidades', label: 'Especialidades', Icono: BookOpen        },
  { href: '/admin/consultas',      label: 'Consultas',      Icono: ClipboardList   },
  { href: '/admin/configuracion',  label: 'Configuración',  Icono: Settings        },
] as const

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

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { usuario, cerrarSesion } = useAuth()

  async function handleLogout() {
    await authService.logout().catch(() => {})
    cerrarSesion()
    router.push('/')
  }

  return (
    <aside className="w-64 min-h-screen bg-primary flex flex-col flex-shrink-0">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/10">
        <Shield className="w-7 h-7 text-white" />
        <span className="text-white font-bold text-xl tracking-wide">MED-IA</span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {ENLACES.map(({ href, label, Icono }) => {
          const esActivo = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                esActivo
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icono className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Usuario en el pie */}
      {usuario && (
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <InicialAvatar nombre={usuario.nombre} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{usuario.nombre}</p>
              <p className="text-white/60 text-xs capitalize">{usuario.rol}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="text-white/60 hover:text-white transition-colors flex-shrink-0 p-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </aside>
  )
}
