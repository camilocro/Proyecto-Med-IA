import { MessageSquare } from 'lucide-react'

// El backend guarda el resumen como texto: una frase tras otra separadas por "; "
const SEPARADOR_RESUMEN = '; '

/** HU-055: lo que la IA entendió de los síntomas, en lenguaje simple */
export default function ResumenEntendido({ resumen }: { resumen?: string | null }) {
  if (!resumen) return null
  const frases = resumen.split(SEPARADOR_RESUMEN).filter(Boolean)

  return (
    <div className="bg-primary-100/60 border border-primary/10 rounded-xl p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
        <MessageSquare className="w-4 h-4" />
        Entendí que tienes:
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {frases.map((frase) => (
          <li key={frase} className="text-xs bg-white text-gray-700 border border-primary/10 px-2.5 py-1 rounded-full">
            {frase}
          </li>
        ))}
      </ul>
    </div>
  )
}
