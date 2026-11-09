import { Router } from "express";
import {
  register,
  login,
  logout,
  recuperar,
  restablecer,
  verificar,
  reenviarEnlaceVerificacion,
} from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", requireAuth, logout);
router.post("/recuperar", recuperar);
router.post("/restablecer", restablecer);
router.post("/verificar", verificar);
router.post("/reenviar-verificacion", reenviarEnlaceVerificacion);

export default router;
