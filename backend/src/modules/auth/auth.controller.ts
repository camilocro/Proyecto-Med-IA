import { Request, Response } from 'express'
import { registerUsuario, loginUsuario } from './auth.service'
import { ok } from '../../shared/types'

export async function register(req: Request, res: Response) {
  const resultado = await registerUsuario(req.body)
  res.status(201).json(ok(resultado))
}

export async function login(req: Request, res: Response) {
  const resultado = await loginUsuario(req.body)
  res.json(ok(resultado))
}

export function logout(_req: Request, res: Response) {
  res.json(ok({ message: 'Sesión cerrada' }))
}
