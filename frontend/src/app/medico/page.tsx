'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link          from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth }   from '@/hooks/useAuth'
import { medicoPanelService, PerfilMedico, CambiosPerfilMedico } from '@/services/medicoPanel.service'
import { mensajeDeError } from '@/lib/errores'
import Navbar from '@/components/layout/Navbar'
import {
  Stethoscope,
  Building2,
  MapPin,
  Phone,
  FileText,
  Pencil,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'

// Mismas reglas que valida el backend (medico.controller.ts)
const REGEX_TELEFONO  = /^\+?[0-9\s-]+$/
const MIN_DESCRIPCION = 10
const MAX_DESCRIPCION = 500
const MIN_TELEFONO    = 7
const MAX_TELEFONO    = 15

type Campo   = 'descripcion' | 'telefono'
type Errores = Partial<Record<Campo, string>>
type Aviso   = { tipo: 'exito' | 'error'; mensaje: string }

function validar(descripcion: string, telefono: string): Errores {
  const errores: Errores = {}
  if (descripcion.length < MIN_DESCRIPCION || descripcion.length > MAX_DESCRIPCION) {
    errores.descripcion = `La descripción debe tener entre ${MIN_DESCRIPCION} y ${MAX_DESCRIPCION} caracteres.`
  }
  if (telefono.length < MIN_TELEFONO || telefono.length > MAX_TELEFONO) {
    errores.telefono = `El teléfono debe tener entre ${MIN_TELEFONO} y ${MAX_TELEFONO} caracteres.`
  } else if (!REGEX_TELEFONO.test(telefono)) {
    errores.telefono = 'Usá solo números, espacios, guiones y "+".'
  }
  return errores
}

function iniciales(nombre: string): string {
  return nombre.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}

// ── Piezas de la página ───────────────────────────────────────────────────────

function AvisoMensaje({ aviso }: { aviso: Aviso }) {
  const esExito = aviso.tipo === 'exito'
  return (
    <div
      role={esExito ? 'status' : 'alert'}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
        esExito ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
      }`}
    >
      {esExito ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {aviso.mensaje}
    </div>
  )
}

function FilaDato({
  icono: Icono,
  etiqueta,
  children,
}: {
  icono: React.ElementType
  etiqueta: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-50 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icono className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{etiqueta}</p>
        <div className="text-sm font-medium text-gray-800 break-words">{children}</div>
      </div>
    </div>
  )
}

/** HU-042: interruptor accesible (role="switch") para la disponibilidad */
function InterruptorDisponibilidad({
  disponible,
  cambiando,
  onCambiar,
}: {
  disponible: boolean
  cambiando:  boolean
  onCambiar:  () => void
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="text-base font-semibold text-gray-800">
          {disponible ? 'Disponible' : 'No disponible'}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">
          {disponible
            ? 'Aparecés en las sugerencias del triage para los pacientes.'
            : 'No aparecés en las sugerencias del triage hasta que vuelvas a estar disponible.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={disponible}
        aria-label="Disponibilidad para recibir pacientes"
        onClick={onCambiar}
        disabled={cambiando}
        className={`relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full transition-colors
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    disabled:opacity-60 disabled:cursor-not-allowed ${
                      disponible ? 'bg-green-500' : 'bg-gray-300'
                    }`}
      >
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform ${
            disponible ? 'translate-x-7' : 'translate-x-1'
          }`}
        >
          {cambiando && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
        </span>
      </button>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function MedicoPage() {
  const { usuario, cargando: cargandoAuth, esMedico } = useAuth()
  const router = useRouter()

  const [perfil,         setPerfil]         = useState<PerfilMedico | null>(null)
  const [cargandoPerfil, setCargandoPerfil] = useState(true)
  const [errorPerfil,    setErrorPerfil]    = useState<string | null>(null)

  // Disponibilidad (HU-042)
  const [cambiandoDisponibilidad, setCambiandoDisponibilidad] = useState(false)
  const [avisoDisponibilidad,     setAvisoDisponibilidad]     = useState<Aviso | null>(null)

  // Formulario de edición (HU-041)
  const [descripcion, setDescripcion] = useState('')
  const [telefono,    setTelefono]    = useState('')
  const [errores,     setErrores]     = useState<Errores>({})
  const [guardando,   setGuardando]   = useState(false)
  const [avisoPerfil, setAvisoPerfil] = useState<Aviso | null>(null)

  // Sin sesión → login; con otro rol → inicio
  useEffect(() => {
    if (cargandoAuth) return
    if (!usuario)       router.replace('/login')
    else if (!esMedico) router.replace('/')
  }, [cargandoAuth, usuario, esMedico, router])

  const cargarPerfil = useCallback(async () => {
    setCargandoPerfil(true)
    setErrorPerfil(null)
    try {
      const datos = await medicoPanelService.obtenerPerfil()
      setPerfil(datos)
      setDescripcion(datos.descripcion_profesional)
      setTelefono(datos.telefono_contacto)
    } catch (err) {
      setErrorPerfil(mensajeDeError(err, 'No se pudo cargar tu perfil de médico. Intentá de nuevo.'))
    } finally {
      setCargandoPerfil(false)
    }
  }, [])

  useEffect(() => {
    if (!cargandoAuth && esMedico) cargarPerfil()
  }, [cargandoAuth, esMedico, cargarPerfil])

  async function handleCambiarDisponibilidad() {
    if (!perfil) return
    setCambiandoDisponibilidad(true)
    setAvisoDisponibilidad(null)
    try {
      const actualizado = await medicoPanelService.cambiarDisponibilidad(!perfil.disponible)
      setPerfil(actualizado)
    } catch (err) {
      setAvisoDisponibilidad({
        tipo:    'error',
        mensaje: mensajeDeError(err, 'No se pudo cambiar tu disponibilidad. Intentá de nuevo.'),
      })
    } finally {
      setCambiandoDisponibilidad(false)
    }
  }

  async function handleGuardarPerfil(e: React.FormEvent) {
    e.preventDefault()
    if (!perfil) return

    const descripcionLimpia = descripcion.trim()
    const telefonoLimpio    = telefono.trim()
    const nuevosErrores     = validar(descripcionLimpia, telefonoLimpio)
    setErrores(nuevosErrores)
    setAvisoPerfil(null)
    if (Object.keys(nuevosErrores).length > 0) return

    // Solo se envía lo que cambió
    const cambios: CambiosPerfilMedico = {}
    if (descripcionLimpia !== perfil.descripcion_profesional) cambios.descripcion_profesional = descripcionLimpia
    if (telefonoLimpio    !== perfil.telefono_contacto)       cambios.telefono_contacto       = telefonoLimpio
    if (Object.keys(cambios).length === 0) {
      setAvisoPerfil({ tipo: 'error', mensaje: 'No hay cambios para guardar.' })
      return
    }

    setGuardando(true)
    try {
      const actualizado = await medicoPanelService.actualizarPerfil(cambios)
      setPerfil(actualizado)
      setDescripcion(actualizado.descripcion_profesional)
      setTelefono(actualizado.telefono_contacto)
      setAvisoPerfil({ tipo: 'exito', mensaje: 'Tu perfil se actualizó correctamente.' })
    } catch (err) {
      setAvisoPerfil({ tipo: 'error', mensaje: mensajeDeError(err, 'No se pudo guardar tu perfil. Intentá de nuevo.') })
    } finally {
      setGuardando(false)
    }
  }

  // ── Carga / guard ──────────────────────────────────────────────────────────
  if (cargandoAuth || !esMedico || cargandoPerfil) {
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
            <AvisoMensaje aviso={{ tipo: 'error', mensaje: errorPerfil ?? 'No se pudo cargar tu perfil de médico.' }} />
            <button type="button" onClick={cargarPerfil} className="btn-primary py-2.5 px-6">
              Reintentar
            </button>
          </div>
        </main>
      </>
    )
  }

  const { especialidad, centro_salud: centro } = perfil

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Navbar />

      <main className="flex-1 bg-gray-50 py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* ── Encabezado ── */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mi Panel</h1>
            <p className="text-sm text-gray-400 mt-1">
              Tu perfil profesional y tu disponibilidad para los pacientes
            </p>
          </div>

          {/* ── Tarjeta del perfil (HU-040) ── */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="bg-primary px-5 sm:px-8 py-6 sm:py-8 flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center
                              text-white text-2xl font-bold select-none flex-shrink-0">
                {iniciales(perfil.usuario.nombre)}
              </div>
              <div className="min-w-0">
                <h2 className="text-white text-xl font-bold break-words">{perfil.usuario.nombre}</h2>
                <p className="text-white/70 text-sm break-words">{especialidad.nombre}</p>
                <span
                  className={`inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-3 py-1 rounded-full ${
                    perfil.disponible ? 'bg-green-100 text-green-700' : 'bg-white/20 text-white'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${perfil.disponible ? 'bg-green-500' : 'bg-white/70'}`} />
                  {perfil.disponible ? 'Disponible' : 'No disponible'}
                </span>
              </div>
            </div>

            <div className="px-5 sm:px-8 py-2">
              <FilaDato icono={Stethoscope} etiqueta="Especialidad">
                {especialidad.nombre}
                <p className="text-xs font-normal text-gray-400 mt-0.5">
                  La asigna el administrador. Si no es correcta, comunicate con él.
                </p>
              </FilaDato>
              <FilaDato icono={Building2} etiqueta="Centro de salud">
                {centro.nombre}
              </FilaDato>
              <FilaDato icono={MapPin} etiqueta="Dirección">
                {centro.direccion}{centro.zona ? ` — ${centro.zona}` : ''}
              </FilaDato>
              <FilaDato icono={Phone} etiqueta="Teléfono de contacto">
                {perfil.telefono_contacto}
              </FilaDato>
              <FilaDato icono={FileText} etiqueta="Descripción profesional">
                <span className="font-normal text-gray-700 whitespace-pre-line">{perfil.descripcion_profesional}</span>
              </FilaDato>
            </div>
          </div>

          {/* ── Disponibilidad (HU-042) ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8 space-y-4">
            <InterruptorDisponibilidad
              disponible={perfil.disponible}
              cambiando={cambiandoDisponibilidad}
              onCambiar={handleCambiarDisponibilidad}
            />
            {avisoDisponibilidad && <AvisoMensaje aviso={avisoDisponibilidad} />}
          </div>

          {/* ── Editar perfil (HU-041) ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Pencil className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">Editar perfil profesional</h3>
                <p className="text-xs text-gray-400">Lo ven los pacientes en el detalle de tu perfil</p>
              </div>
            </div>

            <form onSubmit={handleGuardarPerfil} noValidate className="space-y-4">
              <div>
                <label htmlFor="medico-descripcion" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Descripción profesional
                </label>
                <textarea
                  id="medico-descripcion"
                  rows={4}
                  value={descripcion}
                  onChange={(e) => {
                    setDescripcion(e.target.value)
                    setErrores((prev) => ({ ...prev, descripcion: undefined }))
                    setAvisoPerfil(null)
                  }}
                  maxLength={MAX_DESCRIPCION}
                  disabled={guardando}
                  placeholder="Tu experiencia y las áreas que atendés"
                  aria-invalid={Boolean(errores.descripcion)}
                  className={`input-field resize-none ${errores.descripcion ? 'border-red-300 focus:ring-red-400' : ''}`}
                />
                <div className="flex justify-between gap-4 mt-1">
                  <p role={errores.descripcion ? 'alert' : undefined} className="text-xs text-red-600">
                    {errores.descripcion}
                  </p>
                  <p className="text-xs text-gray-400 flex-shrink-0">
                    {descripcion.trim().length} / {MAX_DESCRIPCION}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="medico-telefono" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Teléfono de contacto
                </label>
                <input
                  id="medico-telefono"
                  type="tel"
                  value={telefono}
                  onChange={(e) => {
                    setTelefono(e.target.value)
                    setErrores((prev) => ({ ...prev, telefono: undefined }))
                    setAvisoPerfil(null)
                  }}
                  maxLength={MAX_TELEFONO}
                  disabled={guardando}
                  placeholder="Ej. 70000000"
                  aria-invalid={Boolean(errores.telefono)}
                  className={`input-field ${errores.telefono ? 'border-red-300 focus:ring-red-400' : ''}`}
                />
                {errores.telefono && (
                  <p role="alert" className="text-xs text-red-600 mt-1">{errores.telefono}</p>
                )}
              </div>

              {avisoPerfil && <AvisoMensaje aviso={avisoPerfil} />}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={guardando}
                  className="btn-primary flex items-center gap-2 py-2.5 px-6"
                >
                  {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>

          {/* ── Contraseña (HU-043: se cambia desde Mi Perfil) ── */}
          <Link
            href="/perfil"
            className="bg-white rounded-2xl border border-gray-100 p-5 sm:px-8 flex items-center gap-3
                       hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">Cambiar contraseña</p>
              <p className="text-xs text-gray-400">Desde Mi Perfil, confirmando tu contraseña actual</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </Link>

        </div>
      </main>
    </>
  )
}
