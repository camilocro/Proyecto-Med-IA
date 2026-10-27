-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('paciente', 'medico', 'administrador');

-- CreateEnum
CREATE TYPE "NivelUrgencia" AS ENUM ('bajo', 'medio', 'alto', 'emergencia');

-- CreateEnum
CREATE TYPE "TipoDerivacion" AS ENUM ('medicina_general', 'especialista', 'emergencia');

-- CreateEnum
CREATE TYPE "EstadoConsulta" AS ENUM ('en_proceso', 'esperando_respuestas', 'completada', 'cancelada');

-- CreateTable
CREATE TABLE "Usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id_paciente" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "fecha_nacimiento" TIMESTAMP(3),

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id_paciente")
);

-- CreateTable
CREATE TABLE "Especialidad" (
    "id_especialidad" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Especialidad_pkey" PRIMARY KEY ("id_especialidad")
);

-- CreateTable
CREATE TABLE "CentroSalud" (
    "id_centro_salud" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "zona" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CentroSalud_pkey" PRIMARY KEY ("id_centro_salud")
);

-- CreateTable
CREATE TABLE "Medico" (
    "id_medico" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_especialidad" INTEGER NOT NULL,
    "id_centro_salud" INTEGER NOT NULL,
    "descripcion_profesional" TEXT NOT NULL,
    "telefono_contacto" TEXT NOT NULL,
    "foto_url" TEXT,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Medico_pkey" PRIMARY KEY ("id_medico")
);

-- CreateTable
CREATE TABLE "Consulta" (
    "id_consulta" SERIAL NOT NULL,
    "id_paciente" INTEGER,
    "sesion_anonimo" TEXT,
    "descripcion_sintomas" TEXT NOT NULL,
    "id_especialidad_sugerida" INTEGER,
    "nivel_urgencia" "NivelUrgencia",
    "tipo_derivacion" "TipoDerivacion",
    "motivo_derivacion" TEXT,
    "estado" "EstadoConsulta" NOT NULL DEFAULT 'en_proceso',
    "fecha_consulta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id_consulta")
);

-- CreateTable
CREATE TABLE "RondaPreguntas" (
    "id_ronda" SERIAL NOT NULL,
    "id_consulta" INTEGER NOT NULL,
    "numero_ronda" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RondaPreguntas_pkey" PRIMARY KEY ("id_ronda")
);

-- CreateTable
CREATE TABLE "PreguntaRespuesta" (
    "id_pr" SERIAL NOT NULL,
    "id_ronda" INTEGER NOT NULL,
    "pregunta" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL DEFAULT '',
    "orden" INTEGER NOT NULL,

    CONSTRAINT "PreguntaRespuesta_pkey" PRIMARY KEY ("id_pr")
);

-- CreateTable
CREATE TABLE "SintomaExtraido" (
    "id_sintoma" SERIAL NOT NULL,
    "id_consulta" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "zona_cuerpo" TEXT NOT NULL,
    "duracion_estimada" TEXT NOT NULL,
    "relevancia" INTEGER NOT NULL,

    CONSTRAINT "SintomaExtraido_pkey" PRIMARY KEY ("id_sintoma")
);

-- CreateTable
CREATE TABLE "MedicoSugerido" (
    "id_sugerencia" SERIAL NOT NULL,
    "id_consulta" INTEGER NOT NULL,
    "id_medico" INTEGER NOT NULL,
    "orden_sugerencia" INTEGER NOT NULL,

    CONSTRAINT "MedicoSugerido_pkey" PRIMARY KEY ("id_sugerencia")
);

-- CreateTable
CREATE TABLE "IntentoLogin" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER,
    "correo_intentado" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "exitoso" BOOLEAN NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentoLogin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenRecuperacion" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenRecuperacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificacionEmail" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER,
    "id_consulta" INTEGER,
    "tipo" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_envio" TIMESTAMP(3),

    CONSTRAINT "NotificacionEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditoriaAcceso" (
    "id_auditoria" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "exitoso" BOOLEAN NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditoriaAcceso_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateTable
CREATE TABLE "LimiteConsultaAnonimo" (
    "id" SERIAL NOT NULL,
    "sesion_id" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LimiteConsultaAnonimo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionSistema" (
    "id_config" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionSistema_pkey" PRIMARY KEY ("id_config")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_id_usuario_key" ON "Paciente"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Especialidad_nombre_key" ON "Especialidad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Medico_id_usuario_key" ON "Medico"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "TokenRecuperacion_token_key" ON "TokenRecuperacion"("token");

-- CreateIndex
CREATE UNIQUE INDEX "LimiteConsultaAnonimo_sesion_id_fecha_key" ON "LimiteConsultaAnonimo"("sesion_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionSistema_clave_key" ON "ConfiguracionSistema"("clave");

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medico" ADD CONSTRAINT "Medico_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medico" ADD CONSTRAINT "Medico_id_especialidad_fkey" FOREIGN KEY ("id_especialidad") REFERENCES "Especialidad"("id_especialidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medico" ADD CONSTRAINT "Medico_id_centro_salud_fkey" FOREIGN KEY ("id_centro_salud") REFERENCES "CentroSalud"("id_centro_salud") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_id_paciente_fkey" FOREIGN KEY ("id_paciente") REFERENCES "Paciente"("id_paciente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_id_especialidad_sugerida_fkey" FOREIGN KEY ("id_especialidad_sugerida") REFERENCES "Especialidad"("id_especialidad") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RondaPreguntas" ADD CONSTRAINT "RondaPreguntas_id_consulta_fkey" FOREIGN KEY ("id_consulta") REFERENCES "Consulta"("id_consulta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreguntaRespuesta" ADD CONSTRAINT "PreguntaRespuesta_id_ronda_fkey" FOREIGN KEY ("id_ronda") REFERENCES "RondaPreguntas"("id_ronda") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SintomaExtraido" ADD CONSTRAINT "SintomaExtraido_id_consulta_fkey" FOREIGN KEY ("id_consulta") REFERENCES "Consulta"("id_consulta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicoSugerido" ADD CONSTRAINT "MedicoSugerido_id_consulta_fkey" FOREIGN KEY ("id_consulta") REFERENCES "Consulta"("id_consulta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicoSugerido" ADD CONSTRAINT "MedicoSugerido_id_medico_fkey" FOREIGN KEY ("id_medico") REFERENCES "Medico"("id_medico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentoLogin" ADD CONSTRAINT "IntentoLogin_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditoriaAcceso" ADD CONSTRAINT "AuditoriaAcceso_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
