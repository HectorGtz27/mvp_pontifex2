/**
 * Seed script — populates the Pontifex database with demo data via Prisma.
 * Run:  node server/seed.cjs
 */
const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function seed() {
  try {
    // ─── 1. Document categories (from checklist) ────────────
    const categorias = [
      { id: 'proyecto_inversion', nombre: 'Proyecto de Inversión',  orden: 1 },
      { id: 'legal',              nombre: 'Legal',                  orden: 2 },
      { id: 'financiera',         nombre: 'Financiera',             orden: 3 },
      { id: 'fiscal',             nombre: 'Fiscal',                 orden: 4 },
      { id: 'buro_credito',       nombre: 'Buró de Crédito',        orden: 5 },
    ]
    for (const c of categorias) {
      await prisma.categoriaDocumento.upsert({
        where: { id: c.id },
        update: {},
        create: c,
      })
    }
    console.log('✓ Document categories seeded')

    // ─── 2. Document types (from checklist) ─────────────────
    const docTypes = [
      // Proyecto de Inversión
      { id: 'presentacion_curriculum',   categoria_id: 'proyecto_inversion', label: 'Presentación / Curriculum de la empresa',         required: true,  orden: 1 },
      { id: 'resumen_ejecutivo',         categoria_id: 'proyecto_inversion', label: 'Resumen ejecutivo',                               required: true,  orden: 2 },
      { id: 'proyecciones_financieras',  categoria_id: 'proyecto_inversion', label: 'Proyecciones financieras',                        required: true,  orden: 3 },
      { id: 'estructura_directiva',      categoria_id: 'proyecto_inversion', label: 'Cuadro descriptivo de la estructura directiva',   required: true,  orden: 4 },
      { id: 'cv_directivos',             categoria_id: 'proyecto_inversion', label: 'CV de los principales directivos y socios',       required: true,  orden: 5 },
      // Legal
      { id: 'acta_constitutiva',         categoria_id: 'legal',             label: 'Acta Constitutiva',                                required: true,  orden: 1 },
      { id: 'poderes_asambleas',         categoria_id: 'legal',             label: 'Poderes y Asambleas',                              required: true,  orden: 2 },
      // Financiera
      { id: 'edos_financieros_anio1',    categoria_id: 'financiera',        label: 'Estados Financieros (penúltimo ejercicio fiscal)', required: true,  orden: 1 },
      { id: 'edos_financieros_anio2',    categoria_id: 'financiera',        label: 'Estados Financieros (último ejercicio fiscal)',     required: true,  orden: 2 },
      { id: 'edo_financiero_parcial',    categoria_id: 'financiera',        label: 'Estado Financiero Parcial (ejercicio en curso)',    required: true,  orden: 3 },
      { id: 'edos_cuenta_bancarios',     categoria_id: 'financiera',        label: 'Estados de cuenta bancarios de los últimos 12 meses', required: true, orden: 4 },
      { id: 'proyecciones_proyecto',     categoria_id: 'financiera',        label: 'Proyecciones Financieras del proyecto',            required: true,  orden: 5 },
      // Fiscal
      { id: 'constancia_situacion_fiscal', categoria_id: 'fiscal',          label: 'Constancia de Situación Fiscal',                   required: true,  orden: 1 },
      { id: 'declaracion_anual_1',       categoria_id: 'fiscal',            label: 'Declaración anual (penúltimo ejercicio)',           required: true,  orden: 2 },
      { id: 'declaracion_anual_2',       categoria_id: 'fiscal',            label: 'Declaración anual (último ejercicio)',              required: true,  orden: 3 },
      { id: 'declaraciones_provisionales', categoria_id: 'fiscal',          label: 'Últimas 3 declaraciones provisionales',            required: true,  orden: 4 },
      { id: 'comprobante_domicilio',     categoria_id: 'fiscal',            label: 'Comprobante de domicilio fiscal',                  required: true,  orden: 5 },
      // Buró de Crédito
      { id: 'buro_credito_pm',           categoria_id: 'buro_credito',      label: 'Reporte de buró de crédito Especial PM',           required: true,  orden: 1 },
      { id: 'buro_credito_socios',       categoria_id: 'buro_credito',      label: 'Reporte buró de crédito Especial Socios accionistas y/o RL', required: true, orden: 2 },
    ]
    for (const dt of docTypes) {
      await prisma.tipoDocumento.upsert({
        where: { id: dt.id },
        update: {},
        create: dt,
      })
    }
    console.log('✓ Document types seeded (' + docTypes.length + ' types)')

    // ─── 3. Demo cliente (empresa) ──────────────────────────
    const CLIENTE_ID = '00000000-0000-4000-a000-000000000042'
    const cliente = await prisma.cliente.upsert({
      where: { id: CLIENTE_ID },
      update: {},
      create: {
        id: CLIENTE_ID,
        razon_social: 'OSC Desarrollo Verde A.C.',
        nombre_comercial: 'Desarrollo Verde',
        rfc: 'ODE123456ABC',
        domicilio_fiscal: 'Av. Ejemplo 123, Col. Centro, CDMX',
        ciudad: 'Ciudad de México',
        estado: 'CDMX',
        contacto_nombre: 'Juan Pérez López',
        telefono: '55 1234 5678',
        celular: '55 9876 5432',
        correo_electronico: 'juan.perez@desarrolloverde.mx',
        pagina_web: 'www.desarrolloverde.mx',
        num_empleados_permanentes: 45,
        num_empleados_eventuales: 12,
      },
    })
    console.log('✓ Cliente seeded:', cliente.id)

    // ─── 4. Demo solicitud (aplicación de crédito) ──────────
    const SOLICITUD_ID = '00000000-0000-4000-b000-000000000001'
    const solicitud = await prisma.solicitud.upsert({
      where: { id: SOLICITUD_ID },
      update: {},
      create: {
        id: SOLICITUD_ID,
        cliente_id: CLIENTE_ID,
        monto: 850000,
        divisa: 'MXN',
        plazo_deseado: '24 meses',
        destino: 'Capital de trabajo y adquisición de equipo',
        tasa_objetivo: '15% anual',
        tipo_colateral: 'Hipoteca sobre inmueble comercial',
        nivel_ventas_anuales: 2100000,
        margen_real_utilidad: 8.8,
        situacion_buro_credito: 'Al corriente, score 645',
        estatus: 'en_revision',
        docs_total: docTypes.length,
        docs_subidos: 9,
        notas: 'Cliente con buen historial. Requiere monitoreo de buró.',
      },
    })
    console.log('✓ Solicitud seeded:', solicitud.id)

    // ─── 5. Demo documento + campos extraídos ───────────────
    await prisma.campoExtraido.deleteMany({ where: { solicitud_id: SOLICITUD_ID } })
    await prisma.documento.deleteMany({ where: { solicitud_id: SOLICITUD_ID } })

    const DUMMY_DOC_ID = '00000000-0000-4000-c000-000000000001'
    await prisma.documento.upsert({
      where: { id: DUMMY_DOC_ID },
      update: {},
      create: {
        id: DUMMY_DOC_ID,
        solicitud_id: SOLICITUD_ID,
        tipo_documento_id: 'constancia_situacion_fiscal',
        nombre_archivo: 'CSF_DesarrolloVerde.pdf',
        s3_url: 'https://example.com/placeholder.pdf',
        s3_key: 'uploads/placeholder.pdf',
        mime_type: 'application/pdf',
        tamano_archivo: 0,
        estado: 'procesado',
        confianza: 0.92,
      },
    })

    const fields = [
      // Balance General fields
      { seccion: 'balance_general', campo: 'Activo Circulante',            valor: '1,800,000',   periodo: '31/12/2024', fuente: 'OCR', confianza: 0.92, estado: 'validado' },
      { seccion: 'balance_general', campo: 'Inventarios',                  valor: '350,000',     periodo: '31/12/2024', fuente: 'OCR', confianza: 0.90, estado: 'validado' },
      { seccion: 'balance_general', campo: 'Clientes',                     valor: '620,000',     periodo: '31/12/2024', fuente: 'OCR', confianza: 0.88, estado: 'validado' },
      { seccion: 'balance_general', campo: 'Activo Fijo',                  valor: '2,450,000',   periodo: '31/12/2024', fuente: 'OCR', confianza: 0.91, estado: 'validado' },
      { seccion: 'balance_general', campo: 'Activo Total',                 valor: '4,250,000',   periodo: '31/12/2024', fuente: 'OCR', confianza: 0.92, estado: 'validado' },
      { seccion: 'balance_general', campo: 'Pasivo Circulante',            valor: '720,000',     periodo: '31/12/2024', fuente: 'OCR', confianza: 0.90, estado: 'validado' },
      { seccion: 'balance_general', campo: 'Pasivo Largo Plazo',           valor: '480,000',     periodo: '31/12/2024', fuente: 'OCR', confianza: 0.89, estado: 'validado' },
      { seccion: 'balance_general', campo: 'Pasivo Total',                 valor: '1,200,000',   periodo: '31/12/2024', fuente: 'OCR', confianza: 0.92, estado: 'validado' },
      { seccion: 'balance_general', campo: 'Capital Contable',             valor: '3,050,000',   periodo: '31/12/2024', fuente: 'OCR', confianza: 0.92, estado: 'validado' },
      // Estado de Resultados
      { seccion: 'estado_resultados', campo: 'Ventas',                     valor: '2,100,000',   periodo: '31/12/2024', fuente: 'OCR', confianza: 0.92, estado: 'validado' },
      { seccion: 'estado_resultados', campo: 'Costos de Venta',            valor: '1,200,000',   periodo: '31/12/2024', fuente: 'OCR', confianza: 0.90, estado: 'validado' },
      { seccion: 'estado_resultados', campo: 'Utilidad Bruta',             valor: '900,000',     periodo: '31/12/2024', fuente: 'OCR', confianza: 0.91, estado: 'validado' },
      { seccion: 'estado_resultados', campo: 'Utilidad Neta',              valor: '185,000',     periodo: '31/12/2024', fuente: 'OCR', confianza: 0.92, estado: 'validado' },
      // Info from CSF
      { seccion: 'datos_fiscales',    campo: 'Razón Social',               valor: 'OSC Desarrollo Verde A.C.', periodo: null, fuente: 'OCR', confianza: 0.95, estado: 'validado' },
      { seccion: 'datos_fiscales',    campo: 'RFC',                        valor: 'ODE123456ABC',              periodo: null, fuente: 'OCR', confianza: 0.95, estado: 'validado' },
      { seccion: 'datos_fiscales',    campo: 'Domicilio Fiscal',           valor: 'Av. Ejemplo 123, Col. Centro, CDMX', periodo: null, fuente: 'OCR', confianza: 0.88, estado: 'validado' },
      { seccion: 'datos_fiscales',    campo: 'Situación fiscal',           valor: 'Al corriente',              periodo: null, fuente: 'OCR', confianza: 0.95, estado: 'validado' },
    ]

    for (const f of fields) {
      await prisma.campoExtraido.create({
        data: {
          solicitud_id: SOLICITUD_ID,
          documento_id: DUMMY_DOC_ID,
          ...f,
        },
      })
    }
    console.log('✓ Extracted fields seeded (' + fields.length + ' fields)')

    // ─── 6. Credit score ────────────────────────────────────
    await prisma.scoreCrediticio.upsert({
      where: { solicitud_id: SOLICITUD_ID },
      update: {},
      create: {
        solicitud_id: SOLICITUD_ID,
        grado: 'B',
        grado_label: 'Riesgo Medio',
        compuesto: 70,
        score_buro: 645,
        banda_buro: 'Naranja (587-667)',
        desglose: {
          create: [
            { nombre: 'Liquidez',        peso: 45, puntaje: 72, maximo: 100, estado: 'ok' },
            { nombre: 'Rentabilidad',    peso: 35, puntaje: 68, maximo: 100, estado: 'ok' },
            { nombre: 'Buró de Crédito', peso: 15, puntaje: 65, maximo: 100, estado: 'warning' },
            { nombre: 'ESG',             peso: 5,  puntaje: 80, maximo: 100, estado: 'ok' },
          ],
        },
      },
    })
    console.log('✓ Credit score seeded')

    // ─── 7. KPIs ────────────────────────────────────────────
    await prisma.indicador.deleteMany({ where: { solicitud_id: SOLICITUD_ID } })
    const kpis = [
      { nombre: 'Razón Circulante', valor: 1.85,  formato: null,      benchmark: '> 1.2', estado: 'ok' },
      { nombre: 'DSCR',             valor: 1.35,  formato: null,      benchmark: '> 1.2', estado: 'ok' },
      { nombre: 'Deuda/EBIT',       valor: 3.2,   formato: null,      benchmark: '< 4',   estado: 'ok' },
      { nombre: 'ROE',              valor: 0.062, formato: 'percent', benchmark: '> 5%',  estado: 'ok' },
      { nombre: 'Margen Neto',      valor: 0.088, formato: 'percent', benchmark: '> 5%',  estado: 'ok' },
    ]
    for (const k of kpis) {
      await prisma.indicador.create({ data: { solicitud_id: SOLICITUD_ID, ...k } })
    }
    console.log('✓ KPIs seeded')

    // ─── 8. Recommendation ─────────────────────────────────
    await prisma.recomendacion.upsert({
      where: { solicitud_id: SOLICITUD_ID },
      update: {},
      create: {
        solicitud_id: SOLICITUD_ID,
        accion: 'approve_conditional',
        monto_sugerido: 800000,
        plazo_sugerido_meses: 24,
        tasa_sugerida: '18% anual',
        notas_analista: 'Rentabilidad y liquidez sólidas. Buró en rango naranja; recomiendo aprobación con monitoreo trimestral.',
        condiciones: {
          create: [
            { texto_condicion: 'Mantener DSCR mínimo 1.2 durante la vida del crédito.' },
            { texto_condicion: 'Presentar estados financieros trimestrales.' },
            { texto_condicion: 'Garantía: hipoteca sobre activo valorado en 1.2M.' },
          ],
        },
      },
    })
    console.log('✓ Recommendation seeded')

    // ─── 9. Credits + covenants + alerts ────────────────────
    await prisma.alertaCredito.deleteMany({})
    await prisma.covenant.deleteMany({})
    await prisma.credito.deleteMany({})

    const creditsData = [
      {
        solicitante: 'OSC Desarrollo Verde A.C.', monto: 800000,
        fecha_desembolso: new Date('2025-11-15'), plazo_meses: 24, saldo: 620000, grado_al_desembolso: 'B',
        solicitud_id: SOLICITUD_ID,
        covenants: [
          { nombre: 'DSCR',               valor_actual: 1.28,   umbral: 1.2,  estado: 'yellow', regla_trigger: 'DSCR < 1.2 → alerta' },
          { nombre: 'Deuda/EBIT',         valor_actual: 3.8,    umbral: 4,    estado: 'green',  regla_trigger: '> 4 → alerta roja' },
          { nombre: 'Capital de trabajo', valor_actual: 120000, umbral: null, estado: 'green',  regla_trigger: 'Negativo → bloqueo' },
          { nombre: 'Mora Buró',          valor_actual: 0,      umbral: null, estado: 'green',  regla_trigger: '> 30 días → revisión' },
        ],
        alertas: [
          { tipo_alerta: 'yellow', texto_alerta: 'DSCR cercano al mínimo (1.28). Revisar en próximo trimestre.' },
        ],
      },
      {
        solicitante: 'Fundación Comunidad Sostenible', monto: 500000,
        fecha_desembolso: new Date('2025-09-01'), plazo_meses: 18, saldo: 380000, grado_al_desembolso: 'A',
        covenants: [
          { nombre: 'DSCR',               valor_actual: 1.52,  umbral: 1.2,  estado: 'green', regla_trigger: 'DSCR < 1.2 → alerta' },
          { nombre: 'Deuda/EBIT',         valor_actual: 2.1,   umbral: 4,    estado: 'green', regla_trigger: '> 4 → alerta roja' },
          { nombre: 'Capital de trabajo', valor_actual: 95000, umbral: null, estado: 'green', regla_trigger: 'Negativo → bloqueo' },
          { nombre: 'Mora Buró',          valor_actual: 0,     umbral: null, estado: 'green', regla_trigger: '> 30 días → revisión' },
        ],
        alertas: [],
      },
      {
        solicitante: 'Asociación Emprendedores Locales', monto: 350000,
        fecha_desembolso: new Date('2025-06-10'), plazo_meses: 12, saldo: 140000, grado_al_desembolso: 'B',
        covenants: [
          { nombre: 'DSCR',               valor_actual: 1.05,   umbral: 1.2,  estado: 'red',   regla_trigger: 'DSCR < 1.2 → alerta' },
          { nombre: 'Deuda/EBIT',         valor_actual: 4.2,    umbral: 4,    estado: 'red',   regla_trigger: '> 4 → alerta roja' },
          { nombre: 'Capital de trabajo', valor_actual: -15000, umbral: null, estado: 'red',   regla_trigger: 'Negativo → bloqueo' },
          { nombre: 'Mora Buró',          valor_actual: 0,      umbral: null, estado: 'green', regla_trigger: '> 30 días → revisión' },
        ],
        alertas: [
          { tipo_alerta: 'red', texto_alerta: 'DSCR por debajo del covenant (1.05). Trigger de revisión manual.' },
          { tipo_alerta: 'red', texto_alerta: 'Deuda/EBIT excede el umbral: 4.2 vs 4.0.' },
          { tipo_alerta: 'red', texto_alerta: 'Capital de trabajo negativo: -$15,000.' },
        ],
      },
    ]

    for (const cr of creditsData) {
      const { covenants, alertas, ...creditData } = cr
      const credit = await prisma.credito.create({ data: creditData })
      for (const cov of covenants) {
        await prisma.covenant.create({ data: { credito_id: credit.id, ...cov } })
      }
      for (const al of alertas) {
        await prisma.alertaCredito.create({ data: { credito_id: credit.id, ...al } })
      }
    }
    console.log('✓ Credits + covenants + alerts seeded')

    // ─── 4. Bancos con convenio ──────────────────────────────
    const bancos = [
      // ──────────────────────────────────────────────────────
      // 1. COVALTO
      // Cobertura: Nacional | Productos: Crédito Simple, Revolvente, Factoraje, Arrendamiento
      // Exp: 2+ años | Sector: todos | Buró: Bueno | Garantías: Aval, Hipotecaria, Prendaria
      // Solvencia: Utilidad
      // ──────────────────────────────────────────────────────
      {
        id: 'covalto',
        nombre: 'COVALTO',
        cob_local: false, cob_estatal: false, cob_regional: false, cob_nacional: true,
        prod_credito_simple: true, prod_credito_revolvente: true, prod_factoraje: true, prod_arrendamiento: true,
        exp_menor_1_anio: false, exp_1_anio: false, exp_2_mas_anios: true,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: true,
        buro_excelente: false, buro_bueno: true, buro_regular: false, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: false, gar_hipotecaria: true, gar_prendaria: true, gar_liquidez: false, gar_contrato: false,
        solv_utilidad: true, solv_perdida: false, solv_quiebra_tecnica: false,
      },
      // ──────────────────────────────────────────────────────
      // 2. SANTANDER PyME / EMPRESAS
      // Cobertura: Estatal | Productos: Crédito Simple, Revolvente, Factoraje, Arrendamiento
      // Exp: 2+ años | Sector: todos | Buró: Excelente | Garantías: Aval, Hipotecaria, Prendaria, Liquidez
      // Solvencia: Utilidad
      // ──────────────────────────────────────────────────────
      {
        id: 'santander_pyme',
        nombre: 'SANTANDER PyME / EMPRESAS',
        cob_local: false, cob_estatal: true, cob_regional: false, cob_nacional: false,
        prod_credito_simple: true, prod_credito_revolvente: true, prod_factoraje: true, prod_arrendamiento: true,
        exp_menor_1_anio: false, exp_1_anio: false, exp_2_mas_anios: true,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: true,
        buro_excelente: true, buro_bueno: false, buro_regular: false, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: false, gar_hipotecaria: true, gar_prendaria: true, gar_liquidez: true, gar_contrato: false,
        solv_utilidad: true, solv_perdida: false, solv_quiebra_tecnica: false,
      },
      // ──────────────────────────────────────────────────────
      // 3. FINAMO
      // Cobertura: Nacional | Productos: Crédito Simple, Revolvente, Arrendamiento
      // Exp: 2+ años | Sector: todos | Buró: Excelente | Garantías: Aval, Hipotecaria
      // Solvencia: Utilidad, Pérdida
      // ──────────────────────────────────────────────────────
      {
        id: 'finamo',
        nombre: 'FINAMO',
        cob_local: false, cob_estatal: false, cob_regional: false, cob_nacional: true,
        prod_credito_simple: true, prod_credito_revolvente: true, prod_factoraje: false, prod_arrendamiento: true,
        exp_menor_1_anio: false, exp_1_anio: false, exp_2_mas_anios: true,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: true,
        buro_excelente: true, buro_bueno: false, buro_regular: false, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: false, gar_hipotecaria: true, gar_prendaria: false, gar_liquidez: false, gar_contrato: false,
        solv_utilidad: true, solv_perdida: true, solv_quiebra_tecnica: false,
      },
      // ──────────────────────────────────────────────────────
      // 4. ANTICIPA / FINSUS
      // Cobertura: Nacional | Productos: Crédito Simple, Revolvente
      // Exp: 2+ años | Sector: todos | Buró: Regular | Garantías: Aval
      // Solvencia: Utilidad, Pérdida
      // ──────────────────────────────────────────────────────
      {
        id: 'anticipa_finsus',
        nombre: 'ANTICIPA / FINSUS',
        cob_local: false, cob_estatal: false, cob_regional: false, cob_nacional: true,
        prod_credito_simple: true, prod_credito_revolvente: true, prod_factoraje: false, prod_arrendamiento: false,
        exp_menor_1_anio: false, exp_1_anio: false, exp_2_mas_anios: true,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: true,
        buro_excelente: false, buro_bueno: false, buro_regular: true, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: false, gar_hipotecaria: false, gar_prendaria: false, gar_liquidez: false, gar_contrato: false,
        solv_utilidad: true, solv_perdida: true, solv_quiebra_tecnica: false,
      },
      // ──────────────────────────────────────────────────────
      // 5. GRUPO 1120
      // Cobertura: Estatal | Productos: Crédito Simple, Revolvente
      // Exp: 1 año | Sector: Comercio, Industria, Servicio | Buró: Bueno
      // Garantías: Aval, Relación Patrimonial, Hipotecaria, Prendaria | Solvencia: Utilidad
      // ──────────────────────────────────────────────────────
      {
        id: 'grupo_1120',
        nombre: 'Grupo 1120',
        cob_local: false, cob_estatal: true, cob_regional: false, cob_nacional: false,
        prod_credito_simple: true, prod_credito_revolvente: true, prod_factoraje: false, prod_arrendamiento: false,
        exp_menor_1_anio: false, exp_1_anio: true, exp_2_mas_anios: false,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: false,
        buro_excelente: false, buro_bueno: true, buro_regular: false, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: true, gar_hipotecaria: true, gar_prendaria: true, gar_liquidez: false, gar_contrato: false,
        solv_utilidad: true, solv_perdida: false, solv_quiebra_tecnica: false,
      },
      // ──────────────────────────────────────────────────────
      // 6. BANREGIO
      // Cobertura: Estatal | Productos: Crédito Simple, Revolvente, Factoraje, Arrendamiento
      // Exp: 2+ años | Sector: todos | Buró: Excelente | Garantías: Aval, Hipotecaria, Prendaria
      // Solvencia: Utilidad
      // ──────────────────────────────────────────────────────
      {
        id: 'banregio',
        nombre: 'BANREGIO',
        cob_local: false, cob_estatal: true, cob_regional: false, cob_nacional: false,
        prod_credito_simple: true, prod_credito_revolvente: true, prod_factoraje: true, prod_arrendamiento: true,
        exp_menor_1_anio: false, exp_1_anio: false, exp_2_mas_anios: true,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: true,
        buro_excelente: true, buro_bueno: false, buro_regular: false, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: false, gar_hipotecaria: true, gar_prendaria: true, gar_liquidez: false, gar_contrato: false,
        solv_utilidad: true, solv_perdida: false, solv_quiebra_tecnica: false,
      },
      // ──────────────────────────────────────────────────────
      // 7. AUTOKAPITAL
      // Cobertura: Estatal | Productos: Crédito Simple, Revolvente
      // Exp: 2+ años | Sector: todos | Buró: Bueno | Garantías: Aval, Prendaria
      // Solvencia: Utilidad
      // ──────────────────────────────────────────────────────
      {
        id: 'autokapital',
        nombre: 'AUTOKAPITAL',
        cob_local: false, cob_estatal: true, cob_regional: false, cob_nacional: false,
        prod_credito_simple: true, prod_credito_revolvente: true, prod_factoraje: false, prod_arrendamiento: false,
        exp_menor_1_anio: false, exp_1_anio: false, exp_2_mas_anios: true,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: true,
        buro_excelente: false, buro_bueno: true, buro_regular: false, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: false, gar_hipotecaria: false, gar_prendaria: true, gar_liquidez: false, gar_contrato: false,
        solv_utilidad: true, solv_perdida: false, solv_quiebra_tecnica: false,
      },
      // ──────────────────────────────────────────────────────
      // 8. HEY BANCO
      // Cobertura: Nacional | Productos: Crédito Simple, Revolvente
      // Exp: 1 año | Sector: todos | Buró: Excelente | Garantías: Aval
      // Solvencia: Utilidad
      // ──────────────────────────────────────────────────────
      {
        id: 'hey_banco',
        nombre: 'HEY BANCO',
        cob_local: false, cob_estatal: false, cob_regional: false, cob_nacional: true,
        prod_credito_simple: true, prod_credito_revolvente: true, prod_factoraje: false, prod_arrendamiento: false,
        exp_menor_1_anio: false, exp_1_anio: true, exp_2_mas_anios: false,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: true,
        buro_excelente: true, buro_bueno: false, buro_regular: false, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: false, gar_hipotecaria: false, gar_prendaria: false, gar_liquidez: false, gar_contrato: false,
        solv_utilidad: true, solv_perdida: false, solv_quiebra_tecnica: false,
      },
      // ──────────────────────────────────────────────────────
      // 9. TIP (Tecnología e Innovación de Pagos / Arrendamiento)
      // Cobertura: Nacional | Productos: Arrendamiento
      // Exp: 1 año | Sector: todos | Buró: Bueno
      // Garantías: Aval, Relación Patrimonial, Contrato | Solvencia: Utilidad
      // ──────────────────────────────────────────────────────
      {
        id: 'tip',
        nombre: 'TIP',
        cob_local: false, cob_estatal: false, cob_regional: false, cob_nacional: true,
        prod_credito_simple: false, prod_credito_revolvente: false, prod_factoraje: false, prod_arrendamiento: true,
        exp_menor_1_anio: false, exp_1_anio: true, exp_2_mas_anios: false,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: true,
        buro_excelente: false, buro_bueno: true, buro_regular: false, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: true, gar_hipotecaria: false, gar_prendaria: false, gar_liquidez: false, gar_contrato: true,
        solv_utilidad: true, solv_perdida: false, solv_quiebra_tecnica: false,
      },
      // ──────────────────────────────────────────────────────
      // 10. CV CREDIT (EXITUS CAPITAL)
      // Cobertura: Estatal | Productos: Crédito Simple, Revolvente
      // Exp: 2+ años | Sector: todos | Buró: Bueno
      // Garantías: Aval, Hipotecaria, Prendaria | Solvencia: Utilidad, Pérdida
      // ──────────────────────────────────────────────────────
      {
        id: 'cv_credit',
        nombre: 'CV CREDIT (EXITUS CAPITAL)',
        cob_local: false, cob_estatal: true, cob_regional: false, cob_nacional: false,
        prod_credito_simple: true, prod_credito_revolvente: true, prod_factoraje: false, prod_arrendamiento: false,
        exp_menor_1_anio: false, exp_1_anio: false, exp_2_mas_anios: true,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: true,
        buro_excelente: false, buro_bueno: true, buro_regular: false, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: false, gar_hipotecaria: true, gar_prendaria: true, gar_liquidez: false, gar_contrato: false,
        solv_utilidad: true, solv_perdida: true, solv_quiebra_tecnica: false,
      },
      // ──────────────────────────────────────────────────────
      // 11. HELIOS
      // Cobertura: Nacional | Productos: Crédito Simple, Factoraje
      // Exp: 2+ años | Sector: todos | Buró: Bueno
      // Garantías: Aval, Hipotecaria, Liquidez | Solvencia: Utilidad, Quiebra técnica
      // ──────────────────────────────────────────────────────
      {
        id: 'helios',
        nombre: 'HELIOS',
        cob_local: false, cob_estatal: false, cob_regional: false, cob_nacional: true,
        prod_credito_simple: true, prod_credito_revolvente: false, prod_factoraje: true, prod_arrendamiento: false,
        exp_menor_1_anio: false, exp_1_anio: false, exp_2_mas_anios: true,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: true,
        buro_excelente: false, buro_bueno: true, buro_regular: false, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: false, gar_hipotecaria: true, gar_prendaria: false, gar_liquidez: true, gar_contrato: false,
        solv_utilidad: true, solv_perdida: false, solv_quiebra_tecnica: true,
      },
      // ──────────────────────────────────────────────────────
      // 12. XEPELIN
      // Cobertura: Nacional | Productos: Crédito Simple, Revolvente
      // Exp: 2+ años | Sector: todos | Buró: Bueno
      // Garantías: Aval, Hipotecaria | Solvencia: Utilidad, Pérdida
      // ──────────────────────────────────────────────────────
      {
        id: 'xepelin',
        nombre: 'XEPELIN',
        cob_local: false, cob_estatal: false, cob_regional: false, cob_nacional: true,
        prod_credito_simple: true, prod_credito_revolvente: true, prod_factoraje: false, prod_arrendamiento: false,
        exp_menor_1_anio: false, exp_1_anio: false, exp_2_mas_anios: true,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: true,
        buro_excelente: false, buro_bueno: true, buro_regular: false, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: false, gar_hipotecaria: true, gar_prendaria: false, gar_liquidez: false, gar_contrato: false,
        solv_utilidad: true, solv_perdida: true, solv_quiebra_tecnica: false,
      },
      // ──────────────────────────────────────────────────────
      // 13. RFJ CAPITAL
      // Cobertura: Local | Productos: Crédito Simple
      // Exp: 2+ años | Sector: todos | Buró: Bueno, Regular
      // Garantías: Aval, Hipotecaria | Solvencia: Utilidad, Quiebra técnica
      // ──────────────────────────────────────────────────────
      {
        id: 'rfj_capital',
        nombre: 'RFJ Capital',
        cob_local: true, cob_estatal: false, cob_regional: false, cob_nacional: false,
        prod_credito_simple: true, prod_credito_revolvente: false, prod_factoraje: false, prod_arrendamiento: false,
        exp_menor_1_anio: false, exp_1_anio: false, exp_2_mas_anios: true,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: true,
        buro_excelente: false, buro_bueno: true, buro_regular: true, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: false, gar_hipotecaria: true, gar_prendaria: false, gar_liquidez: false, gar_contrato: false,
        solv_utilidad: true, solv_perdida: false, solv_quiebra_tecnica: true,
      },
      // ──────────────────────────────────────────────────────
      // 14. BANCA EMPRESARIAL COPPEL / ARRENDADORA
      // Cobertura: Estatal | Productos: Crédito Simple, Revolvente, Arrendamiento
      // Exp: 2+ años | Sector: todos | Buró: Bueno
      // Garantías: Aval, Hipotecaria, Prendaria | Solvencia: Utilidad
      // ──────────────────────────────────────────────────────
      {
        id: 'coppel_empresarial',
        nombre: 'BANCA EMPRESARIAL COPPEL / ARRENDADORA',
        cob_local: false, cob_estatal: true, cob_regional: false, cob_nacional: false,
        prod_credito_simple: true, prod_credito_revolvente: true, prod_factoraje: false, prod_arrendamiento: true,
        exp_menor_1_anio: false, exp_1_anio: false, exp_2_mas_anios: true,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: true,
        buro_excelente: false, buro_bueno: true, buro_regular: false, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: false, gar_hipotecaria: true, gar_prendaria: true, gar_liquidez: false, gar_contrato: false,
        solv_utilidad: true, solv_perdida: false, solv_quiebra_tecnica: false,
      },
      // ──────────────────────────────────────────────────────
      // 15. FINKARGO
      // Cobertura: Nacional | Productos: Factoraje
      // Exp: Menor a 1 año | Sector: Comercio, Industria, Servicio | Buró: Mal Buró
      // Garantías: Contrato | Solvencia: Utilidad, Pérdida
      // ──────────────────────────────────────────────────────
      {
        id: 'finkargo',
        nombre: 'FINKARGO',
        cob_local: false, cob_estatal: false, cob_regional: false, cob_nacional: true,
        prod_credito_simple: false, prod_credito_revolvente: false, prod_factoraje: true, prod_arrendamiento: false,
        exp_menor_1_anio: true, exp_1_anio: false, exp_2_mas_anios: false,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: false,
        buro_excelente: false, buro_bueno: false, buro_regular: false, buro_malo: true,
        gar_aval: false, gar_relacion_patrimonial: false, gar_hipotecaria: false, gar_prendaria: false, gar_liquidez: false, gar_contrato: true,
        solv_utilidad: true, solv_perdida: true, solv_quiebra_tecnica: false,
      },
      // ──────────────────────────────────────────────────────
      // 16. INVERFIN
      // Cobertura: Nacional | Productos: Factoraje
      // Exp: Menor a 1 año | Sector: Comercio, Industria, Servicio | Buró: Regular
      // Garantías: Aval | Solvencia: Utilidad
      // ──────────────────────────────────────────────────────
      {
        id: 'inverfin',
        nombre: 'INVERFIN',
        cob_local: false, cob_estatal: false, cob_regional: false, cob_nacional: true,
        prod_credito_simple: false, prod_credito_revolvente: false, prod_factoraje: true, prod_arrendamiento: false,
        exp_menor_1_anio: true, exp_1_anio: false, exp_2_mas_anios: false,
        sec_comercio: true, sec_industria: true, sec_servicio: true, sec_primario: false,
        buro_excelente: false, buro_bueno: false, buro_regular: true, buro_malo: false,
        gar_aval: true, gar_relacion_patrimonial: false, gar_hipotecaria: false, gar_prendaria: false, gar_liquidez: false, gar_contrato: false,
        solv_utilidad: true, solv_perdida: false, solv_quiebra_tecnica: false,
      },
    ]

    for (const banco of bancos) {
      await prisma.banco.upsert({
        where: { id: banco.id },
        update: banco,
        create: banco,
      })
    }
    console.log(`✓ Bancos seeded (${bancos.length} instituciones)`)

    console.log('\n✅ Seed complete!')
  } catch (err) {
    console.error('❌ Seed error:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()