import "dotenv/config";
import prisma from "../config/prisma";
import { huellaCorreo } from "../shared/huellaCorreo";

const DOMINIO_CUENTA_ELIMINADA = "eliminada.med-ia.invalid";

/**
 * Se ejecuta UNA vez. Las cuentas eliminadas antes de la anonimización conservan su correo real
 * y lo dejan bloqueado. Este script las anonimiza igual que hoy y les guarda la huella,
 * para que ese correo pueda registrarse de nuevo y reciba la bienvenida de vuelta.
 */
async function main() {
  if (!process.env.CLAVE_HUELLA_CORREO?.trim()) {
    console.error("Falta CLAVE_HUELLA_CORREO en el .env");
    process.exitCode = 1;
    return;
  }

  const cuentas = await prisma.usuario.findMany({
    where: {
      eliminado_en: { not: null },
      NOT: { correo: { endsWith: `@${DOMINIO_CUENTA_ELIMINADA}` } },
    },
    select: { id_usuario: true, correo: true },
  });

  for (const cuenta of cuentas) {
    const correoAnonimo = `eliminada-${cuenta.id_usuario}@${DOMINIO_CUENTA_ELIMINADA}`;
    await prisma.$transaction([
      prisma.intentoLogin.updateMany({
        where: {
          OR: [
            { id_usuario: cuenta.id_usuario },
            { correo_intentado: cuenta.correo },
          ],
        },
        data: { correo_intentado: correoAnonimo },
      }),
      prisma.notificacionEmail.updateMany({
        where: {
          OR: [
            { id_usuario: cuenta.id_usuario },
            { destinatario: cuenta.correo },
          ],
        },
        data: { destinatario: correoAnonimo },
      }),
      prisma.usuario.update({
        where: { id_usuario: cuenta.id_usuario },
        data: {
          nombre: "Cuenta eliminada",
          correo: correoAnonimo,
          password_hash: "cuenta-eliminada",
          huella_correo: huellaCorreo(cuenta.correo),
          activo: false,
          verificado: false,
          recibir_correos: false,
          doble_factor: false,
          token_version: { increment: 1 },
        },
      }),
    ]);
    console.log(`✓ Cuenta ${cuenta.id_usuario} anonimizada`);
  }
  console.log(`Listo: ${cuentas.length} cuenta(s) anonimizada(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
