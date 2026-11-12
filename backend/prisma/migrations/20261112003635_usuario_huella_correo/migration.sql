-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "huella_correo" VARCHAR(64);

-- CreateIndex
CREATE INDEX "Usuario_huella_correo_idx" ON "Usuario"("huella_correo");
