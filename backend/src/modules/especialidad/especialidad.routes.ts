import { Router } from 'express'
import { listar, crear, actualizar, desactivar } from './especialidad.controller'
import { requireAuth, requireRole } from '../../middleware/auth.middleware'

const router    = Router()
const soloAdmin = requireRole('administrador')

router.get('/',     listar)
router.post('/',    requireAuth, soloAdmin, crear)
router.patch('/:id', requireAuth, soloAdmin, actualizar)
router.delete('/:id', requireAuth, soloAdmin, desactivar)

export default router
