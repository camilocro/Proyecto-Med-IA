'use client'

import { useState }     from 'react'
import { useRouter }    from 'next/navigation'
import { useAuth }      from '@/hooks/useAuth'
import { authService }  from '@/services/auth.service'
import { Shield, Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react'

type TabActiva = 'login' | 'registro'

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

interface InputFieldProps {
  icono:       React.ReactNode
  tipo:        string
  placeholder: string
  value:       string
  onChange:    (v: string) => void
  disabled?:   boolean
  accionDerecha?: React.ReactNode
}

function InputField({ icono, tipo, placeholder, value, onChange, disabled, accionDerecha }: InputFieldProps) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{icono}</span>
      <input
        type={tipo}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 pl-11
                   text-sm text-gray-800 placeholder-gray-400
                   focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                   disabled:bg-gray-50 disabled:text-gray-400"
      />
      {accionDerecha && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2">{accionDerecha}</span>
      )}
    </div>
  )
}

export default function AuthForm({ tabInicial = 'login' }: { tabInicial?: TabActiva }) {
  const router              = useRouter()
  const { guardarSesion }   = useAuth()
  const [tab, setTab]       = useState<TabActiva>(tabInicial)
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Login
  const [correoLogin,    setCorreoLogin]    = useState('')
  const [passwordLogin,  setPasswordLogin]  = useState('')
  const [verPasswordLogin, setVerPasswordLogin] = useState(false)
  const [recordarme,     setRecordarme]     = useState(false)

  // Registro
  const [nombre,           setNombre]           = useState('')
  const [correoReg,        setCorreoReg]         = useState('')
  const [passwordReg,      setPasswordReg]       = useState('')
  const [verPasswordReg,   setVerPasswordReg]    = useState(false)
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [aceptaTerminos,   setAceptaTerminos]    = useState(false)

  const fuerzaPassword = calcularFuerzaPassword(passwordReg)
  const nivelActual    = nivelFuerza(fuerzaPassword)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!correoLogin || !passwordLogin) return

    setCargando(true)
    setError(null)

    const resultado = await authService.login({ correo: correoLogin, password: passwordLogin })
      .catch((err) => {
        setError(err.response?.data?.message ?? 'Credenciales inválidas. Verificá tus datos.')
        return null
      })
      .finally(() => setCargando(false))

    if (!resultado) return
    guardarSesion(resultado.token, resultado.usuario)
    router.push('/')
  }

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre || !correoReg || !passwordReg || !confirmarPassword) return

    if (passwordReg !== confirmarPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!aceptaTerminos) {
      setError('Debés aceptar los términos y condiciones.')
      return
    }

    setCargando(true)
    setError(null)

    const resultado = await authService.register({ nombre, correo: correoReg, password: passwordReg })
      .catch((err) => {
        setError(err.response?.data?.message ?? 'Error al crear la cuenta. Intentá de nuevo.')
        return null
      })
      .finally(() => setCargando(false))

    if (!resultado) return
    guardarSesion(resultado.token, resultado.usuario)
    router.push('/')
  }

  function cambiarTab(nuevaTab: TabActiva) {
    setTab(nuevaTab)
    setError(null)
  }

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
        {(['login', 'registro'] as TabActiva[]).map((t) => (
          <button
            key={t}
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

      {/* Error global */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Formulario Login ─────────────────────────────────────────────── */}
      {tab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <InputField
            icono={<Mail className="w-4 h-4" />}
            tipo="email"
            placeholder="Correo electrónico"
            value={correoLogin}
            onChange={setCorreoLogin}
            disabled={cargando}
          />
          <InputField
            icono={<Lock className="w-4 h-4" />}
            tipo={verPasswordLogin ? 'text' : 'password'}
            placeholder="Contraseña"
            value={passwordLogin}
            onChange={setPasswordLogin}
            disabled={cargando}
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
            disabled={cargando || !correoLogin || !passwordLogin}
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
        <form onSubmit={handleRegistro} className="space-y-4">
          <InputField
            icono={<User className="w-4 h-4" />}
            tipo="text"
            placeholder="Nombre completo"
            value={nombre}
            onChange={setNombre}
            disabled={cargando}
          />
          <InputField
            icono={<Mail className="w-4 h-4" />}
            tipo="email"
            placeholder="Correo electrónico"
            value={correoReg}
            onChange={setCorreoReg}
            disabled={cargando}
          />
          <div className="space-y-1.5">
            <InputField
              icono={<Lock className="w-4 h-4" />}
              tipo={verPasswordReg ? 'text' : 'password'}
              placeholder="Contraseña"
              value={passwordReg}
              onChange={setPasswordReg}
              disabled={cargando}
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
            icono={<Lock className="w-4 h-4" />}
            tipo="password"
            placeholder="Confirmar contraseña"
            value={confirmarPassword}
            onChange={setConfirmarPassword}
            disabled={cargando}
          />

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={aceptaTerminos}
              onChange={(e) => setAceptaTerminos(e.target.checked)}
              className="w-4 h-4 accent-primary rounded"
            />
            <span className="text-sm text-gray-600">Acepto los términos y condiciones</span>
          </label>

          <button
            type="submit"
            disabled={cargando || !nombre || !correoReg || !passwordReg || !confirmarPassword || !aceptaTerminos}
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

      {/* Link inferior */}
      <p className="text-center text-sm text-gray-400 mt-6">
        {tab === 'login' ? (
          <>¿No tenés cuenta?{' '}
            <button onClick={() => cambiarTab('registro')} className="text-accent hover:underline font-medium">
              Registrate gratis
            </button>
          </>
        ) : (
          <>¿Ya tenés cuenta?{' '}
            <button onClick={() => cambiarTab('login')} className="text-accent hover:underline font-medium">
              Iniciá sesión
            </button>
          </>
        )}
      </p>
    </div>
  )
}
