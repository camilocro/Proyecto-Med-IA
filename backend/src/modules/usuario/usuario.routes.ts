import { Router } from "express";
import { miPerfil, editarPerfil, eliminarMiCuenta } from "./usuario.controller";
import { requireAuth } from "../../middleware/auth.middleware";

const router = Router();

router.get("/perfil", requireAuth, miPerfil);
router.patch("/perfil", requireAuth, editarPerfil);
router.delete("/perfil", requireAuth, eliminarMiCuenta);

export default router;
