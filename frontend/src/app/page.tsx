import Link     from 'next/link'
import Navbar   from '@/components/layout/Navbar'
import Footer   from '@/components/layout/Footer'
import { Stethoscope, ClipboardList, UserCheck } from 'lucide-react'

const CARACTERISTICAS = [
  {
    icono: Stethoscope,
    titulo: 'Triage Inteligente',
    descripcion: 'La IA analiza tus síntomas y hace preguntas específicas para orientarte mejor.',
  },
  {
    icono: UserCheck,
    titulo: 'Médicos Sugeridos',
    descripcion: 'Te mostramos profesionales disponibles según la especialidad que necesitás.',
  },
  {
    icono: ClipboardList,
    titulo: 'Historial Clínico',
    descripcion: 'Guardamos tus consultas anteriores para darte orientaciones más personalizadas.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FBFF]">
      <Navbar />

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-bold text-[#1B4F72] mb-4">Med-IA</h1>
          <p className="text-xl text-[#2E86C1] font-medium mb-3">
            Tu recepcionista clínico digital con Inteligencia Artificial
          </p>
          <p className="text-gray-500 max-w-lg mx-auto mb-10">
            Describí tus síntomas y te orientamos hacia el especialista correcto.
            Sin filas, sin confusión, sin diagnósticos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/consulta"
              className="bg-[#1B4F72] text-white font-semibold px-8 py-3.5 rounded-xl
                         hover:bg-[#2E86C1] transition-colors w-full sm:w-auto text-center"
            >
              Iniciar Consulta
            </Link>
            <Link
              href="/registro"
              className="border-2 border-[#1B4F72] text-[#1B4F72] font-semibold px-8 py-3.5 rounded-xl
                         hover:bg-[#D6EAF8] transition-colors w-full sm:w-auto text-center"
            >
              Registrarse
            </Link>
          </div>
          <p className="mt-6 text-xs text-gray-400">
            Med-IA no emite diagnósticos médicos. Es una orientación preliminar para ayudarte a encontrar al especialista correcto.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-4 pb-20">
          <div className="grid gap-6 sm:grid-cols-3">
            {CARACTERISTICAS.map(({ icono: Icono, titulo, descripcion }) => (
              <div
                key={titulo}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-[#D6EAF8] rounded-xl flex items-center justify-center mb-4">
                  <Icono className="w-6 h-6 text-[#1B4F72]" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{titulo}</h3>
                <p className="text-sm text-gray-500">{descripcion}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}