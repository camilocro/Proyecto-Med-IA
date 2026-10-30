"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  adminService,
  DashboardMetrics,
  ConsultaReciente,
  UsuarioAdmin,
  EstadisticasAdmin,
} from "@/services/admin.service";
import Navbar from "@/components/layout/Navbar";
import StatsCard, { Tendencia } from "@/components/admin/StatsCard";
import { GraficoBarras, GraficoDonut } from "@/components/admin/Graficos";
import Sidebar, { SeccionAdmin } from "@/components/admin/Sidebar";
import UsuariosTable from "@/components/admin/UsuariosTable";
import {
  ClipboardList,
  AlertTriangle,
  UserCheck,
  Users,
  RefreshCw,
  Clock,
  AlertCircle,
} from "lucide-react";

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function formatearFechaCorta(iso: string): string {
  return new Date(iso).toLocaleString("es-BO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Badges ────────────────────────────────────────────────────────────────────

const URGENCIA_CLASES: Record<string, string> = {
  alto: "bg-red-100 text-red-700",
  medio: "bg-amber-100 text-amber-700",
  bajo: "bg-green-100 text-green-700",
  emergencia: "bg-purple-100 text-purple-700",
};

const URGENCIA_PUNTO: Record<string, string> = {
  alto: "bg-red-500",
  medio: "bg-amber-500",
  bajo: "bg-green-500",
  emergencia: "bg-purple-500",
};

const URGENCIA_LABEL: Record<string, string> = {
  alto: "Alta",
  medio: "Media",
  bajo: "Baja",
  emergencia: "Emergencia",
};

function BadgeUrgencia({ nivel }: { nivel: string | null }) {
  if (!nivel) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
      ${URGENCIA_CLASES[nivel] ?? "bg-gray-100 text-gray-600"}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${URGENCIA_PUNTO[nivel] ?? "bg-gray-400"}`}
      />
      {URGENCIA_LABEL[nivel] ?? nivel}
    </span>
  );
}

const ESTADO_BADGE: Record<string, { texto: string; clases: string }> = {
  completada: { texto: "Completada", clases: "bg-green-100 text-green-700" },
  cancelada: { texto: "Cancelada", clases: "bg-red-100 text-red-700" },
  esperando_respuestas: {
    texto: "Esperando respuestas",
    clases: "bg-amber-100 text-amber-700",
  },
  en_proceso: { texto: "En proceso", clases: "bg-blue-100 text-blue-700" },
};

function BadgeEstado({ estado }: { estado: string }) {
  const badge = ESTADO_BADGE[estado] ?? ESTADO_BADGE.en_proceso;
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${badge.clases}`}
    >
      {badge.texto}
    </span>
  );
}

// ── Subtextos de las tarjetas (HU-032) ───────────────────────────────────────

interface Subtexto {
  texto: string;
  tendencia: Tendencia;
}

function compararConAyer(hoy: number, ayer: number): Subtexto {
  if (ayer === 0) {
    return hoy === 0
      ? { texto: "Igual que ayer", tendencia: "neutral" }
      : { texto: `+${hoy} vs ayer`, tendencia: "sube" };
  }
  const variacion = Math.round(((hoy - ayer) / ayer) * 100);
  if (variacion === 0) return { texto: "Igual que ayer", tendencia: "neutral" };
  return {
    texto: `${variacion > 0 ? "+" : ""}${variacion}% vs ayer`,
    tendencia: variacion > 0 ? "sube" : "baja",
  };
}

function usuariosNuevos(cantidad: number): Subtexto {
  return cantidad > 0
    ? { texto: `+${cantidad} esta semana`, tendencia: "sube" }
    : { texto: "Sin nuevos esta semana", tendencia: "neutral" };
}

function especialidadesCubiertas(cantidad: number): Subtexto {
  return {
    texto:
      cantidad === 1 ? "En 1 especialidad" : `En ${cantidad} especialidades`,
    tendencia: "neutral",
  };
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = SeccionAdmin;

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "usuarios", label: "Usuarios" },
];

// ── Estado de la página ───────────────────────────────────────────────────────

interface EstadoPagina {
  metricas: DashboardMetrics | null;
  estadisticas: EstadisticasAdmin | null;
  consultas: ConsultaReciente[];
  usuarios: UsuarioAdmin[];
  cargando: boolean;
  actualizado: Date | null;
  error: string | null;
}

const ESTADO_INICIAL: EstadoPagina = {
  metricas: null,
  consultas: [],
  usuarios: [],
  cargando: true,
  actualizado: null,
  error: null,
  estadisticas: null,
};

// ── Página ────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { usuario, cargando: cargandoAuth, esAdmin } = useAuth();
  const router = useRouter();

  const [estado, setEstado] = useState<EstadoPagina>(ESTADO_INICIAL);
  const [tabActiva, setTabActiva] = useState<Tab>("dashboard");

  // Redirigir si no es admin
  useEffect(() => {
    if (!cargandoAuth && (!usuario || !esAdmin)) {
      router.replace("/");
    }
  }, [cargandoAuth, usuario, esAdmin, router]);

  // Cargar datos del servidor
  const cargarDatos = useCallback(async () => {
    setEstado((prev) => ({ ...prev, cargando: true, error: null }));

    try {
      const [metricas, estadisticas, consultas, usuarios] = await Promise.all([
        adminService.getDashboard(),
        // Si fallan las estadísticas, el resto del panel igual se muestra
        adminService.getEstadisticas().catch(() => null),
        adminService.getConsultasRecientes(),
        adminService.getUsuarios().catch(() => [] as UsuarioAdmin[]),
      ]);

      setEstado({
        metricas,
        estadisticas,
        consultas,
        usuarios,
        cargando: false,
        actualizado: new Date(),
        error: null,
      });
    } catch {
      // Sin esto el panel quedaba cargando indefinidamente si el backend fallaba
      setEstado((prev) => ({
        ...prev,
        cargando: false,
        error:
          "No se pudieron cargar los datos del panel. Verificá tu conexión e intentá de nuevo.",
      }));
    }
  }, []);

  useEffect(() => {
    if (!cargandoAuth && esAdmin) cargarDatos();
  }, [cargandoAuth, esAdmin, cargarDatos]);

  // ── Pantalla de carga ──────────────────────────────────────────────────────
  if (cargandoAuth) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!esAdmin) return null;

  const {
    metricas,
    estadisticas,
    consultas,
    usuarios,
    cargando,
    actualizado,
    error,
  } = estado;
  const resumen = estadisticas?.resumen;

  const fechaHoy = new Date().toLocaleDateString("es-BO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr] md:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Barra de navegación global: mantiene el acceso al resto del sistema y a "Salir" */}
      <div className="md:col-span-2">
        <Navbar />
      </div>

      <Sidebar seccionActiva={tabActiva} onCambiarSeccion={setTabActiva} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Topbar ── */}
        <header className="bg-white border-b border-gray-100 px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Panel Administrativo
            </h1>
            <p className="text-sm text-gray-400 capitalize">{fechaHoy}</p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {actualizado && (
              <span className="text-xs text-gray-400 hidden md:block">
                Actualizado: {actualizado.toLocaleTimeString("es-BO")}
              </span>
            )}
            <span className="text-sm font-medium text-gray-700 bg-gray-100 px-4 py-2 rounded-xl">
              Buenos días, {usuario?.nombre.split(" ")[0]}
            </span>
            <button
              onClick={cargarDatos}
              disabled={cargando}
              title="Actualizar datos"
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </header>

        {/* ── Tabs ── */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-8">
          <div className="flex gap-0">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTabActiva(id)}
                className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  tabActiva === id
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-8 space-y-6 sm:space-y-8">
          {/* Error al cargar datos */}
          {error && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                type="button"
                onClick={cargarDatos}
                className="text-sm font-medium text-red-700 hover:underline flex-shrink-0"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* ══ TAB DASHBOARD ══════════════════════════════════════════════ */}
          {tabActiva === "dashboard" && (
            <>
              {/* Tarjetas de métricas */}
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <StatsCard
                  titulo="Consultas hoy"
                  valor={metricas?.consultasHoy ?? 0}
                  icono={ClipboardList}
                  color="azul"
                  {...(resumen
                    ? (({ texto, tendencia }) => ({
                        subtexto: texto,
                        tendencia,
                      }))(
                        compararConAyer(
                          resumen.consultasHoy,
                          resumen.consultasAyer,
                        ),
                      )
                    : {})}
                  cargando={cargando && !metricas}
                />
                <StatsCard
                  titulo="Urgencias altas"
                  valor={metricas?.urgenciasAltas ?? 0}
                  icono={AlertTriangle}
                  color="rojo"
                  subtexto="Hoy, incluye emergencias"
                  cargando={cargando && !metricas}
                />
                <StatsCard
                  titulo="Médicos activos"
                  valor={metricas?.medicosActivos ?? 0}
                  icono={UserCheck}
                  color="verde"
                  subtexto={
                    resumen
                      ? especialidadesCubiertas(
                          resumen.especialidadesConMedicos,
                        ).texto
                      : undefined
                  }
                  cargando={cargando && !metricas}
                />
                <StatsCard
                  titulo="Usuarios registrados"
                  valor={metricas?.usuariosRegistrados ?? 0}
                  icono={Users}
                  color="amarillo"
                  subtexto={
                    resumen
                      ? usuariosNuevos(resumen.usuariosNuevosSemana).texto
                      : undefined
                  }
                  tendencia={
                    resumen
                      ? usuariosNuevos(resumen.usuariosNuevosSemana).tendencia
                      : "neutral"
                  }
                  cargando={cargando && !metricas}
                />
              </section>

              {/* Consultas recientes */}
              <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    Consultas Recientes
                  </h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                    Últimas {consultas.length}
                  </span>
                </div>

                {cargando && consultas.length === 0 ? (
                  <div className="divide-y divide-gray-50">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="px-6 py-4 flex items-center gap-4 animate-pulse"
                      >
                        <div className="h-4 bg-gray-200 rounded w-28" />
                        <div className="h-4 bg-gray-200 rounded flex-1" />
                        <div className="h-4 bg-gray-200 rounded w-24" />
                        <div className="h-6 bg-gray-200 rounded w-16" />
                        <div className="h-4 bg-gray-200 rounded w-20" />
                        <div className="h-6 bg-gray-200 rounded w-20" />
                      </div>
                    ))}
                  </div>
                ) : consultas.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      No hay consultas registradas todavía.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead className="bg-gray-50">
                        <tr className="text-xs text-gray-400 uppercase tracking-wider">
                          <th className="px-6 py-3 text-left font-medium">
                            Usuario
                          </th>
                          <th className="px-6 py-3 text-left font-medium">
                            Síntomas
                          </th>
                          <th className="px-6 py-3 text-left font-medium">
                            Especialidad
                          </th>
                          <th className="px-6 py-3 text-left font-medium">
                            Urgencia
                          </th>
                          <th className="px-6 py-3 text-left font-medium">
                            Fecha
                          </th>
                          <th className="px-6 py-3 text-left font-medium">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {consultas.map((c) => (
                          <tr
                            key={c.id_consulta}
                            className="hover:bg-gray-50/60 transition-colors"
                          >
                            <td className="px-6 py-4 text-sm font-semibold text-gray-800 whitespace-nowrap">
                              {c.paciente?.usuario?.nombre ?? "Anónimo"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px]">
                              <span className="truncate block">
                                {c.descripcion_sintomas.length > 45
                                  ? `${c.descripcion_sintomas.slice(0, 45)}…`
                                  : c.descripcion_sintomas}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                              {c.especialidad_sugerida?.nombre ?? (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <BadgeUrgencia nivel={c.nivel_urgencia} />
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                              {formatearFechaCorta(c.fecha_consulta)}
                            </td>
                            <td className="px-6 py-4">
                              <BadgeEstado estado={c.estado} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Gráficos */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">
                    Consultas por día (últimos 7 días)
                  </h3>
                  <GraficoBarras datos={estadisticas?.consultasPorDia ?? []} />
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">
                    Distribución por especialidad
                  </h3>
                  <GraficoDonut datos={estadisticas?.porEspecialidad ?? []} />
                </div>
              </section>
            </>
          )}

          {/* ══ TAB USUARIOS ═══════════════════════════════════════════════ */}
          {tabActiva === "usuarios" && (
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  Gestión de Usuarios
                </h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                  {usuarios.length} usuarios
                </span>
              </div>

              {cargando && usuarios.length === 0 ? (
                <div className="divide-y divide-gray-50">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="px-6 py-4 flex items-center gap-4 animate-pulse"
                    >
                      <div className="h-4 bg-gray-200 rounded w-32" />
                      <div className="h-4 bg-gray-200 rounded flex-1" />
                      <div className="h-6 bg-gray-200 rounded w-20" />
                      <div className="h-6 bg-gray-200 rounded w-16" />
                      <div className="h-8 bg-gray-200 rounded w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <UsuariosTable
                  usuarios={usuarios}
                  onUsuariosChange={(actualizados) =>
                    setEstado((prev) => ({ ...prev, usuarios: actualizados }))
                  }
                />
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
