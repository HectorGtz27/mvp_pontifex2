-- CreateTable
CREATE TABLE "bancos" (
    "id" VARCHAR(60) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "cob_local" BOOLEAN NOT NULL DEFAULT false,
    "cob_estatal" BOOLEAN NOT NULL DEFAULT false,
    "cob_regional" BOOLEAN NOT NULL DEFAULT false,
    "cob_nacional" BOOLEAN NOT NULL DEFAULT false,
    "prod_credito_simple" BOOLEAN NOT NULL DEFAULT false,
    "prod_credito_revolvente" BOOLEAN NOT NULL DEFAULT false,
    "prod_factoraje" BOOLEAN NOT NULL DEFAULT false,
    "prod_arrendamiento" BOOLEAN NOT NULL DEFAULT false,
    "exp_menor_1_anio" BOOLEAN NOT NULL DEFAULT false,
    "exp_1_anio" BOOLEAN NOT NULL DEFAULT false,
    "exp_2_mas_anios" BOOLEAN NOT NULL DEFAULT false,
    "sec_comercio" BOOLEAN NOT NULL DEFAULT false,
    "sec_industria" BOOLEAN NOT NULL DEFAULT false,
    "sec_servicio" BOOLEAN NOT NULL DEFAULT false,
    "sec_primario" BOOLEAN NOT NULL DEFAULT false,
    "buro_excelente" BOOLEAN NOT NULL DEFAULT false,
    "buro_bueno" BOOLEAN NOT NULL DEFAULT false,
    "buro_regular" BOOLEAN NOT NULL DEFAULT false,
    "buro_malo" BOOLEAN NOT NULL DEFAULT false,
    "gar_aval" BOOLEAN NOT NULL DEFAULT false,
    "gar_relacion_patrimonial" BOOLEAN NOT NULL DEFAULT false,
    "gar_hipotecaria" BOOLEAN NOT NULL DEFAULT false,
    "gar_prendaria" BOOLEAN NOT NULL DEFAULT false,
    "gar_liquidez" BOOLEAN NOT NULL DEFAULT false,
    "gar_contrato" BOOLEAN NOT NULL DEFAULT false,
    "solv_utilidad" BOOLEAN NOT NULL DEFAULT false,
    "solv_perdida" BOOLEAN NOT NULL DEFAULT false,
    "solv_quiebra_tecnica" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bancos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recomendaciones_bancos" (
    "id" SERIAL NOT NULL,
    "recomendacion_id" INTEGER NOT NULL,
    "banco_id" VARCHAR(60) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 1,
    "notas" TEXT,

    CONSTRAINT "recomendaciones_bancos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recomendaciones_bancos_recomendacion_id_idx" ON "recomendaciones_bancos"("recomendacion_id");

-- AddForeignKey
ALTER TABLE "recomendaciones_bancos" ADD CONSTRAINT "recomendaciones_bancos_recomendacion_id_fkey" FOREIGN KEY ("recomendacion_id") REFERENCES "recomendaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendaciones_bancos" ADD CONSTRAINT "recomendaciones_bancos_banco_id_fkey" FOREIGN KEY ("banco_id") REFERENCES "bancos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
