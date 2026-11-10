const COLOR = {
  primario: "#1B4F72",
  acento: "#2E86C1",
  fondo: "#F8FBFF",
  claro: "#D6EAF8",
  texto: "#1a1a1a",
  gris: "#6b7280",
  borde: "#e5e7eb",
  avisoFondo: "#FEF3C7",
  avisoTexto: "#92400E",
} as const;

export interface OpcionesPlantilla {
  titulo: string;
  saludo?: string;
  parrafos: string[];
  detalles?: { etiqueta: string; valor: string }[]; // tabla de datos (ej.: especialidad, urgencia)
  lista?: { titulo: string; items: string[] }; // ej.: médicos recomendados
  codigo?: string; // código grande (2FA)
  boton?: { texto: string; url: string };
  aviso?: string; // recuadro amarillo (ej.: "no es un diagnóstico")
  nota?: string; // texto chico al final (ej.: "si no fuiste tú…")
}

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Solo se aceptan enlaces http(s): evita enlaces "javascript:" en un correo */
function urlSegura(url: string): string {
  return /^https?:\/\//i.test(url) ? escaparHtml(url) : "#";
}

function bloqueDetalles(
  detalles: NonNullable<OpcionesPlantilla["detalles"]>,
): string {
  const filas = detalles
    .map(
      (d) => `
        <tr>
          <td style="padding:8px 12px;color:${COLOR.gris};font-size:14px;border-bottom:1px solid ${COLOR.borde};width:40%;">${escaparHtml(d.etiqueta)}</td>
          <td style="padding:8px 12px;color:${COLOR.texto};font-size:14px;font-weight:600;border-bottom:1px solid ${COLOR.borde};">${escaparHtml(d.valor)}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR.borde};border-radius:8px;margin:16px 0;border-collapse:separate;">${filas}</table>`;
}

function bloqueLista(lista: NonNullable<OpcionesPlantilla["lista"]>): string {
  const items = lista.items
    .map(
      (item) =>
        `<li style="margin:4px 0;color:${COLOR.texto};font-size:14px;">${escaparHtml(item)}</li>`,
    )
    .join("");
  return `
    <p style="margin:16px 0 4px;color:${COLOR.primario};font-size:14px;font-weight:600;">${escaparHtml(lista.titulo)}</p>
    <ul style="margin:0;padding-left:20px;">${items}</ul>`;
}

export function plantillaCorreo(op: OpcionesPlantilla): string {
  const parrafos = op.parrafos
    .map(
      (p) =>
        `<p style="margin:0 0 12px;color:${COLOR.texto};font-size:15px;line-height:1.5;">${escaparHtml(p)}</p>`,
    )
    .join("");

  const codigo = op.codigo
    ? `<p style="margin:20px 0;text-align:center;">
         <span style="display:inline-block;padding:12px 24px;background:${COLOR.claro};color:${COLOR.primario};font-size:28px;font-weight:700;letter-spacing:6px;border-radius:8px;font-family:monospace;">${escaparHtml(op.codigo)}</span>
       </p>`
    : "";

  const boton = op.boton
    ? `<p style="margin:24px 0;text-align:center;">
         <a href="${urlSegura(op.boton.url)}" style="display:inline-block;padding:12px 28px;background:${COLOR.primario};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">${escaparHtml(op.boton.texto)}</a>
       </p>
       <p style="margin:0 0 12px;color:${COLOR.gris};font-size:12px;line-height:1.5;">Si el botón no funciona, copia este enlace en tu navegador:<br>
         <a href="${urlSegura(op.boton.url)}" style="color:${COLOR.acento};word-break:break-all;">${escaparHtml(op.boton.url)}</a>
       </p>`
    : "";

  const aviso = op.aviso
    ? `<p style="margin:16px 0;padding:12px;background:${COLOR.avisoFondo};color:${COLOR.avisoTexto};font-size:13px;border-radius:8px;line-height:1.5;">${escaparHtml(op.aviso)}</p>`
    : "";

  const nota = op.nota
    ? `<p style="margin:16px 0 0;color:${COLOR.gris};font-size:12px;line-height:1.5;">${escaparHtml(op.nota)}</p>`
    : "";

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:${COLOR.fondo};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.fondo};padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${COLOR.borde};">
          <tr><td style="background:${COLOR.primario};padding:20px 24px;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Med-IA</p>
            <p style="margin:4px 0 0;color:${COLOR.claro};font-size:13px;">Tu orientación médica digital</p>
          </td></tr>
          <tr><td style="padding:24px;">
            <h1 style="margin:0 0 16px;color:${COLOR.primario};font-size:20px;">${escaparHtml(op.titulo)}</h1>
            ${op.saludo ? `<p style="margin:0 0 12px;color:${COLOR.texto};font-size:15px;">${escaparHtml(op.saludo)}</p>` : ""}
            ${parrafos}
            ${op.detalles?.length ? bloqueDetalles(op.detalles) : ""}
            ${op.lista?.items.length ? bloqueLista(op.lista) : ""}
            ${codigo}
            ${boton}
            ${aviso}
            ${nota}
          </td></tr>
          <tr><td style="padding:16px 24px;background:${COLOR.fondo};border-top:1px solid ${COLOR.borde};">
            <p style="margin:0;color:${COLOR.gris};font-size:11px;text-align:center;">Med-IA · Universidad Católica Boliviana · Este es un correo automático, no lo respondas.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
