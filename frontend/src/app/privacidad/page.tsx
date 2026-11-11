import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Política de privacidad — Med-IA",
  description: "Qué datos usa Med-IA, para qué y cómo los protege.",
};

const CORREO_CONTACTO = "pereirarosadoigor@gmail.com";
const ULTIMA_ACTUALIZACION = "10 de noviembre de 2026";

const SECCIONES: { titulo: string; parrafos: string[] }[] = [
  {
    titulo: "Qué es Med-IA",
    parrafos: [
      "Med-IA es un proyecto académico de la materia Taller de Sistemas de Información (Universidad Católica Boliviana). Orienta a qué especialidad médica acudir según los síntomas que describís. No hace diagnósticos ni reemplaza la consulta con un profesional de la salud.",
    ],
  },
  {
    titulo: "Qué datos usamos",
    parrafos: [
      "Datos de tu cuenta: nombre, correo electrónico, contraseña (guardada cifrada, nunca en texto plano) y, si la indicás, tu fecha de nacimiento.",
      "Si ingresás con Google, recibimos solo tu nombre y tu correo, que Google ya verificó. No accedemos a tus contactos, archivos ni a ningún otro dato de tu cuenta de Google.",
      "Tus consultas: la descripción de síntomas, las respuestas a las preguntas de seguimiento y el resultado (especialidad sugerida, nivel de urgencia y médicos recomendados).",
      "Datos de seguridad: fecha, hora y dirección IP de cada inicio de sesión, y registro de los correos que te enviamos.",
    ],
  },
  {
    titulo: "Para qué los usamos",
    parrafos: [
      "Para darte el servicio: analizar tus síntomas, sugerirte una especialidad y médicos, y guardar tu historial.",
      "Para enviarte correos necesarios: verificar tu cuenta, recuperar tu contraseña, códigos de verificación y, si lo tenés activado en tu perfil, el resumen de tus consultas.",
      "Para proteger tu cuenta: detectar intentos de acceso sospechosos y bloquear accesos indebidos.",
      "No vendemos ni compartimos tus datos con fines publicitarios.",
    ],
  },
  {
    titulo: "Servicios que intervienen",
    parrafos: [
      "Supabase guarda la base de datos. OpenAI procesa la descripción de tus síntomas para orientarte (sin tu nombre ni tu correo). Brevo envía los correos. Render y Vercel alojan la aplicación. Google permite el inicio de sesión con tu cuenta de Google.",
    ],
  },
  {
    titulo: "Cuánto tiempo los conservamos",
    parrafos: [
      "Mientras tu cuenta esté activa. Podés eliminar consultas de tu historial y eliminar tu cuenta desde tu perfil: en ese caso dejan de estar visibles para vos y tus datos personales se anonimizan. Por normas de seguridad y auditoría, los registros no se borran físicamente de la base de datos.",
    ],
  },
  {
    titulo: "Tus derechos",
    parrafos: [
      "Podés ver y corregir tus datos en tu perfil, desactivar los correos de resumen y eliminar tu cuenta. Para cualquier otra consulta sobre tus datos, escribinos al correo de contacto.",
    ],
  },
];

/** Política de privacidad: la exige Google para publicar el inicio de sesión con Google. */
export default function PrivacidadPage() {
  return (
    <div className="min-h-screen flex flex-col bg-light/30">
      <Navbar />
      <main className="flex-1 px-4 py-10">
        <article className="card w-full max-w-3xl mx-auto p-6 sm:p-10">
          <h1 className="text-2xl font-bold text-gray-900">
            Política de privacidad
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Última actualización: {ULTIMA_ACTUALIZACION}
          </p>

          <div className="mt-8 space-y-8">
            {SECCIONES.map((seccion) => (
              <section key={seccion.titulo}>
                <h2 className="text-lg font-semibold text-gray-800">
                  {seccion.titulo}
                </h2>
                <div className="mt-2 space-y-2">
                  {seccion.parrafos.map((parrafo) => (
                    <p
                      key={parrafo}
                      className="text-sm leading-relaxed text-gray-600"
                    >
                      {parrafo}
                    </p>
                  ))}
                </div>
              </section>
            ))}

            <section>
              <h2 className="text-lg font-semibold text-gray-800">Contacto</h2>
              <p className="mt-2 text-sm text-gray-600">
                <a
                  href={`mailto:${CORREO_CONTACTO}`}
                  className="text-primary hover:underline break-all"
                >
                  {CORREO_CONTACTO}
                </a>
              </p>
            </section>
          </div>

          <Link
            href="/"
            className="inline-block mt-10 text-sm text-primary hover:underline"
          >
            ← Volver al inicio
          </Link>
        </article>
      </main>
      <Footer />
    </div>
  );
}
