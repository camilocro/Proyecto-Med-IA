import { Router } from "express";
import {
  miPerfil,
  editarPerfil,
  eliminarMiCuenta,
  cambiarMiDobleFactor,
} from "./usuario.controller";
import { requireAuth } from "../../middleware/auth.middleware";

const router = Router();

router.get("/perfil", requireAuth, miPerfil);
router.patch("/perfil", requireAuth, editarPerfil);
router.delete("/perfil", requireAuth, eliminarMiCuenta);
router.patch("/perfil/doble-factor", requireAuth, cambiarMiDobleFactor);

export default router;
