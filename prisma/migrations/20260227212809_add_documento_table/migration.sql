-- CreateTable
CREATE TABLE "documentos" (
    "id" UUID NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "s3_url" TEXT NOT NULL,
    "s3_key" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "extracted_data" JSONB,
    "textract_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);
