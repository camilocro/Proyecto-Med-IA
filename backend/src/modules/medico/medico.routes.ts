import { Router } from 'express'
import { porEspecialidad, miPerfil, actualizarPerfil, toggleDisponibilidad, listar } from './medico.controller'
import { requireAuth, requireRole } from '../../middleware/auth.middleware'

const router = Router()

const soloMedico = requireRole('medico')
const soloAdmin  = requireRole('administrador')

router.get('/especialidad/:idEspecialidad',  porEspecialidad)
router.get('/perfil',                        requireAuth, soloMedico, miPerfil)
router.patch('/perfil',                      requireAuth, soloMedico, actualizarPerfil)
router.patch('/disponibilidad',              requireAuth, soloMedico, toggleDisponibilidad)
router.get('/',                              requireAuth, soloAdmin,  listar)

export default router
