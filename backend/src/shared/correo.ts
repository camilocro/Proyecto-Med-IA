import nodemailer, { Transporter } from "nodemailer";
import prisma from "../config/prisma";

export type TipoNotificacion =
  | "verificacion_correo"
  | "recuperacion_password"
  | "codigo_2fa"
  | "resumen_consulta"
  | "prueba";

export interface DatosCorreo {
  para: string;
  asunto: string;
  html: string;
  tipo: TipoNotificacion;
  idUsuario?: number;
  idConsulta?: number;
}

const PUERTO_SMTP_SEGURO = 465;
const TIMEOUT_SMTP_MS = 15_000;

let transporter: Transporter | null = null;

/** Sin SMTP_USER el sistema funciona igual: imprime los correos en la consola (modo desarrollo). */
function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_USER?.trim());
}

function obtenerTransporter(): Transporter {
  if (!transporter) {
    const puerto = Number(process.env.SMTP_PORT ?? PUERTO_SMTP_SEGURO);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: puerto,
      secure: puerto === PUERTO_SMTP_SEGURO,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: TIMEOUT_SMTP_MS,
      greetingTimeout: TIMEOUT_SMTP_MS,
      socketTimeout: TIMEOUT_SMTP_MS,
    });
  }
  return transporter;
}

/** Versión en texto plano del HTML: la usan los clientes de correo sin HTML y la consola. */
function htmlATexto(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((linea) => linea.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

function imprimirEnConsola(datos: DatosCorreo): void {
  const enlaces = Array.from(
    new Set(
      [...datos.html.matchAll(/href="(https?:[^"]+)"/g)].map((m) =>
        m[1].replace(/&amp;/g, "&"),
      ),
    ),
  );

  console.log(
    [
      "",
      "──────── 📧 Correo (modo desarrollo: SMTP_USER vacío) ────────",
      `Para:   ${datos.para}`,
      `Asunto: ${datos.asunto}`,
      "",
      htmlATexto(datos.html),
      ...(enlaces.length
        ? ["", "Enlaces:", ...enlaces.map((e) => `  ${e}`)]
        : []),
      "──────────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

/** Registra el envío en NotificacionEmail. Si falla el registro, el correo igual se considera enviado. */
async function registrar(datos: DatosCorreo, enviado: boolean): Promise<void> {
  try {
    await prisma.notificacionEmail.create({
      data: {
        id_usuario: datos.idUsuario,
        id_consulta: datos.idConsulta,
        tipo: datos.tipo,
        destinatario: datos.para,
        enviado,
        fecha_envio: enviado ? new Date() : null,
      },
    });
  } catch (error) {
    console.error(
      "[Correo] No se pudo registrar la notificación:",
      (error as Error).message,
    );
  }
}

/**
 * Envía un correo. NUNCA lanza error: devuelve true si se envió (o se imprimió en modo desarrollo)
 * y false si falló, para que quien lo llama decida qué mostrar sin romper su flujo.
 */
export async function enviarCorreo(datos: DatosCorreo): Promise<boolean> {
  if (!smtpConfigurado()) {
    imprimirEnConsola(datos);
    await registrar(datos, false); // no salió de verdad: queda registrado como no enviado
    return true;
  }

  try {
    await obtenerTransporter().sendMail({
      from: process.env.CORREO_REMITENTE || process.env.SMTP_USER,
      to: datos.para,
      subject: datos.asunto,
      html: datos.html,
      text: htmlATexto(datos.html),
    });
    await registrar(datos, true);
    return true;
  } catch (error) {
    console.error(
      `[Correo] Falló el envío a ${datos.para}:`,
      (error as Error).message,
    );
    await registrar(datos, false);
    return false;
  }
}
