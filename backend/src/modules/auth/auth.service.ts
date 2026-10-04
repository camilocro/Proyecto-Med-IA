import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../../config/prisma'
import { conflict, unauthorized } from '../../errors/AppError'
import { SALT_ROUNDS, JWT_EXPIRES_IN, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES } from '../../constants'

interface RegisterInput {
  nombre:   string
  correo:   string
  password: string
}

interface LoginInput {
  correo:   string
  password: string
}

function signToken(payload: { id_usuario: number; correo: string; rol: string }): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET no definido')
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

export async function registerUsuario(input: RegisterInput) {
  const existente = await prisma.usuario.findUnique({ where: { correo: input.correo } })
  if (existente) throw conflict('El correo ya está registrado')

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)

  const usuario = await prisma.usuario.create({
    data: {
      nombre:        input.nombre,
      correo:        input.correo,
      password_hash: passwordHash,
      rol:           'paciente',
    },
  })

  // Crear perfil de paciente automáticamente
  await prisma.paciente.create({ data: { id_usuario: usuario.id_usuario } })

  const token = signToken({ id_usuario: usuario.id_usuario, correo: usuario.correo, rol: usuario.rol })
  return { token, usuario: { id_usuario: usuario.id_usuario, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol } }
}

export async function loginUsuario(input: LoginInput) {
  const usuario = await prisma.usuario.findUnique({ where: { correo: input.correo } })
  if (!usuario || !usuario.activo) throw unauthorized('Credenciales inválidas')

  if (usuario.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) {
    throw unauthorized('Cuenta bloqueada temporalmente por múltiples intentos fallidos')
  }

  const passwordValida = await bcrypt.compare(input.password, usuario.password_hash)

  if (!passwordValida) {
    const nuevosIntentos = usuario.intentos_fallidos + 1
    const bloqueoHasta   = nuevosIntentos >= MAX_LOGIN_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
      : null

    await prisma.usuario.update({
      where: { id_usuario: usuario.id_usuario },
      data:  { intentos_fallidos: nuevosIntentos, bloqueado_hasta: bloqueoHasta },
    })
    throw unauthorized('Credenciales inválidas')
  }

  // Reset intentos al hacer login exitoso
  await prisma.usuario.update({
    where: { id_usuario: usuario.id_usuario },
    data:  { intentos_fallidos: 0, bloqueado_hasta: null },
  })

  const token = signToken({ id_usuario: usuario.id_usuario, correo: usuario.correo, rol: usuario.rol })
  return { token, usuario: { id_usuario: usuario.id_usuario, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol } }
}
