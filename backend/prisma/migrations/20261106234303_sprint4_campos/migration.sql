-- AlterEnum
ALTER TYPE "EstadoConsulta" ADD VALUE 'esperando_confirmacion';

-- AlterTable
ALTER TABLE "Consulta" ADD COLUMN     "especialidades_alternativas" JSONB,
ADD COLUMN     "oculta_paciente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resumen_sintomas" TEXT;

-- AlterTable
ALTER TABLE "TokenRecuperacion" ADD COLUMN     "intentos" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "doble_factor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recibir_correos" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;

-- Sprint 4: las cuentas existentes se marcan como verificadas para que HU-044 no bloquee a nadie
UPDATE "Usuario" SET "verificado" = true;