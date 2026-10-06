import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'Med-IA — Recepcionista Clínico Digital',
  description: 'Sistema de triage médico preliminar con IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col bg-[#F8FBFF]">
        {children}
      </body>
    </html>
  )
}