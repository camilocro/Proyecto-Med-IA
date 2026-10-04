import { Router } from 'express'
import { iniciar, obtener, responderRonda, cancelar, historial } from './consulta.controller'
import { requireAuth, optionalAuth } from '../../middleware/auth.middleware'
import { checkDailyLimit } from '../../middleware/dailyLimit.middleware'

const router = Router()

// IMPORTANTE: rutas estáticas ANTES que las dinámicas (:id)
// /historial debe ir antes de /:id para que Express no lo interprete como un id
router.get('/historial',                          requireAuth,   historial)
router.post('/',                                  optionalAuth,  checkDailyLimit, iniciar)
router.get('/:id',                                optionalAuth,  obtener)
router.post('/:id/rondas/:idRonda/respuestas',    optionalAuth,  responderRonda)
router.patch('/:id/cancelar',                     optionalAuth,  cancelar)

export default router
