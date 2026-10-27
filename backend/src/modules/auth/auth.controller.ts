import { Request, Response } from 'express'
import { registerUsuario, loginUsuario } from './auth.service'
import { ok } from '../../shared/types'
import { badRequest } from '../../errors/AppError'
import {
  MIN_LONGITUD_NOMBRE,
  MAX_LONGITUD_NOMBRE,
  MIN_LONGITUD_PASSWORD,
} from '../../constants'

// ─── Validaciones de entrada (HU-001 CA-3/CA-4, HU-033) ──────────────────────
// Sin estas validaciones, un body incompleto llegaba a Prisma y respondía 500.

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validarCorreo(valor: unknown): string {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw badRequest('Ingresa tu correo electrónico')
  }
  const correo = valor.trim()
  if (!REGEX_CORREO.test(correo)) throw badRequest('El correo electrónico no es válido')
  return correo
}

function validarRegistro(body: unknown) {
  const { nombre, correo, password } = (body ?? {}) as Record<string, unknown>

  if (typeof nombre !== 'string' || !nombre.trim()) {
    throw badRequest('Ingresa tu nombre completo')
  }
  const nombreLimpio = nombre.trim()
  if (nombreLimpio.length < MIN_LONGITUD_NOMBRE || nombreLimpio.length > MAX_LONGITUD_NOMBRE) {
    throw badRequest(
      `El nombre debe tener entre ${MIN_LONGITUD_NOMBRE} y ${MAX_LONGITUD_NOMBRE} caracteres`,
    )
  }

  const correoValido = validarCorreo(correo)

  if (typeof password !== 'string' || password.length < MIN_LONGITUD_PASSWORD) {
    throw badRequest(`La contraseña debe tener al menos ${MIN_LONGITUD_PASSWORD} caracteres`)
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw badRequest('La contraseña debe tener al menos una letra y un número')
  }

  return { nombre: nombreLimpio, correo: correoValido, password }
}

function validarLogin(body: unknown) {
  const { correo, password } = (body ?? {}) as Record<string, unknown>
  const correoValido = validarCorreo(correo)
  if (typeof password !== 'string' || !password) throw badRequest('Ingresa tu contraseña')
  return { correo: correoValido, password }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response) {
  const resultado = await registerUsuario(validarRegistro(req.body))
  res.status(201).json(ok(resultado))
}

export async function login(req: Request, res: Response) {
  const resultado = await loginUsuario(validarLogin(req.body))
  res.json(ok(resultado))
}

export function logout(_req: Request, res: Response) {
  res.json(ok({ message: 'Sesión cerrada' }))
}
