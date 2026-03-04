-- ═══════════════════════════════════════════════════════════════
-- Restructure: Separate Cliente (empresa) from Solicitud (crédito)
-- Add document categories, new form fields, proper relationships
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Clean all existing data (dev seed data) ──────────────
TRUNCATE TABLE "alertas_credito" CASCADE;
TRUNCATE TABLE "covenants" CASCADE;
TRUNCATE TABLE "condiciones_recomendacion" CASCADE;
TRUNCATE TABLE "desglose_score" CASCADE;
TRUNCATE TABLE "campos_extraidos" CASCADE;
TRUNCATE TABLE "documentos" CASCADE;
TRUNCATE TABLE "indicadores" CASCADE;
TRUNCATE TABLE "recomendaciones" CASCADE;
TRUNCATE TABLE "score_crediticio" CASCADE;
TRUNCATE TABLE "decisiones" CASCADE;
TRUNCATE TABLE "creditos" CASCADE;
TRUNCATE TABLE "clientes" CASCADE;
TRUNCATE TABLE "tipos_documento" CASCADE;
DROP TABLE IF EXISTS "mensajes_chat";

-- ─── 2. Create new tables ────────────────────────────────────

CREATE TABLE "categorias_documento" (
    "id" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "categorias_documento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "solicitudes" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "divisa" VARCHAR(10) NOT NULL DEFAULT 'MXN',
    "plazo_deseado" VARCHAR(100),
    "destino" TEXT,
    "tasa_objetivo" VARCHAR(100),
    "tipo_colateral" VARCHAR(200),
    "nivel_ventas_anuales" DECIMAL(15,2),
    "margen_real_utilidad" DECIMAL(5,2),
    "situacion_buro_credito" VARCHAR(200),
    "estatus" VARCHAR(30) NOT NULL DEFAULT 'borrador',
    "docs_total" INTEGER NOT NULL DEFAULT 0,
    "docs_subidos" INTEGER NOT NULL DEFAULT 0,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "solicitudes_pkey" PRIMARY KEY ("id")
);

-- ─── 3. Restructure clientes table ───────────────────────────

-- Drop old FK constraints
ALTER TABLE "campos_extraidos" DROP CONSTRAINT IF EXISTS "campos_extraidos_cliente_id_fkey";
ALTER TABLE "creditos" DROP CONSTRAINT IF EXISTS "creditos_cliente_id_fkey";
ALTER TABLE "decisiones" DROP CONSTRAINT IF EXISTS "decisiones_cliente_id_fkey";
ALTER TABLE "documentos" DROP CONSTRAINT IF EXISTS "documentos_cliente_id_fkey";
ALTER TABLE "indicadores" DROP CONSTRAINT IF EXISTS "indicadores_cliente_id_fkey";
ALTER TABLE "recomendaciones" DROP CONSTRAINT IF EXISTS "recomendaciones_cliente_id_fkey";
ALTER TABLE "score_crediticio" DROP CONSTRAINT IF EXISTS "score_crediticio_cliente_id_fkey";

-- Drop old indexes
DROP INDEX IF EXISTS "campos_extraidos_cliente_id_idx";
DROP INDEX IF EXISTS "creditos_cliente_id_idx";
DROP INDEX IF EXISTS "decisiones_cliente_id_key";
DROP INDEX IF EXISTS "documentos_cliente_id_idx";
DROP INDEX IF EXISTS "documentos_tipo_documento_idx";
DROP INDEX IF EXISTS "indicadores_cliente_id_idx";
DROP INDEX IF EXISTS "recomendaciones_cliente_id_key";
DROP INDEX IF EXISTS "score_crediticio_cliente_id_key";

-- Restructure clientes: remove solicitud-specific fields, add empresa fields
ALTER TABLE "clientes"
  DROP COLUMN IF EXISTS "solicitante",
  DROP COLUMN IF EXISTS "tipo_organizacion",
  DROP COLUMN IF EXISTS "monto_solicitado",
  DROP COLUMN IF EXISTS "plazo_meses",
  DROP COLUMN IF EXISTS "proposito",
  DROP COLUMN IF EXISTS "email_contacto",
  DROP COLUMN IF EXISTS "telefono_contacto",
  DROP COLUMN IF EXISTS "notas",
  DROP COLUMN IF EXISTS "numero_empleados",
  DROP COLUMN IF EXISTS "empleados_permanentes",
  DROP COLUMN IF EXISTS "empleados_eventuales",
  DROP COLUMN IF EXISTS "docs_total",
  DROP COLUMN IF EXISTS "docs_subidos",
  DROP COLUMN IF EXISTS "docs_validados",
  DROP COLUMN IF EXISTS "docs_por_revisar",
  ADD COLUMN IF NOT EXISTS "contacto_nombre" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "telefono" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "celular" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "correo_electronico" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "num_empleados_permanentes" INTEGER,
  ADD COLUMN IF NOT EXISTS "num_empleados_eventuales" INTEGER;

-- Make razon_social required and widen columns
ALTER TABLE "clientes" ALTER COLUMN "razon_social" SET NOT NULL;
ALTER TABLE "clientes" ALTER COLUMN "razon_social" SET DATA TYPE VARCHAR(300);
ALTER TABLE "clientes" ALTER COLUMN "nombre_comercial" SET DATA TYPE VARCHAR(300);
ALTER TABLE "clientes" ALTER COLUMN "pagina_web" SET DATA TYPE VARCHAR(300);

-- ─── 4. Restructure tipos_documento ──────────────────────────

ALTER TABLE "tipos_documento"
  ADD COLUMN "categoria_id" VARCHAR(50),
  ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "tipos_documento" ALTER COLUMN "label" SET DATA TYPE VARCHAR(300);

-- ─── 5. Restructure documentos ───────────────────────────────

ALTER TABLE "documentos"
  DROP COLUMN IF EXISTS "cliente_id",
  DROP COLUMN IF EXISTS "estado_doc",
  DROP COLUMN IF EXISTS "tipo_documento",
  ADD COLUMN "solicitud_id" UUID,
  ADD COLUMN "tipo_documento_id" VARCHAR(50),
  ADD COLUMN "estado" VARCHAR(30) NOT NULL DEFAULT 'pendiente';

ALTER TABLE "documentos" ALTER COLUMN "mime_type" SET DATA TYPE VARCHAR(100);
ALTER TABLE "documentos" ALTER COLUMN "confianza" SET DATA TYPE DECIMAL(5,2);

-- ─── 6. Restructure campos_extraidos ─────────────────────────

ALTER TABLE "campos_extraidos"
  DROP COLUMN IF EXISTS "cliente_id",
  DROP COLUMN IF EXISTS "documento_label",
  DROP COLUMN IF EXISTS "valido",
  ADD COLUMN "solicitud_id" UUID,
  ADD COLUMN "seccion" VARCHAR(100),
  ADD COLUMN "periodo" VARCHAR(50);

ALTER TABLE "campos_extraidos" ALTER COLUMN "campo" SET DATA TYPE VARCHAR(200);
ALTER TABLE "campos_extraidos" ALTER COLUMN "valor" SET DATA TYPE TEXT;
ALTER TABLE "campos_extraidos" ALTER COLUMN "confianza" SET DATA TYPE DECIMAL(5,2);
ALTER TABLE "campos_extraidos" ALTER COLUMN "estado" SET DATA TYPE VARCHAR(30);

-- ─── 7. Restructure downstream tables ────────────────────────

ALTER TABLE "creditos" DROP COLUMN IF EXISTS "cliente_id";
ALTER TABLE "creditos" ADD COLUMN "solicitud_id" UUID;

ALTER TABLE "decisiones" DROP COLUMN IF EXISTS "cliente_id";
ALTER TABLE "decisiones" ADD COLUMN "solicitud_id" UUID;

ALTER TABLE "indicadores" DROP COLUMN IF EXISTS "cliente_id";
ALTER TABLE "indicadores" ADD COLUMN "solicitud_id" UUID;

ALTER TABLE "recomendaciones" DROP COLUMN IF EXISTS "cliente_id";
ALTER TABLE "recomendaciones" ADD COLUMN "solicitud_id" UUID;

ALTER TABLE "score_crediticio" DROP COLUMN IF EXISTS "cliente_id";
ALTER TABLE "score_crediticio" ADD COLUMN "solicitud_id" UUID;

-- ─── 8. Set NOT NULL on new required columns ────────────────

ALTER TABLE "documentos" ALTER COLUMN "solicitud_id" SET NOT NULL;
ALTER TABLE "documentos" ALTER COLUMN "tipo_documento_id" SET NOT NULL;
ALTER TABLE "campos_extraidos" ALTER COLUMN "solicitud_id" SET NOT NULL;
ALTER TABLE "decisiones" ALTER COLUMN "solicitud_id" SET NOT NULL;
ALTER TABLE "indicadores" ALTER COLUMN "solicitud_id" SET NOT NULL;
ALTER TABLE "recomendaciones" ALTER COLUMN "solicitud_id" SET NOT NULL;
ALTER TABLE "score_crediticio" ALTER COLUMN "solicitud_id" SET NOT NULL;
ALTER TABLE "tipos_documento" ALTER COLUMN "categoria_id" SET NOT NULL;

-- ─── 9. Create indexes ──────────────────────────────────────

CREATE INDEX "solicitudes_cliente_id_idx" ON "solicitudes"("cliente_id");
CREATE INDEX "campos_extraidos_solicitud_id_idx" ON "campos_extraidos"("solicitud_id");
CREATE INDEX "creditos_solicitud_id_idx" ON "creditos"("solicitud_id");
CREATE UNIQUE INDEX "decisiones_solicitud_id_key" ON "decisiones"("solicitud_id");
CREATE INDEX "documentos_solicitud_id_idx" ON "documentos"("solicitud_id");
CREATE INDEX "documentos_tipo_documento_id_idx" ON "documentos"("tipo_documento_id");
CREATE INDEX "indicadores_solicitud_id_idx" ON "indicadores"("solicitud_id");
CREATE UNIQUE INDEX "recomendaciones_solicitud_id_key" ON "recomendaciones"("solicitud_id");
CREATE UNIQUE INDEX "score_crediticio_solicitud_id_key" ON "score_crediticio"("solicitud_id");
CREATE INDEX "tipos_documento_categoria_id_idx" ON "tipos_documento"("categoria_id");

-- ─── 10. Create foreign key constraints ─────────────────────

ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tipos_documento" ADD CONSTRAINT "tipos_documento_categoria_id_fkey"
  FOREIGN KEY ("categoria_id") REFERENCES "categorias_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "documentos" ADD CONSTRAINT "documentos_solicitud_id_fkey"
  FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documentos" ADD CONSTRAINT "documentos_tipo_documento_id_fkey"
  FOREIGN KEY ("tipo_documento_id") REFERENCES "tipos_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "campos_extraidos" ADD CONSTRAINT "campos_extraidos_solicitud_id_fkey"
  FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "score_crediticio" ADD CONSTRAINT "score_crediticio_solicitud_id_fkey"
  FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "indicadores" ADD CONSTRAINT "indicadores_solicitud_id_fkey"
  FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recomendaciones" ADD CONSTRAINT "recomendaciones_solicitud_id_fkey"
  FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "decisiones" ADD CONSTRAINT "decisiones_solicitud_id_fkey"
  FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "creditos" ADD CONSTRAINT "creditos_solicitud_id_fkey"
  FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
