"use client";

import { useState, useEffect, useCallback } from "react";
import { Consulta, RondaPreguntas } from "@/types";
import { triageService, ContadorConsultas } from "@/services/triage.service";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SintomasForm from "@/components/triage/SintomasForm";
import PreguntasIA from "@/components/triage/PreguntasIA";
import ConfirmarConsulta from "@/components/triage/ConfirmarConsulta";
import ResultadoTriage from "@/components/triage/ResultadoTriage";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { mensajeDeError } from "@/lib/errores";
import CancelarConsulta from "@/components/triage/CancelarConsulta";
import ReiniciarConsulta from "@/components/triage/ReiniciarConsulta";

// ─── Tipos locales ─────────────────────────────────────────────────────────────

type EtapaConsulta = "sintomas" | "preguntas" | "confirmacion" | "resultado";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function obtenerRondaActiva(consulta: Consulta): RondaPreguntas | null {
  if (!consulta.rondas?.length) return null;
  return consulta.rondas[consulta.rondas.length - 1];
}

function determinarEtapa(consulta: Consulta): EtapaConsulta {
  if (consulta.estado === "completada") return "resultado";
  if (consulta.estado === "esperando_confirmacion") return "confirmacion";
  if (consulta.estado === "esperando_respuestas") return "preguntas";
  return "sintomas";
}

const TITULOS: Record<EtapaConsulta, string> = {
  sintomas: "¿Cómo te sentís hoy?",
  preguntas: "Un par de preguntas más",
  confirmacion: "Revisá lo que entendimos",
  resultado: "Resultado de tu consulta",
};

const SUBTITULOS: Record<EtapaConsulta, string> = {
  sintomas:
    "Describí tus síntomas en lenguaje natural, sin necesidad de términos médicos.",
  preguntas: "Necesitamos un poco más de información para orientarte mejor.",
  confirmacion:
    "Confirmá que esté todo bien antes de ver el resultado. Podés corregir cualquier respuesta.",
  resultado: "Basándonos en lo que describiste, esto es lo que encontramos.",
};

const PASOS: EtapaConsulta[] = ["sintomas", "preguntas", "confirmacion", "resultado"];

// ─── Componente principal ──────────────────────────────────────────────────────

export default function ConsultaPage() {
  const [etapa, setEtapa] = useState<EtapaConsulta>("sintomas");
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contador, setContador] = useState<ContadorConsultas | null>(null);
  // HU-052: el paciente vuelve a describir sus síntomas sobre la misma consulta
  const [reiniciando, setReiniciando] = useState(false);

  // El backend es la fuente del contador: se pide al entrar y después de cada consulta
  const cargarContador = useCallback(() => {
    triageService
      .obtenerRestantes()
      .then(setContador)
      .catch(() => setContador(null));
  }, []);

  useEffect(() => {
    cargarContador();
  }, [cargarContador]);

  function mostrar(actualizada: Consulta) {
    setConsulta(actualizada);
    setEtapa(determinarEtapa(actualizada));
  }

  /**
   * Ejecuta una acción del triage con su estado de carga y de error.
   * Devuelve la consulta actualizada, o null si falló.
   */
  async function ejecutar(
    accion: () => Promise<Consulta>,
    porDefecto: string,
  ): Promise<Consulta | null> {
    setCargando(true);
    setError(null);
    const resultado = await accion()
      .catch((err) => {
        setError(mensajeDeError(err, porDefecto));
        return null;
      })
      .finally(() => setCargando(false));
    if (resultado) mostrar(resultado);
    return resultado;
  }

  async function handleIniciarConsulta(descripcion: string) {
    await ejecutar(
      () => triageService.iniciarConsulta(descripcion),
      "Error al iniciar la consulta. Intentá de nuevo.",
    );
    cargarContador(); // también si falló: un 429 actualiza el aviso de límite
  }

  async function handleResponderRonda(
    respuestas: { id_pr: number; respuesta: string }[],
  ) {
    const rondaActiva = consulta && obtenerRondaActiva(consulta);
    if (!consulta || !rondaActiva) return;
    await ejecutar(
      () =>
        triageService.responderRonda(
          consulta.id_consulta,
          rondaActiva.id_ronda,
          respuestas,
        ),
      "Error al enviar las respuestas. Intentá de nuevo.",
    );
  }

  async function handleEditarRespuesta(idPr: number, respuesta: string) {
    if (!consulta) return false;
    const resultado = await ejecutar(
      () => triageService.editarRespuesta(consulta.id_consulta, idPr, respuesta),
      "No se pudo corregir la respuesta. Intentá de nuevo.",
    );
    return resultado !== null;
  }

  async function handleConfirmar() {
    if (!consulta) return;
    await ejecutar(
      () => triageService.confirmarConsulta(consulta.id_consulta),
      "No se pudo confirmar la consulta. Intentá de nuevo.",
    );
  }

  async function handleReiniciar(descripcion: string) {
    if (!consulta) return;
    const resultado = await ejecutar(
      () => triageService.reiniciarConsulta(consulta.id_consulta, descripcion),
      "No se pudo reiniciar la consulta. Intentá de nuevo.",
    );
    if (resultado) setReiniciando(false);
  }

  function handleNuevaConsulta() {
    setEtapa("sintomas");
    setConsulta(null);
    setReiniciando(false);
    setError(null);
    cargarContador();
  }

  async function handleCancelarConsulta() {
    if (!consulta) return;
    setError(null);

    const cancelada = await triageService
      .cancelarConsulta(consulta.id_consulta)
      .then(() => true)
      .catch((err) => {
        setError(
          mensajeDeError(err, "No se pudo cancelar la consulta. Intentá de nuevo."),
        );
        return false;
      });

    if (cancelada) handleNuevaConsulta(); // vuelve al inicio y recarga el contador
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const indiceActual = PASOS.indexOf(reiniciando ? "sintomas" : etapa);
  const rondaActiva = consulta && obtenerRondaActiva(consulta);

  const acciones = (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
      <ReiniciarConsulta
        onConfirmar={() => {
          setError(null);
          setReiniciando(true);
        }}
        deshabilitado={cargando}
      />
      <CancelarConsulta onConfirmar={handleCancelarConsulta} deshabilitado={cargando} />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-10">
          {/* Indicador de progreso */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {PASOS.map((paso, index) => (
              <div key={paso} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    index < indiceActual
                      ? "bg-green-500 text-white"
                      : index === indiceActual
                        ? "bg-primary text-white"
                        : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {index < indiceActual ? "✓" : index + 1}
                </div>
                {index < PASOS.length - 1 && (
                  <div
                    className={`w-6 sm:w-12 h-0.5 ${index < indiceActual ? "bg-green-500" : "bg-gray-200"}`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Encabezado */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-primary">
              {reiniciando ? "Empecemos de nuevo" : TITULOS[etapa]}
            </h1>
            <p className="text-gray-500 mt-2">
              {reiniciando
                ? "Describí otra vez tus síntomas. No se descuenta otra consulta."
                : SUBTITULOS[etapa]}
            </p>
          </div>

          {/* Error global */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Contenido según etapa */}
          <div className="card p-6">
            {reiniciando ? (
              <div className="space-y-4">
                {/* CA-4: el campo aparece vacío; sin contador porque no gasta otra consulta */}
                <SintomasForm onSubmit={handleReiniciar} cargando={cargando} contador={null} />
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setReiniciando(false);
                      setError(null);
                    }}
                    disabled={cargando}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver a la consulta
                  </button>
                </div>
              </div>
            ) : (
              <>
                {etapa === "sintomas" && (
                  <SintomasForm
                    onSubmit={handleIniciarConsulta}
                    cargando={cargando}
                    contador={contador}
                  />
                )}
                {etapa === "preguntas" && consulta && rondaActiva && (
                  <div className="space-y-6">
                    <PreguntasIA
                      key={rondaActiva.id_ronda}
                      descripcionOriginal={consulta.descripcion_sintomas}
                      resumen={consulta.resumen_sintomas}
                      ronda={rondaActiva}
                      numeroRonda={rondaActiva.numero_ronda}
                      cargando={cargando}
                      onResponder={handleResponderRonda}
                    />
                    {acciones}
                  </div>
                )}
                {etapa === "confirmacion" && consulta && (
                  <div className="space-y-6">
                    <ConfirmarConsulta
                      consulta={consulta}
                      cargando={cargando}
                      onConfirmar={handleConfirmar}
                      onEditar={handleEditarRespuesta}
                    />
                    {acciones}
                  </div>
                )}
                {etapa === "resultado" && consulta && (
                  <ResultadoTriage
                    consulta={consulta}
                    onNuevaConsulta={handleNuevaConsulta}
                    restantes={contador?.restantes ?? null}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
