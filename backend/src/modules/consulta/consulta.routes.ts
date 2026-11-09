import { Router } from "express";
import {
  iniciar,
  obtener,
  responderRonda,
  editarRespuesta,
  reiniciar,
  confirmar,
  cancelar,
  eliminar,
  historial,
  restantes,
} from "./consulta.controller";
import { requireAuth, optionalAuth } from "../../middleware/auth.middleware";
import { checkDailyLimit } from "../../middleware/dailyLimit.middleware";

const router = Router();

// IMPORTANTE: rutas estáticas ANTES que las dinámicas (:id)
// /historial y /restantes deben ir antes de /:id para que Express no las interprete como un id
router.get("/historial", requireAuth, historial);
router.get("/restantes", optionalAuth, restantes);
router.post("/", optionalAuth, checkDailyLimit, iniciar);
router.get("/:id", optionalAuth, obtener);
router.post("/:id/rondas/:idRonda/respuestas", optionalAuth, responderRonda);
router.patch("/:id/respuestas/:idPr", optionalAuth, editarRespuesta);
router.post("/:id/reiniciar", optionalAuth, reiniciar); // misma consulta: no pasa por el límite diario
router.post("/:id/confirmar", optionalAuth, confirmar);
router.patch("/:id/cancelar", optionalAuth, cancelar);
router.delete("/:id", requireAuth, eliminar);

export default router;
