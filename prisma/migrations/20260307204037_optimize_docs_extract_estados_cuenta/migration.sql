/*
  Optimización: Normalizar campos bancarios de documentos → estados_cuenta
  
  - Crea tabla estados_cuenta (1:1 con documento, solo para estados de cuenta bancarios)
  - Migra datos existentes de documentos.{periodo, abonos, retiros, saldo_promedio}
  - Actualiza divisa en cuentas_bancarias desde documentos donde faltaba
  - Elimina columnas bancarias redundantes de documentos
*/

-- 1. Crear tabla estados_cuenta
CREATE TABLE "estados_cuenta" (
    "id" SERIAL NOT NULL,
    "documento_id" UUID NOT NULL,
    "periodo" VARCHAR(7),
    "abonos" DECIMAL(18,2),
    "retiros" DECIMAL(18,2),
    "saldo_promedio" DECIMAL(18,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estados_cuenta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "estados_cuenta_documento_id_key" ON "estados_cuenta"("documento_id");

ALTER TABLE "estados_cuenta" ADD CONSTRAINT "estados_cuenta_documento_id_fkey"
  FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Migrar datos existentes de documentos → estados_cuenta
INSERT INTO "estados_cuenta" ("documento_id", "periodo", "abonos", "retiros", "saldo_promedio", "created_at")
SELECT "id", "periodo", "abonos", "retiros", "saldo_promedio", "created_at"
FROM "documentos"
WHERE "periodo" IS NOT NULL
   OR "abonos" IS NOT NULL
   OR "retiros" IS NOT NULL
   OR "saldo_promedio" IS NOT NULL;

-- 3. Propagar divisa detectada a cuentas_bancarias donde aún sea NULL
UPDATE "cuentas_bancarias" cb
SET "divisa" = d."divisa"
FROM "documentos" d
WHERE d."cuenta_bancaria_id" = cb."id"
  AND cb."divisa" IS NULL
  AND d."divisa" IS NOT NULL;

-- 4. Eliminar columnas bancarias redundantes de documentos
ALTER TABLE "documentos" DROP COLUMN "abonos",
DROP COLUMN "banco",
DROP COLUMN "divisa",
DROP COLUMN "periodo",
DROP COLUMN "retiros",
DROP COLUMN "saldo_promedio";
