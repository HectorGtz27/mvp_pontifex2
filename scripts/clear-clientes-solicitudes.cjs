#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// Script para borrar todos los registros de clientes y solicitudes
// ═══════════════════════════════════════════════════════════════

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clearData() {
  try {
    console.log("🗑️  Iniciando borrado de datos...\n");

    // Primero borrar solicitudes (por seguridad, aunque el cascade lo haría)
    const deletedSolicitudes = await prisma.solicitud.deleteMany({});
    console.log(`✅ ${deletedSolicitudes.count} solicitudes eliminadas`);

    // Luego borrar clientes
    const deletedClientes = await prisma.cliente.deleteMany({});
    console.log(`✅ ${deletedClientes.count} clientes eliminados`);

    console.log("\n✨ Todas las tablas han sido vaciadas exitosamente");
  } catch (error) {
    console.error("❌ Error al borrar datos:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearData();
