import { NivelUrgencia } from "@prisma/client";
import prisma from "../../config/prisma";
import { enviarCorreo } from "../../shared/correo";
import { plantillaCorreo } from "../../shared/plantillaCorreo";

const TEXTO_URGENCIA: Record<NivelUrgencia, string> = {
  bajo: "Baja: puedes programar una cita sin apuro",
  medio: "Media: consulta en los próximos 2 a 3 días",
  alto: "Alta: busca atención médica hoy",
  emergencia: "Emergencia: acude a un servicio de urgencias ahora",
};

const AVISO_NO_DIAGNOSTICO =
  "Esta es una orientación, no un diagnóstico médico. Si tus síntomas empeoran, acude a un servicio de urgencias.";

/**
 * HU-070: envía al paciente registrado el resumen de su consulta completada.
 *
 * Devuelve:
 *   true  → el correo se envió (o se imprimió en modo desarrollo)
 *   false → falló el envío: el frontend muestra "Podés ver tu resultado en el historial" (CA-2)
 *   null  → no corresponde enviar: anónimo, desactivó los correos (CA-4) o la consulta no está completada
 *
 * Nunca lanza error: un problema con el correo no debe romper la confirmación de la consulta.
 * No incluye los síntomas: solo especialidad, urgencia, médicos y el aviso de no diagnóstico (CA-3).
 */
export async function notificarConsultaCompletada(
  idConsulta: number,
): Promise<boolean | null> {
  try {
    const consulta = await prisma.consulta.findUnique({
      where: { id_consulta: idConsulta },
      select: {
        id_consulta: true,
        estado: true,
        fecha_consulta: true,
        nivel_urgencia: true,
        especialidad_sugerida: { select: { nombre: true } },
        paciente: {
          select: {
            usuario: {
              select: {
                id_usuario: true,
                nombre: true,
                correo: true,
                activo: true,
                recibir_correos: true,
              },
            },
          },
        },
        medicos_sugeridos: {
          orderBy: { orden_sugerencia: "asc" },
          select: {
            medico: {
              select: {
                telefono_contacto: true,
                usuario: { select: { nombre: true } },
                centro_salud: { select: { nombre: true } },
              },
            },
          },
        },
      },
    });

    const usuario = consulta?.paciente?.usuario;
    if (!consulta || consulta.estado !== "completada") return null;
    if (!usuario || !usuario.activo || !usuario.recibir_correos) return null;

    const fecha = consulta.fecha_consulta.toLocaleDateString("es-BO", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "America/La_Paz",
    });

    const medicos = consulta.medicos_sugeridos.map(
      ({ medico }) =>
        `${medico.usuario.nombre} — ${medico.centro_salud.nombre} (Tel. ${medico.telefono_contacto})`,
    );

    const html = plantillaCorreo({
      titulo: "Resultado de tu consulta",
      saludo: `Hola, ${usuario.nombre}:`,
      parrafos: [
        `Este es el resumen de tu consulta del ${fecha} en Med-IA.`,
        ...(medicos.length === 0
          ? [
              "Por ahora no hay médicos disponibles de esta especialidad en el sistema. Puedes acudir a cualquier centro de salud.",
            ]
          : []),
      ],
      detalles: [
        {
          etiqueta: "Especialidad sugerida",
          valor: consulta.especialidad_sugerida?.nombre ?? "Medicina General",
        },
        {
          etiqueta: "Urgencia",
          valor: consulta.nivel_urgencia
            ? TEXTO_URGENCIA[consulta.nivel_urgencia]
            : "No indicada",
        },
      ],
      lista: { titulo: "Médicos recomendados", items: medicos },
      boton: {
        texto: "Ver en mi historial",
        url: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/historial`,
      },
      aviso: AVISO_NO_DIAGNOSTICO,
      nota: 'Recibes este correo porque tienes activado "Recibir correos de mis consultas". Puedes desactivarlo en tu perfil.',
    });

    return await enviarCorreo({
      para: usuario.correo,
      asunto: "Med-IA: resultado de tu consulta",
      html,
      tipo: "resumen_consulta",
      idUsuario: usuario.id_usuario,
      idConsulta: consulta.id_consulta,
    });
  } catch (error) {
    console.error(
      `[Notificación] No se pudo notificar la consulta ${idConsulta}:`,
      (error as Error).message,
    );
    return false;
  }
}
