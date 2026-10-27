'use client'

import { useState, useEffect } from 'react'
import Link            from 'next/link'
import { useRouter }   from 'next/navigation'
import { usePathname } from 'next/navigation'
import { useAuth }     from '@/hooks/useAuth'
import { authService } from '@/services/auth.service'
import { vieneDeRegistroExitoso } from '@/lib/flujoAuth'
import { Shield, LogOut, UserCircle } from 'lucide-react'

// ── Constantes ──────────────────────────────────────────────────────────────────

const ENLACES_BASE = [
  { href: '/',          label: 'Inicio'    },
  { href: '/consulta',  label: 'Consulta'  },
  { href: '/historial', label: 'Historial' },
]

const ENLACE_ADMIN  = { href: '/admin',  label: 'Admin'     }
const ENLACE_PERFIL = { href: '/perfil', label: 'Mi Perfil' }

// ── Avatar con iniciales ────────────────────────────────────────────────────────

function InicialAvatar({ nombre }: { nombre: string }) {
  const iniciales = nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center
                    text-white text-sm font-bold flex-shrink-0 select-none">
      {iniciales}
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────────

export default function Navbar() {
  const { usuario, esAdmin, estaAutenticado, cerrarSesion } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  // Tras registrarse, el flujo definido solo ofrece iniciar sesión (HU-001 CA-5)
  const [ocultarRegistro, setOcultarRegistro] = useState(false)
  useEffect(() => {
    setOcultarRegistro(vieneDeRegistroExitoso())
  }, [pathname])

  // Construye los enlaces según el rol
  const enlaces = [
    ...ENLACES_BASE,
    ...(estaAutenticado ? [ENLACE_PERFIL] : []),
    ...(esAdmin         ? [ENLACE_ADMIN]  : []),
  ]

  async function handleLogout() {
    await authService.logout().catch(() => {})
    cerrarSesion()
    router.push('/')
  }

  return (
    <header className="bg-primary text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg flex-shrink-0">
          <Shield className="w-6 h-6" />
          MED-IA
        </Link>

        {/* Navegación central (en pantallas angostas se desplaza para no ocultar "Salir") */}
        <nav className="flex items-center gap-1 min-w-0 overflow-x-auto">
          {enlaces.map(({ href, label }) => {
            const esActivo = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  esActivo
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Lado derecho */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {usuario ? (
            <>
              <Link
                href="/perfil"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                title="Ver mi perfil"
              >
                <InicialAvatar nombre={usuario.nombre} />
                <span className="text-sm font-medium hidden sm:block">{usuario.nombre}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-white/80 hover:text-white
                           text-sm transition-colors border border-white/30 rounded-lg px-3 py-1.5
                           hover:bg-white/10"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-white/80 hover:text-white text-sm transition-colors"
              >
                Iniciar Sesión
              </Link>
              {!ocultarRegistro && (
                <Link
                  href="/registro"
                  className="bg-white text-primary text-sm font-semibold px-4 py-1.5
                             rounded-lg hover:bg-light transition-colors"
                >
                  Registrarse
                </Link>
              )}
            </>
          )}
        </div>

      </div>
    </header>
  )
}