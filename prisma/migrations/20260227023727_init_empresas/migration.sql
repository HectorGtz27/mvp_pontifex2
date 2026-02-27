-- CreateTable
CREATE TABLE "empresas" (
    "id" UUID NOT NULL,
    "razon_social" VARCHAR(200) NOT NULL,
    "nombre_comercial" VARCHAR(200),
    "rfc" VARCHAR(13) NOT NULL,
    "domicilio_fiscal" TEXT,
    "ciudad" VARCHAR(100),
    "estado" VARCHAR(100),
    "telefono" VARCHAR(20),
    "correo_electronico" VARCHAR(200),
    "pagina_web" VARCHAR(200),
    "numero_empleados" INTEGER,
    "empleados_permanentes" INTEGER,
    "empleados_eventuales" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);
