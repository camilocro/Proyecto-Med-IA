import "dotenv/config";
import prisma from "../config/prisma";
import {
  analizarSintomas,
  ErrorIA,
  EntradaAnalisis,
} from "../modules/consulta/ia.service";

type Caso = { nombre: string } & Omit<EntradaAnalisis, "especialidades">;

const CASOS: Caso[] = [
  {
    nombre: "Vago → debería pedir preguntas",
    descripcion: "Me duele la cabeza",
    rondas: [],
  },
  {
    nombre: "Con ronda respondida → debería dar veredicto",
    descripcion: "Me duele la cabeza",
    rondas: [
      {
        numero: 1,
        preguntas: [
          {
            pregunta: "¿Hace cuánto empezó?",
            respuesta: "Hace 3 semanas, casi todos los días",
          },
          {
            pregunta: "¿Tienes otros síntomas?",
            respuesta: "A veces veo borroso y me molesta la luz",
          },
        ],
      },
    ],
  },
  {
    nombre: "Señal de alarma → debería ser emergencia sin preguntas",
    descripcion:
      "Tengo un dolor muy fuerte en el pecho que se va al brazo izquierdo y me cuesta respirar",
    rondas: [],
  },
  {
    nombre: "Caso complejo → casoComplejo: true",
    descripcion: "Me duele todo y a la vez nada [complejo]",
    rondas: [],
  },
  {
    nombre: "Sin fin → sigue pidiendo preguntas aunque haya rondas",
    descripcion: "Me siento raro [sin_fin]",
    rondas: [
      {
        numero: 1,
        preguntas: [{ pregunta: "¿Desde cuándo?", respuesta: "Ayer" }],
      },
    ],
  },
];

async function main() {
  const especialidades = (
    await prisma.especialidad.findMany({
      where: { activo: true },
      select: { nombre: true },
    })
  ).map((e) => e.nombre);

  console.log("Especialidades enviadas a la IA:", especialidades);

  for (const caso of CASOS) {
    console.log(`\n=== ${caso.nombre} ===`);
    try {
      const resultado = await analizarSintomas({ ...caso, especialidades });
      console.log(JSON.stringify(resultado, null, 2));
    } catch (error) {
      if (error instanceof ErrorIA)
        console.error(`ErrorIA [${error.tipo}]: ${error.message}`);
      else throw error;
    }
  }
}

main().finally(() => prisma.$disconnect());
