import nodemailer, { Transporter } from "nodemailer";
import prisma from "../config/prisma";

export type TipoNotificacion =
  | "verificacion_correo"
  | "recuperacion_password"
  | "codigo_2fa"
  | "aviso_seguridad"
  | "credenciales_medico"
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

/**
 * Cómo salen los correos, según las variables del .env:
 * - "brevo":   BREVO_API_KEY → API HTTPS de Brevo. Es la de producción: Render y Railway
 *              bloquean SMTP en sus planes gratis, pero no HTTPS.
 * - "smtp":    SMTP_USER → Gmail con nodemailer (sirve en local).
 * - "consola": ninguna → imprime el correo en la consola (modo desarrollo).
 */
type ModoCorreo = "brevo" | "smtp" | "consola";

const URL_API_BREVO = "https://api.brevo.com/v3/smtp/email";
const PUERTO_SMTP_SEGURO = 465;
const TIMEOUT_ENVIO_MS = 15_000;
const NOMBRE_REMITENTE_POR_DEFECTO = "Med-IA";

let transporter: Transporter | null = null;

function modoCorreo(): ModoCorreo {
  if (process.env.BREVO_API_KEY?.trim()) return "brevo";
  if (process.env.SMTP_USER?.trim()) return "smtp";
  return "consola";
}

/** Separa CORREO_REMITENTE ("Med-IA <correo@gmail.com>") en nombre y correo. */
function remitente(): { name: string; email: string } {
  const texto = (
    process.env.CORREO_REMITENTE ||
    process.env.SMTP_USER ||
    ""
  ).trim();
  const conNombre = texto.match(/^"?([^"<]*?)"?\s*<([^>]+)>$/);
  if (conNombre) {
    return {
      name: conNombre[1].trim() || NOMBRE_REMITENTE_POR_DEFECTO,
      email: conNombre[2].trim(),
    };
  }
  return { name: NOMBRE_REMITENTE_POR_DEFECTO, email: texto };
}

function obtenerTransporter(): Transporter {
  if (!transporter) {
    const puerto = Number(process.env.SMTP_PORT ?? PUERTO_SMTP_SEGURO);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: puerto,
      secure: puerto === PUERTO_SMTP_SEGURO,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: TIMEOUT_ENVIO_MS,
      greetingTimeout: TIMEOUT_ENVIO_MS,
      socketTimeout: TIMEOUT_ENVIO_MS,
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
      "──────── 📧 Correo (modo desarrollo: sin BREVO_API_KEY ni SMTP_USER) ────────",
      `Para:   ${datos.para}`,
      `Asunto: ${datos.asunto}`,
      "",
      htmlATexto(datos.html),
      ...(enlaces.length
        ? ["", "Enlaces:", ...enlaces.map((e) => `  ${e}`)]
        : []),
      "──────────────────────────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

/** Envío por la API HTTPS de Brevo. Lanza error si Brevo no acepta el correo. */
async function enviarPorBrevo(datos: DatosCorreo): Promise<void> {
  const respuesta = await fetch(URL_API_BREVO, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY!.trim(),
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: remitente(),
      to: [{ email: datos.para }],
      subject: datos.asunto,
      htmlContent: datos.html,
      textContent: htmlATexto(datos.html),
    }),
    signal: AbortSignal.timeout(TIMEOUT_ENVIO_MS),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(
      `Brevo respondió ${respuesta.status}: ${detalle.slice(0, 300)}`,
    );
  }
}

/** Envío por SMTP (Gmail) con nodemailer. */
async function enviarPorSmtp(datos: DatosCorreo): Promise<void> {
  const { name, email } = remitente();
  await obtenerTransporter().sendMail({
    from: { name, address: email },
    to: datos.para,
    subject: datos.asunto,
    html: datos.html,
    text: htmlATexto(datos.html),
  });
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
  const modo = modoCorreo();

  if (modo === "consola") {
    imprimirEnConsola(datos);
    await registrar(datos, false); // no salió de verdad: queda registrado como no enviado
    return true;
  }

  try {
    if (modo === "brevo") await enviarPorBrevo(datos);
    else await enviarPorSmtp(datos);
    await registrar(datos, true);
    return true;
  } catch (error) {
    console.error(
      `[Correo] Falló el envío (${modo}) a ${datos.para}:`,
      (error as Error).message,
    );
    await registrar(datos, false);
    return false;
  }
}
