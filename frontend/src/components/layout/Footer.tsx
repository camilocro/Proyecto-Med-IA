import { Shield } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-primary text-white/70 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center sm:text-left">
          <Shield className="w-4 h-4" />
          <span className="font-semibold text-white whitespace-nowrap">MED-IA</span>
          <span>© 2025 MED-IA. Todos los derechos reservados.</span>
        </div>
        <span className="text-center sm:text-left">Orientación preliminar · No reemplaza la consulta médica.</span>
      </div>
    </footer>
  )
}
