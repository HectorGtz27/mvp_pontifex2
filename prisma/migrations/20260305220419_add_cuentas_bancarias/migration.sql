-- AlterTable
ALTER TABLE "documentos" ADD COLUMN     "abonos" DECIMAL(18,2),
ADD COLUMN     "banco" VARCHAR(100),
ADD COLUMN     "cuenta_bancaria_id" UUID,
ADD COLUMN     "divisa" VARCHAR(10),
ADD COLUMN     "periodo" VARCHAR(7),
ADD COLUMN     "retiros" DECIMAL(18,2),
ADD COLUMN     "saldo_promedio" DECIMAL(18,2);

-- CreateTable
CREATE TABLE "cuentas_bancarias" (
    "id" UUID NOT NULL,
    "solicitud_id" UUID NOT NULL,
    "banco" VARCHAR(100) NOT NULL,
    "divisa" VARCHAR(10) NOT NULL DEFAULT 'MXN',
    "alias" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuentas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cuentas_bancarias_solicitud_id_idx" ON "cuentas_bancarias"("solicitud_id");

-- CreateIndex
CREATE INDEX "documentos_cuenta_bancaria_id_idx" ON "documentos"("cuenta_bancaria_id");

-- AddForeignKey
ALTER TABLE "cuentas_bancarias" ADD CONSTRAINT "cuentas_bancarias_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_cuenta_bancaria_id_fkey" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "cuentas_bancarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
