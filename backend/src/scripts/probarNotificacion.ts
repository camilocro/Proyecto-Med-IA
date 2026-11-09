import "dotenv/config";
import prisma from "../config/prisma";
import { notificarConsultaCompletada } from "../modules/notificacion/notificacion.service";

async function main() {
  const idConsulta = Number(process.argv[2]);
  if (!Number.isInteger(idConsulta)) {
    console.error(
      "Uso: npx ts-node src/scripts/probarNotificacion.ts <id_consulta>",
    );
    process.exitCode = 1;
    return;
  }

  const resultado = await notificarConsultaCompletada(idConsulta);
  const textos = {
    true: "✓ Enviado",
    false: "✗ Falló el envío",
    null: "— No corresponde enviar",
  };
  console.log(
    `Resultado: ${resultado} (${textos[String(resultado) as keyof typeof textos]})`,
  );
}

main().finally(() => prisma.$disconnect());
