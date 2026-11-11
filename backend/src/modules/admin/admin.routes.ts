import { Router } from "express";
import {
  dashboard,
  consultas,
  detalleConsulta,
  historialUsuario,
  rankingMedicos,
  usuarios,
  cambiarEstado,
  configuracion,
  actualizarConfiguracion,
  estadisticas,
  estadisticasPeriodo,
} from "./admin.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { accesos, detalleIp } from "./accesos.controller";

const router = Router();
const soloAdmin = requireRole("administrador");

router.use(requireAuth, soloAdmin); // Todos los endpoints de admin requieren auth + rol

router.get("/dashboard", dashboard);
router.get("/estadisticas", estadisticas);
router.get("/estadisticas/periodo", estadisticasPeriodo);
router.get("/consultas", consultas);
router.get("/consultas/:id", detalleConsulta);
router.get("/ranking-medicos", rankingMedicos);
router.get("/usuarios", usuarios);
router.get("/usuarios/:id/consultas", historialUsuario);
router.patch("/usuarios/:id/estado", cambiarEstado);
router.get("/configuracion", configuracion);
router.patch("/configuracion", actualizarConfiguracion);
router.get("/accesos", accesos);
router.get("/accesos/ip/:ip", detalleIp);

export default router;
