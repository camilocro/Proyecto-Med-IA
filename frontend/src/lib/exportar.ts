// Exportación a CSV y PDF desde el navegador (HU-050, HU-064, HU-068).
// Los datos ya llegan filtrados desde la pantalla: lo que se ve es lo que se exporta.

export type Celda = string | number | null | undefined

type ColorRGB = [number, number, number]

// Mismos colores del sistema (tailwind.config: primary y accent)
const AZUL:    ColorRGB = [27, 79, 114]
const ACENTO:  ColorRGB = [46, 134, 193]
const CELESTE: ColorRGB = [234, 244, 251]
const MARGEN = 14 // mm

/** 'AAAA-MM-DD' de hoy, para el nombre del archivo */
export function fechaParaArchivo(fecha = new Date()): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

/** Fecha y hora legibles para los reportes: "07/11/2026, 15:30" */
export function fechaHoraLegible(iso: string): string {
  return new Date(iso).toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function descargarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  // Se libera después del clic: algunos navegadores todavía están leyendo el blob
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// ── CSV ───────────────────────────────────────────────────────────────────────

function celdaCSV(valor: Celda): string {
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'number') return String(valor)
  // Un texto que empieza con =, +, - o @ Excel lo ejecuta como fórmula: se neutraliza
  const texto = /^[=+\-@]/.test(valor) ? `'${valor}` : valor
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/**
 * CSV con BOM UTF-8 y separador ";": así Excel en español abre bien las tildes
 * y cada dato queda en su columna (HU-050 CA-2).
 */
export function descargarCSV(nombreArchivo: string, columnas: string[], filas: Celda[][]) {
  const lineas = [columnas, ...filas].map((fila) => fila.map(celdaCSV).join(';'))
  const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  descargarArchivo(blob, nombreArchivo)
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export interface TablaPDF {
  columnas: string[]
  filas:    Celda[][]
}

export interface OpcionesPDF extends TablaPDF {
  nombreArchivo: string
  titulo:        string
  detalles?:     string[]        // período, filtros aplicados, etc.
  mensajeVacio:  string          // se escribe en el archivo si no hay filas (HU-068 CA-3)
  totales?:      TablaPDF & { titulo: string } // HU-068 CA-2
  horizontal?:   boolean
}

/** Encabezado, tabla con estilo del sistema, totales opcionales y "Página X de Y" */
export async function descargarPDF(opciones: OpcionesPDF): Promise<void> {
  // Se cargan recién al exportar, así no pesan en la carga inicial de la página
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: opciones.horizontal ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const alto  = doc.internal.pageSize.getHeight()

  // Encabezado
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, ancho, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('MED-IA', MARGEN, 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(opciones.titulo, MARGEN, 17)

  let y = 30
  doc.setTextColor(90, 90, 90)
  doc.setFontSize(9)
  for (const linea of [...(opciones.detalles ?? []), `Generado el ${fechaHoraLegible(new Date().toISOString())}`]) {
    doc.text(linea, MARGEN, y)
    y += 5
  }
  y += 2

  if (opciones.filas.length === 0) {
    doc.setFontSize(11)
    doc.setTextColor(60, 60, 60)
    doc.text(doc.splitTextToSize(opciones.mensajeVacio, ancho - MARGEN * 2), MARGEN, y + 4)
  } else {
    autoTable(doc, {
      startY: y,
      head: [opciones.columnas],
      body: opciones.filas.map((fila) => fila.map((celda) => celda ?? '—')),
      margin: { left: MARGEN, right: MARGEN },
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: AZUL, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: CELESTE },
    })

    if (opciones.totales) {
      const finalTabla = posicionFinal(doc, y)
      doc.setFontSize(10)
      doc.setTextColor(...AZUL)
      doc.text(opciones.totales.titulo, MARGEN, finalTabla + 9)
      autoTable(doc, {
        startY: finalTabla + 12,
        head: [opciones.totales.columnas],
        body: opciones.totales.filas.map((fila) => fila.map((celda) => celda ?? '—')),
        margin: { left: MARGEN, right: MARGEN },
        tableWidth: 100,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: ACENTO, textColor: 255, fontStyle: 'bold' },
      })
    }
  }

  // Pie en todas las páginas
  const paginas = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Med-IA · Página ${pagina} de ${paginas}`, ancho / 2, alto - 8, { align: 'center' })
  }

  doc.save(opciones.nombreArchivo)
}

/** jspdf-autotable deja la posición final de la última tabla en `lastAutoTable` */
function posicionFinal(doc: object, porDefecto: number): number {
  return (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? porDefecto
}
