import { Shield } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#1B4F72] text-white/70 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span className="font-semibold text-white">MED-IA</span>
          <span>© 2025 MED-IA. Todos los derechos reservados.</span>
        </div>
        <span>Orientación preliminar · No reemplaza la consulta médica.</span>
      </div>
    </footer>
  )
}
