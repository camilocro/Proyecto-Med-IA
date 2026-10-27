import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedMedicos } from "./seed.medicos";

const prisma = new PrismaClient();

const ESPECIALIDADES = [
  {
    nombre: "Medicina General",
    descripcion: "Atención primaria y consultas generales",
  },
  { nombre: "Neurología", descripcion: "Enfermedades del sistema nervioso" },
  {
    nombre: "Cardiología",
    descripcion: "Enfermedades del corazón y sistema cardiovascular",
  },
  {
    nombre: "Gastroenterología",
    descripcion: "Enfermedades del sistema digestivo",
  },
  {
    nombre: "Traumatología",
    descripcion: "Lesiones del sistema musculoesquelético",
  },
  { nombre: "Dermatología", descripcion: "Enfermedades de la piel" },
  {
    nombre: "Pediatría",
    descripcion: "Atención médica para niños y adolescentes",
  },
  { nombre: "Oftalmología", descripcion: "Enfermedades de los ojos" },
  { nombre: "Otorrinolaringología", descripcion: "Oídos, nariz y garganta" },
  { nombre: "Psiquiatría", descripcion: "Salud mental" },
];

async function seedEspecialidades() {
  for (const especialidad of ESPECIALIDADES) {
    await prisma.especialidad.upsert({
      where: { nombre: especialidad.nombre },
      update: {},
      create: especialidad,
    });
  }
  console.log(`✓ ${ESPECIALIDADES.length} especialidades`);
}

async function seedCentroSalud() {
  await prisma.centroSalud.upsert({
    where: { id_centro_salud: 1 },
    update: {},
    create: {
      nombre: "Centro Médico Med-IA",
      direccion: "Av. Heroínas 123",
      zona: "Zona Central",
      telefono: "+591 4 4123456",
    },
  });
  console.log("✓ Centro de salud");
}

async function seedAdministrador() {
  const passwordHash = await bcrypt.hash("Admin123!", 12);

  await prisma.usuario.upsert({
    where: { correo: "admin@med-ia.bo" },
    update: {},
    create: {
      nombre: "Administrador Med-IA",
      correo: "admin@med-ia.bo",
      password_hash: passwordHash,
      rol: "administrador",
      activo: true,
      verificado: true,
    },
  });
  console.log("✓ Admin: admin@med-ia.bo / Admin123!");
}

async function seedConfiguracion() {
  await prisma.configuracionSistema.upsert({
    where: { clave: "limite_consultas_diarias" },
    update: {},
    create: { clave: "limite_consultas_diarias", valor: "5" },
  });
  console.log("✓ Configuración del sistema");
}

async function main() {
  console.log("Ejecutando seed...\n");
  await seedEspecialidades();
  await seedCentroSalud();
  await seedMedicos(prisma);
  await seedAdministrador();
  await seedConfiguracion();
  console.log("\nSeed completado.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
