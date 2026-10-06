import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SALT_ROUNDS } from "../src/constants";

// Solo para desarrollo: todos los médicos de prueba comparten esta contraseña
const PASSWORD_MEDICOS_DEMO = "Medico123!";

const MEDICOS_DEMO = [
  {
    nombre: "Dra. Ana Rojas",
    correo: "ana.rojas@med-ia.bo",
    especialidad: "Medicina General",
    telefono: "70000001",
    disponible: true,
    descripcion:
      "Médica general con 10 años de experiencia en atención primaria.",
  },
  {
    nombre: "Dr. Luis Mamani",
    correo: "luis.mamani@med-ia.bo",
    especialidad: "Medicina General",
    telefono: "70000002",
    disponible: false,
    descripcion: "Médico general enfocado en medicina familiar.",
  },
  {
    nombre: "Dr. Carlos Quispe",
    correo: "carlos.quispe@med-ia.bo",
    especialidad: "Neurología",
    telefono: "70000003",
    disponible: true,
    descripcion: "Neurólogo especializado en cefaleas y trastornos del sueño.",
  },
  {
    nombre: "Dra. María Fernández",
    correo: "maria.fernandez@med-ia.bo",
    especialidad: "Neurología",
    telefono: "70000004",
    disponible: true,
    descripcion: "Neuróloga con experiencia en evaluación de mareos y vértigo.",
  },
  {
    nombre: "Dr. Jorge Vargas",
    correo: "jorge.vargas@med-ia.bo",
    especialidad: "Cardiología",
    telefono: "70000005",
    disponible: true,
    descripcion: "Cardiólogo clínico con experiencia en atención de urgencias.",
  },
  {
    nombre: "Dra. Paola Gutiérrez",
    correo: "paola.gutierrez@med-ia.bo",
    especialidad: "Gastroenterología",
    telefono: "70000006",
    disponible: true,
    descripcion: "Gastroenteróloga dedicada a molestias digestivas.",
  },
];

export async function seedMedicos(prisma: PrismaClient) {
  const centro = await prisma.centroSalud.findFirst({
    where: { activo: true },
  });
  if (!centro)
    throw new Error("Debe existir un centro de salud antes de crear médicos");

  const passwordHash = await bcrypt.hash(PASSWORD_MEDICOS_DEMO, SALT_ROUNDS);

  for (const m of MEDICOS_DEMO) {
    const especialidad = await prisma.especialidad.findUnique({
      where: { nombre: m.especialidad },
    });
    if (!especialidad) {
      console.warn(
        `  ! Especialidad "${m.especialidad}" no existe, se omite a ${m.nombre}`,
      );
      continue;
    }

    const usuario = await prisma.usuario.upsert({
      where: { correo: m.correo },
      update: {},
      create: {
        nombre: m.nombre,
        correo: m.correo,
        password_hash: passwordHash,
        rol: "medico",
        verificado: true,
      },
    });

    await prisma.medico.upsert({
      where: { id_usuario: usuario.id_usuario },
      update: { disponible: m.disponible },
      create: {
        id_usuario: usuario.id_usuario,
        id_especialidad: especialidad.id_especialidad,
        id_centro_salud: centro.id_centro_salud,
        descripcion_profesional: m.descripcion,
        telefono_contacto: m.telefono,
        disponible: m.disponible,
      },
    });
  }

  console.log(
    `✓ ${MEDICOS_DEMO.length} médicos de prueba (contraseña: ${PASSWORD_MEDICOS_DEMO})`,
  );
}
