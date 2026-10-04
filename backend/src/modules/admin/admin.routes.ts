import { Router } from 'express'
import { dashboard, consultas, usuarios, cambiarEstado, configuracion, actualizarConfiguracion } from './admin.controller'
import { requireAuth, requireRole } from '../../middleware/auth.middleware'

const router    = Router()
const soloAdmin = requireRole('administrador')

router.use(requireAuth, soloAdmin)  // Todos los endpoints de admin requieren auth + rol

router.get('/dashboard',                dashboard)
router.get('/consultas',                consultas)
router.get('/usuarios',                 usuarios)
router.patch('/usuarios/:id/estado',    cambiarEstado)
router.get('/configuracion',            configuracion)
router.patch('/configuracion',          actualizarConfiguracion)

export default router
