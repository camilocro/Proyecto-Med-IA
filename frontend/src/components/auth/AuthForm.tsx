'use client'

import { useState, useEffect } from 'react'
import { useRouter }    from 'next/navigation'
import { useAuth }      from '@/hooks/useAuth'
import { authService }  from '@/services/auth.service'
import {
  RUTA_LOGIN_TRAS_REGISTRO,
  vieneDeRegistroExitoso,
  recordarCorreoRegistrado,
  consumirCorreoRegistrado,
} from '@/lib/flujoAuth'
import { Shield, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'

type TabActiva = 'login' | 'registro'

type CampoLogin    = 'correo' | 'password'
type CampoRegistro = 'nombre' | 'correo' | 'password' | 'confirmar' | 'terminos'
type ErroresLogin    = Partial<Record<CampoLogin, string>>
type ErroresRegistro = Partial<Record<CampoRegistro, string>>

// Mismas reglas que valida el backend (HU-001 CA-3, HU-033)
const REGEX_CORREO        = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MIN_LONGITUD_NOMBRE   = 2
const MIN_LONGITUD_PASSWORD = 8

const FUERZA_PASSWORD: { min: number; etiqueta: string; color: string }[] = [
  { min: 0,  etiqueta: '',        color: 'bg-gray-200'  },
  { min: 1,  etiqueta: 'Débil',   color: 'bg-red-400'   },
  { min: 3,  etiqueta: 'Media',   color: 'bg-amber-400' },
  { min: 5,  etiqueta: 'Fuerte',  color: 'bg-green-500' },
]

function calcularFuerzaPassword(password: string): number {
  let puntaje = 0
  if (password.length >= 8)           puntaje++
  if (password.length >= 12)          puntaje++
  if (/[A-Z]/.test(password))         puntaje++
  if (/[0-9]/.test(password))         puntaje++
  if (/[^A-Za-z0-9]/.test(password)) puntaje++
  return puntaje
}

function nivelFuerza(puntaje: number) {
  if (puntaje >= 5) return FUERZA_PASSWORD[3]
  if (puntaje >= 3) return FUERZA_PASSWORD[2]
  if (puntaje >= 1) return FUERZA_PASSWORD[1]
  return FUERZA_PASSWORD[0]
}

// ── Validaciones del lado del cliente ─────────────────────────────────────────

function validarCorreo(correo: string): string | undefined {
  if (!correo.trim())                    return 'Ingresá tu correo electrónico.'
  if (!REGEX_CORREO.test(correo.trim())) return 'Ingresá un correo electrónico válido (ej. nombre@correo.com).'
  return undefined
}

function validarLogin(correo: string, password: string): ErroresLogin {
  const errores: ErroresLogin = {}
  const errorCorreo = validarCorreo(correo)
  if (errorCorreo) errores.correo = errorCorreo
  if (!password)   errores.password = 'Ingresá tu contraseña.'
  return errores
}

function validarRegistro(datos: {
  nombre: string; correo: string; password: string; confirmar: string; aceptaTerminos: boolean
}): ErroresRegistro {
  const errores: ErroresRegistro = {}

  if (!datos.nombre.trim()) {
    errores.nombre = 'Ingresá tu nombre completo.'
  } else if (datos.nombre.trim().length < MIN_LONGITUD_NOMBRE) {
    errores.nombre = `El nombre debe tener al menos ${MIN_LONGITUD_NOMBRE} caracteres.`
  }

  const errorCorreo = validarCorreo(datos.correo)
  if (errorCorreo) errores.correo = errorCorreo

  if (!datos.password) {
    errores.password = 'Ingresá una contraseña.'
  } else if (
    datos.password.length < MIN_LONGITUD_PASSWORD ||
    !/[A-Za-z]/.test(datos.password) ||
    !/\d/.test(datos.password)
  ) {
    errores.password = `La contraseña debe tener al menos ${MIN_LONGITUD_PASSWORD} caracteres, una letra y un número.`
  }

  if (!datos.confirmar) {
    errores.confirmar = 'Confirmá tu contraseña.'
  } else if (datos.password !== datos.confirmar) {
    errores.confirmar = 'Las contraseñas no coinciden.'
  }

  if (!datos.aceptaTerminos) errores.terminos = 'Debés aceptar los términos y condiciones.'

  return errores
}

function mensajeErrorServidor(err: unknown, porDefecto: string): string {
  const error = err as { response?: { data?: { message?: string } } }
  if (!error.response) return 'No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.'
  return error.response.data?.message ?? porDefecto
}

// ── Campo de texto ────────────────────────────────────────────────────────────

interface InputFieldProps {
  id:          string
  icono:       React.ReactNode
  tipo:        string
  placeholder: string
  value:       string
  onChange:    (v: string) => void
  disabled?:   boolean
  error?:      string
  autoComplete?: string
  accionDerecha?: React.ReactNode
}

function InputField({
  id, icono, tipo, placeholder, value, onChange, disabled, error, autoComplete, accionDerecha,
}: InputFieldProps) {
  return (
    <div>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{icono}</span>
        <input
          id={id}
          type={tipo}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full border rounded-xl px-4 py-3 pl-11
                     text-sm text-gray-800 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:border-transparent
                     disabled:bg-gray-50 disabled:text-gray-400 ${
                       error
                         ? 'border-red-300 focus:ring-red-400'
                         : 'border-gray-200 focus:ring-primary'
                     }`}
        />
        {accionDerecha && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">{accionDerecha}</span>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600 mt-1.5 ml-1">
          {error}
        </p>
      )}
    </div>
  )
}

// ── Formulario ────────────────────────────────────────────────────────────────

export default function AuthForm({ tabInicial = 'login' }: { tabInicial?: TabActiva }) {
  const router              = useRouter()
  const { guardarSesion, estaAutenticado, cargando: cargandoSesion } = useAuth()
  const [tab, setTab]       = useState<TabActiva>(tabInicial)
  const [cargando, setCargando] = useState(false)
  // Error del servidor: permanece visible hasta que el usuario corrige un campo,
  // vuelve a enviar el formulario o cambia de pestaña.
  const [error,    setError]    = useState<string | null>(null)

  // Tras un registro exitoso solo se muestra el inicio de sesión (HU-001 CA-5)
  const [registroExitoso, setRegistroExitoso] = useState(false)

  // Login
  const [correoLogin,    setCorreoLogin]    = useState('')
  const [passwordLogin,  setPasswordLogin]  = useState('')
  const [verPasswordLogin, setVerPasswordLogin] = useState(false)
  const [recordarme,     setRecordarme]     = useState(false)
  const [erroresLogin,   setErroresLogin]   = useState<ErroresLogin>({})

  // Registro
  const [nombre,           setNombre]           = useState('')
  const [correoReg,        setCorreoReg]         = useState('')
  const [passwordReg,      setPasswordReg]       = useState('')
  const [verPasswordReg,   setVerPasswordReg]    = useState(false)
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [aceptaTerminos,   setAceptaTerminos]    = useState(false)
  const [erroresRegistro,  setErroresRegistro]   = useState<ErroresRegistro>({})

  const fuerzaPassword = calcularFuerzaPassword(passwordReg)
  const nivelActual    = nivelFuerza(fuerzaPassword)

  // Si se llega desde un registro exitoso, mostrar solo el login con el correo precargado
  useEffect(() => {
    if (!vieneDeRegistroExitoso()) return
    setRegistroExitoso(true)
    setTab('login')
    const correo = consumirCorreoRegistrado()
    if (correo) setCorreoLogin(correo)
  }, [])

  // Un usuario con sesión activa no necesita ver login ni registro
  useEffect(() => {
    if (!cargandoSesion && estaAutenticado) router.replace('/')
  }, [cargandoSesion, estaAutenticado, router])

  // ── Handlers de cambio: limpian solo el error del campo modificado ──────────

  function cambiarCampoLogin(campo: CampoLogin, setter: (v: string) => void) {
    return (valor: string) => {
      setter(valor)
      setError(null)
      setErroresLogin((prev) => ({ ...prev, [campo]: undefined }))
    }
  }

  function cambiarCampoRegistro(campo: CampoRegistro, setter: (v: string) => void) {
    return (valor: string) => {
      setter(valor)
      setError(null)
      setErroresRegistro((prev) => ({ ...prev, [campo]: undefined }))
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    const errores = validarLogin(correoLogin, passwordLogin)
    setErroresLogin(errores)
    setError(null)
    if (Object.keys(errores).length > 0) return

    setCargando(true)

    const resultado = await authService.login({ correo: correoLogin.trim(), password: passwordLogin })
      .catch((err) => {
        setError(mensajeErrorServidor(err, 'Credenciales inválidas. Verificá tus datos.'))
        return null
      })
      .finally(() => setCargando(false))

    if (!resultado) return
    guardarSesion(resultado.token, resultado.usuario)
    router.push('/')
  }

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault()

    const errores = validarRegistro({
      nombre, correo: correoReg, password: passwordReg, confirmar: confirmarPassword, aceptaTerminos,
    })
    setErroresRegistro(errores)
    setError(null)
    if (Object.keys(errores).length > 0) return

    setCargando(true)

    const correoNormalizado = correoReg.trim()
    const resultado = await authService.register({
      nombre: nombre.trim(), correo: correoNormalizado, password: passwordReg,
    })
      .catch((err) => {
        setError(mensajeErrorServidor(err, 'Error al crear la cuenta. Intentá de nuevo.'))
        return null
      })
      .finally(() => setCargando(false))

    if (!resultado) return

    // Flujo definido: la cuenta se crea y el usuario debe iniciar sesión (no se guarda sesión aquí)
    recordarCorreoRegistrado(correoNormalizado)
    router.replace(RUTA_LOGIN_TRAS_REGISTRO)
  }

  function cambiarTab(nuevaTab: TabActiva) {
    setTab(nuevaTab)
    setError(null)
    setErroresLogin({})
    setErroresRegistro({})
  }

  const tabsVisibles: TabActiva[] = registroExitoso ? ['login'] : ['login', 'registro']

  return (
    <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

      {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <span className="text-xl font-bold text-primary">MED-IA</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabsVisibles.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => cambiarTab(t)}
            className={`flex-1 pb-3 text-sm font-medium transition-colors ${
              tab === t
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        ))}
      </div>

      {/* Registro exitoso */}
      {registroExitoso && tab === 'login' && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">
            Tu cuenta fue creada correctamente. Iniciá sesión para continuar.
          </p>
        </div>
      )}

      {/* Error global (servidor) */}
      {error && (
        <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Formulario Login ─────────────────────────────────────────────── */}
      {tab === 'login' && (
        <form onSubmit={handleLogin} noValidate className="space-y-4">
          <InputField
            id="login-correo"
            icono={<Mail className="w-4 h-4" />}
            tipo="email"
            placeholder="Correo electrónico"
            value={correoLogin}
            onChange={cambiarCampoLogin('correo', setCorreoLogin)}
            disabled={cargando}
            error={erroresLogin.correo}
            autoComplete="email"
          />
          <InputField
            id="login-password"
            icono={<Lock className="w-4 h-4" />}
            tipo={verPasswordLogin ? 'text' : 'password'}
            placeholder="Contraseña"
            value={passwordLogin}
            onChange={cambiarCampoLogin('password', setPasswordLogin)}
            disabled={cargando}
            error={erroresLogin.password}
            autoComplete="current-password"
            accionDerecha={
              <button
                type="button"
                onClick={() => setVerPasswordLogin(!verPasswordLogin)}
                className="text-gray-400 hover:text-gray-600"
              >
                {verPasswordLogin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recordarme}
              onChange={(e) => setRecordarme(e.target.checked)}
              className="w-4 h-4 accent-primary rounded"
            />
            <span className="text-sm text-gray-600">Recordarme</span>
          </label>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-accent text-white font-semibold py-3 rounded-xl
                       hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cargando ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Ingresando...
              </span>
            ) : 'Ingresar'}
          </button>

          <p className="text-center text-sm text-accent hover:underline cursor-pointer">
            ¿Olvidaste tu contraseña?
          </p>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400">o</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <button
            type="button"
            className="w-full border border-gray-200 rounded-xl py-3 text-sm font-medium
                       text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>
        </form>
      )}

      {/* ── Formulario Registro ──────────────────────────────────────────── */}
      {tab === 'registro' && (
        <form onSubmit={handleRegistro} noValidate className="space-y-4">
          <InputField
            id="registro-nombre"
            icono={<User className="w-4 h-4" />}
            tipo="text"
            placeholder="Nombre completo"
            value={nombre}
            onChange={cambiarCampoRegistro('nombre', setNombre)}
            disabled={cargando}
            error={erroresRegistro.nombre}
            autoComplete="name"
          />
          <InputField
            id="registro-correo"
            icono={<Mail className="w-4 h-4" />}
            tipo="email"
            placeholder="Correo electrónico"
            value={correoReg}
            onChange={cambiarCampoRegistro('correo', setCorreoReg)}
            disabled={cargando}
            error={erroresRegistro.correo}
            autoComplete="email"
          />
          <div className="space-y-1.5">
            <InputField
              id="registro-password"
              icono={<Lock className="w-4 h-4" />}
              tipo={verPasswordReg ? 'text' : 'password'}
              placeholder="Contraseña"
              value={passwordReg}
              onChange={cambiarCampoRegistro('password', setPasswordReg)}
              disabled={cargando}
              error={erroresRegistro.password}
              autoComplete="new-password"
              accionDerecha={
                <button
                  type="button"
                  onClick={() => setVerPasswordReg(!verPasswordReg)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {verPasswordReg ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            {/* Barra de fuerza */}
            {passwordReg.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i <= fuerzaPassword ? nivelActual.color : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium ${
                  fuerzaPassword >= 5 ? 'text-green-600' :
                  fuerzaPassword >= 3 ? 'text-amber-600' : 'text-red-500'
                }`}>
                  {nivelActual.etiqueta}
                </span>
              </div>
            )}
          </div>

          <InputField
            id="registro-confirmar"
            icono={<Lock className="w-4 h-4" />}
            tipo="password"
            placeholder="Confirmar contraseña"
            value={confirmarPassword}
            onChange={cambiarCampoRegistro('confirmar', setConfirmarPassword)}
            disabled={cargando}
            error={erroresRegistro.confirmar}
            autoComplete="new-password"
          />

          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => {
                  setAceptaTerminos(e.target.checked)
                  setError(null)
                  setErroresRegistro((prev) => ({ ...prev, terminos: undefined }))
                }}
                className="w-4 h-4 accent-primary rounded"
              />
              <span className="text-sm text-gray-600">Acepto los términos y condiciones</span>
            </label>
            {erroresRegistro.terminos && (
              <p role="alert" className="text-xs text-red-600 mt-1.5 ml-1">{erroresRegistro.terminos}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-accent text-white font-semibold py-3 rounded-xl
                       hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cargando ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creando cuenta...
              </span>
            ) : 'Crear cuenta'}
          </button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400">o</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <button
            type="button"
            className="w-full border border-gray-200 rounded-xl py-3 text-sm font-medium
                       text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>
        </form>
      )}

      {/* Link inferior (no se ofrece registrarse otra vez tras un registro exitoso) */}
      {!registroExitoso && (
        <p className="text-center text-sm text-gray-400 mt-6">
          {tab === 'login' ? (
            <>¿No tenés cuenta?{' '}
              <button type="button" onClick={() => cambiarTab('registro')} className="text-accent hover:underline font-medium">
                Registrate gratis
              </button>
            </>
          ) : (
            <>¿Ya tenés cuenta?{' '}
              <button type="button" onClick={() => cambiarTab('login')} className="text-accent hover:underline font-medium">
                Iniciá sesión
              </button>
            </>
          )}
        </p>
      )}
    </div>
  )
}
