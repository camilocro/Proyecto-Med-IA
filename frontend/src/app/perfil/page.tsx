'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter }   from 'next/navigation'
import { useAuth }     from '@/hooks/useAuth'
import { perfilService, PerfilUsuario, ActualizarPerfilInput } from '@/services/perfil.service'
import Navbar from '@/components/layout/Navbar'
import {
  User,
  Mail,
  Shield,
  Calendar,
  CheckCircle,
  XCircle,
  Pencil,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

// Mismas reglas que valida el backend (usuario.controller.ts)
const MIN_LONGITUD_NOMBRE   = 2
const MAX_LONGITUD_NOMBRE   = 100
const MIN_LONGITUD_PASSWORD = 8

// ── Badge de rol ──────────────────────────────────────────────────────────────

const ROL_CONFIG: Record<string, { label: string; clase: string }> = {
  administrador: { label: 'Administrador', clase: 'bg-blue-100 text-blue-700 border border-blue-200'  },
  medico:        { label: 'Médico',        clase: 'bg-green-100 text-green-700 border border-green-200' },
  paciente:      { label: 'Paciente',      clase: 'bg-gray-100 text-gray-600 border border-gray-200'  },
}

function BadgeRol({ rol }: { rol: string }) {
  const cfg = ROL_CONFIG[rol] ?? { label: rol, clase: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${cfg.clase}`}>
      <Shield className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

// ── Fila de dato del perfil ───────────────────────────────────────────────────

function FilaDato({
  icono: Icono,
  etiqueta,
  valor,
}: {
  icono: React.ElementType
  etiqueta: string
  valor: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-50 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icono className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{etiqueta}</p>
        <div className="text-sm font-medium text-gray-800">{valor}</div>
      </div>
    </div>
  )
}

// ── Alerta ────────────────────────────────────────────────────────────────────

type TipoAlerta = 'exito' | 'error'

function Alerta({ tipo, mensaje }: { tipo: TipoAlerta; mensaje: string }) {
  const esExito = tipo === 'exito'
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
      esExito ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
    }`}>
      {esExito
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        : <AlertCircle  className="w-4 h-4 flex-shrink-0" />
      }
      {mensaje}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PerfilPage() {
  const { usuario, cargando: cargandoAuth, estaAutenticado, guardarSesion } = useAuth()
  const router = useRouter()

  // ── Estado del perfil ──────────────────────────────────────────────────────
  const [perfil,         setPerfil]         = useState<PerfilUsuario | null>(null)
  const [cargandoPerfil, setCargandoPerfil] = useState(true)
  const [errorPerfil,    setErrorPerfil]    = useState<string | null>(null)

  // ── Estado del formulario de nombre ───────────────────────────────────────
  const [nombre,            setNombre]            = useState('')
  const [guardandoNombre,   setGuardandoNombre]   = useState(false)
  const [alertaNombre,      setAlertaNombre]      = useState<{ tipo: TipoAlerta; mensaje: string } | null>(null)

  // ── Estado del formulario de contraseña ───────────────────────────────────
  const [contrasenaActual,    setContrasenaActual]    = useState('')
  const [contrasenaNueva,     setContrasenaNueva]     = useState('')
  const [contrasenaConfirm,   setContrasenaConfirm]   = useState('')
  const [guardandoPassword,   setGuardandoPassword]   = useState(false)
  const [alertaPassword,      setAlertaPassword]      = useState<{ tipo: TipoAlerta; mensaje: string } | null>(null)

  // ── Redirigir si no está autenticado ──────────────────────────────────────
  useEffect(() => {
    if (!cargandoAuth && !estaAutenticado) router.replace('/login')
  }, [cargandoAuth, estaAutenticado, router])

  // ── Cargar perfil desde el backend ────────────────────────────────────────
  const cargarPerfil = useCallback(async () => {
    setCargandoPerfil(true)
    setErrorPerfil(null)
    try {
      const datos = await perfilService.getPerfil()
      setPerfil(datos)
      setNombre(datos.nombre)
    } catch {
      // Sin esto la página quedaba cargando indefinidamente si el backend fallaba
      setErrorPerfil('No se pudo cargar tu perfil. Verificá tu conexión e intentá de nuevo.')
    } finally {
      setCargandoPerfil(false)
    }
  }, [])

  useEffect(() => {
    if (!cargandoAuth && estaAutenticado) cargarPerfil()
  }, [cargandoAuth, estaAutenticado, cargarPerfil])

  // ── Guardar nombre ────────────────────────────────────────────────────────
  async function handleGuardarNombre(e: React.FormEvent) {
    e.preventDefault()
    setAlertaNombre(null)

    const limpio = nombre.trim()
    if (limpio.length < MIN_LONGITUD_NOMBRE || limpio.length > MAX_LONGITUD_NOMBRE) {
      setAlertaNombre({
        tipo:    'error',
        mensaje: `El nombre debe tener entre ${MIN_LONGITUD_NOMBRE} y ${MAX_LONGITUD_NOMBRE} caracteres.`,
      })
      return
    }
    if (limpio === perfil?.nombre) {
      setAlertaNombre({ tipo: 'error', mensaje: 'El nombre es igual al actual.' })
      return
    }

    setGuardandoNombre(true)
    try {
      const actualizado = await perfilService.actualizarPerfil({ nombre: limpio })
      setPerfil(actualizado)
      setNombre(actualizado.nombre)
      // Actualiza el nombre en el contexto de auth (localStorage)
      if (usuario) guardarSesion(localStorage.getItem('med_ia_token') ?? '', {
        ...usuario,
        nombre: actualizado.nombre,
      })
      setAlertaNombre({ tipo: 'exito', mensaje: 'Nombre actualizado correctamente.' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Error al actualizar el nombre.'
      setAlertaNombre({ tipo: 'error', mensaje: msg })
    } finally {
      setGuardandoNombre(false)
    }
  }

  // ── Cambiar contraseña ────────────────────────────────────────────────────
  async function handleCambiarPassword(e: React.FormEvent) {
    e.preventDefault()
    setAlertaPassword(null)

    if (!contrasenaActual) {
      setAlertaPassword({ tipo: 'error', mensaje: 'Ingresa tu contraseña actual.' })
      return
    }
    // El backend exige mínimo 8: con 6 el formulario aceptaba contraseñas que luego eran rechazadas
    if (contrasenaNueva.length < MIN_LONGITUD_PASSWORD) {
      setAlertaPassword({
        tipo:    'error',
        mensaje: `La nueva contraseña debe tener al menos ${MIN_LONGITUD_PASSWORD} caracteres.`,
      })
      return
    }
    if (!/[A-Za-z]/.test(contrasenaNueva) || !/\d/.test(contrasenaNueva)) {
      setAlertaPassword({ tipo: 'error', mensaje: 'La contraseña debe tener al menos una letra y un número.' })
      return
    }
    if (contrasenaNueva !== contrasenaConfirm) {
      setAlertaPassword({ tipo: 'error', mensaje: 'Las contraseñas no coinciden.' })
      return
    }

    setGuardandoPassword(true)
    try {
      await perfilService.actualizarPerfil({
        contrasena:        contrasenaNueva,
        contrasena_actual: contrasenaActual,
      })
      setContrasenaActual('')
      setContrasenaNueva('')
      setContrasenaConfirm('')
      setAlertaPassword({ tipo: 'exito', mensaje: 'Contraseña actualizada correctamente.' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Error al cambiar la contraseña.'
      setAlertaPassword({ tipo: 'error', mensaje: msg })
    } finally {
      setGuardandoPassword(false)
    }
  }

  // ── Loading / guard ────────────────────────────────────────────────────────
  if (cargandoAuth || cargandoPerfil) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </main>
      </>
    )
  }

  if (errorPerfil || !perfil) {
    return (
      <>
        <Navbar />
        <main className="flex-1 bg-gray-50 py-10 px-4">
          <div className="max-w-3xl mx-auto space-y-4">
            <Alerta tipo="error" mensaje={errorPerfil ?? 'No se pudo cargar tu perfil.'} />
            <button type="button" onClick={cargarPerfil} className="btn-primary py-2.5 px-6">
              Reintentar
            </button>
          </div>
        </main>
      </>
    )
  }

  const fechaRegistro = new Date(perfil.created_at).toLocaleDateString('es-BO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Navbar />

      <main className="flex-1 bg-gray-50 py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* ── Encabezado ── */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
            <p className="text-sm text-gray-400 mt-1">
              Consulta y edita tu información personal
            </p>
          </div>

          {/* ── Tarjeta de datos ── */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Avatar + nombre + rol */}
            <div className="bg-primary px-8 py-8 flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center
                              text-white text-2xl font-bold select-none flex-shrink-0">
                {perfil.nombre.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')}
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">{perfil.nombre}</h2>
                <p className="text-white/70 text-sm mb-2">{perfil.correo}</p>
                <BadgeRol rol={perfil.rol} />
              </div>
            </div>

            {/* Datos detallados */}
            <div className="px-8 py-2">
              <FilaDato
                icono={User}
                etiqueta="Nombre completo"
                valor={perfil.nombre}
              />
              <FilaDato
                icono={Mail}
                etiqueta="Correo electrónico"
                valor={perfil.correo}
              />
              <FilaDato
                icono={Shield}
                etiqueta="Rol"
                valor={<BadgeRol rol={perfil.rol} />}
              />
              <FilaDato
                icono={Calendar}
                etiqueta="Miembro desde"
                valor={fechaRegistro}
              />
              <FilaDato
                icono={perfil.verificado ? CheckCircle : XCircle}
                etiqueta="Cuenta verificada"
                valor={
                  <span className={perfil.verificado ? 'text-green-600' : 'text-gray-400'}>
                    {perfil.verificado ? 'Verificada' : 'Sin verificar'}
                  </span>
                }
              />
            </div>
          </div>

          {/* ── Formulario: editar nombre ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Pencil className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">Editar nombre</h3>
                <p className="text-xs text-gray-400">Tu nombre visible en el sistema</p>
              </div>
            </div>

            <form onSubmit={handleGuardarNombre} noValidate className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => { setNombre(e.target.value); setAlertaNombre(null) }}
                  placeholder="Tu nombre completo"
                  className="input-field"
                  maxLength={100}
                  required
                />
              </div>

              {alertaNombre && <Alerta tipo={alertaNombre.tipo} mensaje={alertaNombre.mensaje} />}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={guardandoNombre}
                  className="btn-primary flex items-center gap-2 py-2.5 px-6"
                >
                  {guardandoNombre && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar nombre
                </button>
              </div>
            </form>
          </div>

          {/* ── Formulario: cambiar contraseña ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <Lock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">Cambiar contraseña</h3>
                <p className="text-xs text-gray-400">Déjalo vacío si no quieres cambiarla</p>
              </div>
            </div>

            <form onSubmit={handleCambiarPassword} noValidate className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  value={contrasenaActual}
                  onChange={(e) => { setContrasenaActual(e.target.value); setAlertaPassword(null) }}
                  placeholder="Tu contraseña actual"
                  className="input-field"
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={contrasenaNueva}
                  onChange={(e) => { setContrasenaNueva(e.target.value); setAlertaPassword(null) }}
                  placeholder="Mínimo 8 caracteres, letras y números"
                  className="input-field"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  value={contrasenaConfirm}
                  onChange={(e) => { setContrasenaConfirm(e.target.value); setAlertaPassword(null) }}
                  placeholder="Repite la nueva contraseña"
                  className="input-field"
                  autoComplete="new-password"
                />
              </div>

              {alertaPassword && <Alerta tipo={alertaPassword.tipo} mensaje={alertaPassword.mensaje} />}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={guardandoPassword}
                  className="btn-primary flex items-center gap-2 py-2.5 px-6"
                >
                  {guardandoPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cambiar contraseña
                </button>
              </div>
            </form>
          </div>

        </div>
      </main>
    </>
  )
}