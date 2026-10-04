import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ResultadoAnalisisIA {
  suficienteInformacion: boolean
  preguntasSeguimiento?: string[]
  sintomas?: {
    descripcion:       string
    zona_cuerpo:       string
    duracion_estimada: string
    relevancia:        number
  }[]
  especialidad?:     string
  nivelUrgencia?:    'bajo' | 'medio' | 'alto' | 'emergencia'
  tipoDerivacion?:   'medicina_general' | 'especialista' | 'emergencia'
  motivoDerivacion?: string
}

const SYSTEM_PROMPT = `Eres el módulo de análisis clínico de Med-IA, sistema de triage de Bolivia.
Analizas síntomas descritos en lenguaje natural y orientas al paciente hacia el especialista correcto.
NUNCA emitas diagnósticos médicos. Solo orientas y derivas.
Responde SIEMPRE en JSON válido con la estructura exacta indicada.
Si la información es insuficiente, genera entre 1 y 5 preguntas de seguimiento específicas.`

interface HistorialRonda {
  pregunta:  string
  respuesta: string
}

export async function analizarSintomas(
  descripcion: string,
  historial?:  HistorialRonda[],
): Promise<ResultadoAnalisisIA> {
  const contexto = historial?.length
    ? '\nRespuestas previas:\n' + historial.map((r) => `P: ${r.pregunta}\nR: ${r.respuesta}`).join('\n')
    : ''

  const completion = await openai.chat.completions.create({
    model:           'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Síntomas del paciente: ${descripcion}${contexto}

Responde con este JSON exacto:
{
  "suficienteInformacion": boolean,
  "preguntasSeguimiento": ["..."] (solo si suficienteInformacion es false, max 5),
  "sintomas": [{ "descripcion": "", "zona_cuerpo": "", "duracion_estimada": "", "relevancia": 1-10 }],
  "especialidad": "nombre" (solo si suficienteInformacion es true),
  "nivelUrgencia": "bajo|medio|alto|emergencia" (solo si suficienteInformacion es true),
  "tipoDerivacion": "medicina_general|especialista|emergencia",
  "motivoDerivacion": "explicación breve en español simple"
}`,
      },
    ],
  })

  const contenido = completion.choices[0].message.content ?? '{}'
  return JSON.parse(contenido) as ResultadoAnalisisIA
}
