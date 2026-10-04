'use client'

import { useState, useEffect } from 'react'
import { Usuario }              from '@/types'

const TOKEN_KEY  = 'med_ia_token'
const USUARIO_KEY = 'med_ia_usuario'

export function useAuth() {
  const [usuario,  setUsuario]  = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem(USUARIO_KEY)
    if (usuarioGuardado) setUsuario(JSON.parse(usuarioGuardado) as Usuario)
    setCargando(false)
  }, [])

  function guardarSesion(token: string, usuarioAutenticado: Usuario) {
    localStorage.setItem(TOKEN_KEY,   token)
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioAutenticado))
    setUsuario(usuarioAutenticado)
  }

  function cerrarSesion() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USUARIO_KEY)
    setUsuario(null)
  }

  const estaAutenticado = usuario !== null
  const esAdmin         = usuario?.rol === 'administrador'
  const esMedico        = usuario?.rol === 'medico'

  return { usuario, cargando, estaAutenticado, esAdmin, esMedico, guardarSesion, cerrarSesion }
}
