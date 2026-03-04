/*
  Warnings:

  - You are about to drop the column `document_type` on the `documentos` table. All the data in the column will be lost.
  - You are about to drop the column `file_name` on the `documentos` table. All the data in the column will be lost.
  - You are about to drop the column `file_size` on the `documentos` table. All the data in the column will be lost.
  - You are about to drop the `empresas` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `cliente_id` to the `documentos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre_archivo` to the `documentos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tamano_archivo` to the `documentos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipo_documento` to the `documentos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "documentos" DROP COLUMN "document_type",
DROP COLUMN "file_name",
DROP COLUMN "file_size",
ADD COLUMN     "cliente_id" UUID NOT NULL,
ADD COLUMN     "confianza" DECIMAL(4,2),
ADD COLUMN     "estado_doc" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
ADD COLUMN     "nombre_archivo" VARCHAR(500) NOT NULL,
ADD COLUMN     "tamano_archivo" INTEGER NOT NULL,
ADD COLUMN     "tipo_documento" VARCHAR(50) NOT NULL;

-- DropTable
DROP TABLE "empresas";

-- CreateTable
CREATE TABLE "tipos_documento" (
    "id" VARCHAR(50) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipos_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "solicitante" VARCHAR(200) NOT NULL,
    "tipo_organizacion" VARCHAR(100),
    "monto_solicitado" DECIMAL(15,2) NOT NULL,
    "plazo_meses" INTEGER NOT NULL,
    "proposito" TEXT,
    "email_contacto" VARCHAR(200),
    "telefono_contacto" VARCHAR(50),
    "notas" TEXT,
    "razon_social" VARCHAR(200),
    "nombre_comercial" VARCHAR(200),
    "rfc" VARCHAR(13),
    "domicilio_fiscal" TEXT,
    "ciudad" VARCHAR(100),
    "estado" VARCHAR(100),
    "pagina_web" VARCHAR(200),
    "numero_empleados" INTEGER,
    "empleados_permanentes" INTEGER,
    "empleados_eventuales" INTEGER,
    "docs_total" INTEGER NOT NULL DEFAULT 9,
    "docs_subidos" INTEGER NOT NULL DEFAULT 0,
    "docs_validados" INTEGER NOT NULL DEFAULT 0,
    "docs_por_revisar" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campos_extraidos" (
    "id" SERIAL NOT NULL,
    "cliente_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "documento_label" VARCHAR(200) NOT NULL,
    "campo" VARCHAR(100) NOT NULL,
    "valor" VARCHAR(500),
    "fuente" VARCHAR(100),
    "valido" BOOLEAN NOT NULL DEFAULT true,
    "confianza" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campos_extraidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_crediticio" (
    "id" SERIAL NOT NULL,
    "cliente_id" UUID NOT NULL,
    "grado" CHAR(1) NOT NULL,
    "grado_label" VARCHAR(50),
    "compuesto" INTEGER,
    "score_buro" INTEGER,
    "banda_buro" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_crediticio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desglose_score" (
    "id" SERIAL NOT NULL,
    "score_crediticio_id" INTEGER NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "peso" INTEGER,
    "puntaje" INTEGER,
    "maximo" INTEGER NOT NULL DEFAULT 100,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'ok',

    CONSTRAINT "desglose_score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicadores" (
    "id" SERIAL NOT NULL,
    "cliente_id" UUID NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "valor" DECIMAL(15,4),
    "formato" VARCHAR(20),
    "benchmark" VARCHAR(30),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'ok',

    CONSTRAINT "indicadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recomendaciones" (
    "id" SERIAL NOT NULL,
    "cliente_id" UUID NOT NULL,
    "accion" VARCHAR(30) NOT NULL,
    "monto_sugerido" DECIMAL(15,2),
    "plazo_sugerido_meses" INTEGER,
    "tasa_sugerida" VARCHAR(50),
    "notas_analista" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recomendaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condiciones_recomendacion" (
    "id" SERIAL NOT NULL,
    "recomendacion_id" INTEGER NOT NULL,
    "texto_condicion" TEXT NOT NULL,

    CONSTRAINT "condiciones_recomendacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisiones" (
    "id" SERIAL NOT NULL,
    "cliente_id" UUID NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "motivo" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes_chat" (
    "id" SERIAL NOT NULL,
    "cliente_id" UUID NOT NULL,
    "rol" VARCHAR(20) NOT NULL,
    "contenido" TEXT NOT NULL,
    "chart_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creditos" (
    "id" UUID NOT NULL,
    "cliente_id" UUID,
    "solicitante" VARCHAR(200) NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "fecha_desembolso" DATE,
    "plazo_meses" INTEGER,
    "saldo" DECIMAL(15,2),
    "grado_al_desembolso" CHAR(1),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "covenants" (
    "id" SERIAL NOT NULL,
    "credito_id" UUID NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "valor_actual" DECIMAL(15,4),
    "umbral" DECIMAL(15,4),
    "estado" VARCHAR(10) NOT NULL DEFAULT 'green',
    "regla_trigger" TEXT,

    CONSTRAINT "covenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_credito" (
    "id" SERIAL NOT NULL,
    "credito_id" UUID NOT NULL,
    "tipo_alerta" VARCHAR(10) NOT NULL,
    "texto_alerta" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_credito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campos_extraidos_cliente_id_idx" ON "campos_extraidos"("cliente_id");

-- CreateIndex
CREATE INDEX "campos_extraidos_documento_id_idx" ON "campos_extraidos"("documento_id");

-- CreateIndex
CREATE UNIQUE INDEX "score_crediticio_cliente_id_key" ON "score_crediticio"("cliente_id");

-- CreateIndex
CREATE INDEX "desglose_score_score_crediticio_id_idx" ON "desglose_score"("score_crediticio_id");

-- CreateIndex
CREATE INDEX "indicadores_cliente_id_idx" ON "indicadores"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "recomendaciones_cliente_id_key" ON "recomendaciones"("cliente_id");

-- CreateIndex
CREATE INDEX "condiciones_recomendacion_recomendacion_id_idx" ON "condiciones_recomendacion"("recomendacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "decisiones_cliente_id_key" ON "decisiones"("cliente_id");

-- CreateIndex
CREATE INDEX "mensajes_chat_cliente_id_idx" ON "mensajes_chat"("cliente_id");

-- CreateIndex
CREATE INDEX "creditos_cliente_id_idx" ON "creditos"("cliente_id");

-- CreateIndex
CREATE INDEX "covenants_credito_id_idx" ON "covenants"("credito_id");

-- CreateIndex
CREATE INDEX "alertas_credito_credito_id_idx" ON "alertas_credito"("credito_id");

-- CreateIndex
CREATE INDEX "documentos_cliente_id_idx" ON "documentos"("cliente_id");

-- CreateIndex
CREATE INDEX "documentos_tipo_documento_idx" ON "documentos"("tipo_documento");

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campos_extraidos" ADD CONSTRAINT "campos_extraidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campos_extraidos" ADD CONSTRAINT "campos_extraidos_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_crediticio" ADD CONSTRAINT "score_crediticio_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desglose_score" ADD CONSTRAINT "desglose_score_score_crediticio_id_fkey" FOREIGN KEY ("score_crediticio_id") REFERENCES "score_crediticio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicadores" ADD CONSTRAINT "indicadores_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendaciones" ADD CONSTRAINT "recomendaciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condiciones_recomendacion" ADD CONSTRAINT "condiciones_recomendacion_recomendacion_id_fkey" FOREIGN KEY ("recomendacion_id") REFERENCES "recomendaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisiones" ADD CONSTRAINT "decisiones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_chat" ADD CONSTRAINT "mensajes_chat_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creditos" ADD CONSTRAINT "creditos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "covenants" ADD CONSTRAINT "covenants_credito_id_fkey" FOREIGN KEY ("credito_id") REFERENCES "creditos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_credito" ADD CONSTRAINT "alertas_credito_credito_id_fkey" FOREIGN KEY ("credito_id") REFERENCES "creditos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
