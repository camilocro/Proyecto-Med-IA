import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import prisma from "../config/prisma";
import { enviarCorreo } from "../shared/correo";
import { plantillaCorreo } from "../shared/plantillaCorreo";

async function main() {
  const para = process.argv[2] ?? process.env.SMTP_USER;
  if (!para) {
    console.error(
      "Uso: npx ts-node src/scripts/probarCorreo.ts <correo-destino>",
    );
    process.exitCode = 1;
    return;
  }

  const html = plantillaCorreo({
    titulo: "Correo de prueba",
    saludo: "Hola,",
    parrafos: ["Si ves este correo, el servicio de correo de Med-IA funciona."],
    detalles: [
      { etiqueta: "Especialidad", valor: "Neurología" },
      { etiqueta: "Urgencia", valor: "Media" },
    ],
    lista: {
      titulo: "Médicos recomendados",
      items: ["Dr. Carlos Quispe", "Dra. María Fernández"],
    },
    boton: {
      texto: "Abrir Med-IA",
      url: process.env.FRONTEND_URL ?? "http://localhost:3000",
    },
    aviso: "Esta es una orientación, no un diagnóstico médico.",
    nota: "Si no esperabas este correo, puedes ignorarlo.",
  });

  // Copia del HTML para ver el diseño en el navegador
  const vistaPrevia = path.join(os.tmpdir(), "media-correo-prueba.html");
  fs.writeFileSync(vistaPrevia, html, "utf8");
  console.log(`Vista previa del diseño: ${vistaPrevia}`);

  const ok = await enviarCorreo({
    para,
    asunto: "Med-IA: correo de prueba",
    html,
    tipo: "prueba",
  });
  console.log(ok ? "✓ Correo procesado" : "✗ No se pudo enviar el correo");
}

main().finally(() => prisma.$disconnect());
