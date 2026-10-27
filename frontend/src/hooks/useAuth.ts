'use client'

import { useState, useEffect } from 'react'
import { Usuario }              from '@/types'

const TOKEN_KEY  = 'med_ia_token'
const USUARIO_KEY = 'med_ia_usuario'

// Cada componente que usa useAuth tiene su propio estado. Este evento avisa a todos
// (Navbar, Sidebar, páginas) cuando la sesión cambia, p. ej. al editar el nombre en el perfil.
const EVENTO_SESION = 'med-ia:sesion'

/** Lee la sesión guardada; si los datos están corruptos o falta el token, la limpia. */
function leerSesion(): Usuario | null {
  const usuarioGuardado = localStorage.getItem(USUARIO_KEY)
  const tokenGuardado   = localStorage.getItem(TOKEN_KEY)
  if (!usuarioGuardado || !tokenGuardado) return null
  try {
    return JSON.parse(usuarioGuardado) as Usuario
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USUARIO_KEY)
    return null
  }
}

export function useAuth() {
  const [usuario,  setUsuario]  = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    setUsuario(leerSesion())
    setCargando(false)

    const sincronizar = () => setUsuario(leerSesion())
    window.addEventListener(EVENTO_SESION, sincronizar)
    window.addEventListener('storage', sincronizar) // cambios hechos en otra pestaña
    return () => {
      window.removeEventListener(EVENTO_SESION, sincronizar)
      window.removeEventListener('storage', sincronizar)
    }
  }, [])

  function guardarSesion(token: string, usuarioAutenticado: Usuario) {
    localStorage.setItem(TOKEN_KEY,   token)
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioAutenticado))
    setUsuario(usuarioAutenticado)
    window.dispatchEvent(new Event(EVENTO_SESION))
  }

  function cerrarSesion() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USUARIO_KEY)
    setUsuario(null)
    window.dispatchEvent(new Event(EVENTO_SESION))
  }

  const estaAutenticado = usuario !== null
  const esAdmin         = usuario?.rol === 'administrador'
  const esMedico        = usuario?.rol === 'medico'

  return { usuario, cargando, estaAutenticado, esAdmin, esMedico, guardarSesion, cerrarSesion }
}
