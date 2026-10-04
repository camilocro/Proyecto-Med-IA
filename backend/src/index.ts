import 'dotenv/config'
import 'express-async-errors'  // Captura errores async sin necesidad de try/catch
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

import authRoutes         from './modules/auth/auth.routes'
import consultaRoutes     from './modules/consulta/consulta.routes'
import medicoRoutes       from './modules/medico/medico.routes'
import especialidadRoutes from './modules/especialidad/especialidad.routes'
import adminRoutes        from './modules/admin/admin.routes'
import { globalErrorHandler } from './middleware/errorHandler.middleware'

const app  = express()
const PORT = process.env.PORT ?? 3001

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' }))
app.use(express.json())

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sistema: 'Med-IA Backend', version: '0.1.0' })
})

// ─── Módulos de la aplicación ─────────────────────────────────────────────────
app.use('/auth',           authRoutes)
app.use('/consultas',      consultaRoutes)
app.use('/medicos',        medicoRoutes)
app.use('/especialidades', especialidadRoutes)
app.use('/admin',          adminRoutes)

// ─── Handler global de errores (debe ir al final) ─────────────────────────────
app.use(globalErrorHandler)

app.listen(PORT, () => {
  console.log(`Med-IA Backend → http://localhost:${PORT}`)
})
