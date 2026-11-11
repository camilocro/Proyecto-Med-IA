import "dotenv/config";
import "express-async-errors"; // Captura errores async sin necesidad de try/catch
import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./modules/auth/auth.routes";
import consultaRoutes from "./modules/consulta/consulta.routes";
import medicoRoutes from "./modules/medico/medico.routes";
import especialidadRoutes from "./modules/especialidad/especialidad.routes";
import adminRoutes from "./modules/admin/admin.routes";
import { globalErrorHandler } from "./middleware/errorHandler.middleware";

import usuarioRoutes from "./modules/usuario/usuario.routes";

const app = express();
const PORT = process.env.PORT ?? 3001;

// En producción (Render) la app está detrás de un proxy: sin esto, req.ip sería la IP
// del proxy y el registro de accesos y el límite diario de anónimos verían a todos igual.
// TRUST_PROXY = cantidad de proxies delante de la app (0 en local).
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 0));

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" }));
app.use(express.json({ limit: "500kb" })); // la foto del médico llega en base64 (hasta 300 KB)

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", sistema: "Med-IA Backend", version: "0.1.0" });
});

// ─── Módulos de la aplicación ─────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/consultas", consultaRoutes);
app.use("/medicos", medicoRoutes);
app.use("/especialidades", especialidadRoutes);
app.use("/admin", adminRoutes);
app.use("/usuarios", usuarioRoutes);

// ─── Handler global de errores (debe ir al final) ─────────────────────────────
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Med-IA Backend → http://localhost:${PORT}`);
});
