import { Router } from 'express'
import {
  porEspecialidad,
  miPerfil,
  actualizarPerfil,
  toggleDisponibilidad,
  listar,
  centros,
  crear,
  actualizar,
  cambiarEstado,
} from './medico.controller'
import { requireAuth, requireRole } from '../../middleware/auth.middleware'

const router = Router()

const soloMedico = requireRole('medico')
const soloAdmin  = requireRole('administrador')

// IMPORTANTE: rutas estáticas ANTES que las dinámicas (:id)
router.get('/especialidad/:idEspecialidad',  porEspecialidad)
router.get('/perfil',                        requireAuth, soloMedico, miPerfil)
router.patch('/perfil',                      requireAuth, soloMedico, actualizarPerfil)
router.patch('/disponibilidad',              requireAuth, soloMedico, toggleDisponibilidad)
router.get('/centros',                       requireAuth, soloAdmin,  centros)
router.get('/',                              requireAuth, soloAdmin,  listar)
router.post('/',                             requireAuth, soloAdmin,  crear)
router.patch('/:id',                         requireAuth, soloAdmin,  actualizar)
router.patch('/:id/estado',                  requireAuth, soloAdmin,  cambiarEstado)

export default router
