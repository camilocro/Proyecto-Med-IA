import "dotenv/config";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../config/prisma";
import { SALT_ROUNDS } from "../constants";

const CORREO_ADMIN_DEMO = "admin@med-ia.bo";
const DOMINIO_DEMO = "@med-ia.bo";
const PASSWORDS_DEMO = ["Admin123!", "Medico123!"]; // las que estaban publicadas en el repo

function hashAleatorio(): Promise<string> {
  return bcrypt.hash(crypto.randomBytes(32).toString("hex"), SALT_ROUNDS);
}

async function usaPasswordDemo(hash: string): Promise<boolean> {
  for (const password of PASSWORDS_DEMO) {
    if (await bcrypt.compare(password, hash).catch(() => false)) return true;
  }
  return false;
}

/**
 * Se puede ejecutar más de una vez sin problema.
 * 1. Da de baja admin@med-ia.bo (sin borrarlo de la BD), solo si queda otro administrador activo.
 * 2. Reemplaza por una aleatoria la contraseña de toda cuenta @med-ia.bo que siga con una de prueba.
 *    Los médicos de prueba siguen apareciendo en el triage, pero nadie puede iniciar sesión con ellos.
 */
async function main() {
  const otrosAdmins = await prisma.usuario.count({
    where: {
      rol: "administrador",
      activo: true,
      eliminado_en: null,
      NOT: { correo: CORREO_ADMIN_DEMO },
    },
  });
  if (otrosAdmins === 0) {
    console.error(
      "No hay otro administrador activo: no se da de baja admin@med-ia.bo. No se cambió nada.",
    );
    process.exitCode = 1;
    return;
  }

  const admin = await prisma.usuario.findUnique({
    where: { correo: CORREO_ADMIN_DEMO },
  });
  if (admin && (admin.activo || !admin.eliminado_en)) {
    await prisma.usuario.update({
      where: { id_usuario: admin.id_usuario },
      data: {
        activo: false,
        eliminado_en: admin.eliminado_en ?? new Date(),
        password_hash: await hashAleatorio(),
        doble_factor: false,
        token_version: { increment: 1 }, // cierra cualquier sesión abierta
      },
    });
    console.log(`✓ ${CORREO_ADMIN_DEMO} dado de baja`);
  } else {
    console.log(`· ${CORREO_ADMIN_DEMO} ya estaba dado de baja (o no existe)`);
  }

  const cuentas = await prisma.usuario.findMany({
    where: { correo: { endsWith: DOMINIO_DEMO }, eliminado_en: null },
    select: { id_usuario: true, correo: true, password_hash: true },
  });

  let cambiadas = 0;
  for (const cuenta of cuentas) {
    if (!(await usaPasswordDemo(cuenta.password_hash))) continue;
    await prisma.usuario.update({
      where: { id_usuario: cuenta.id_usuario },
      data: {
        password_hash: await hashAleatorio(),
        token_version: { increment: 1 },
      },
    });
    console.log(`✓ ${cuenta.correo}: contraseña de prueba reemplazada`);
    cambiadas++;
  }
  console.log(`Listo: ${cambiadas} cuenta(s) de prueba con contraseña nueva.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
