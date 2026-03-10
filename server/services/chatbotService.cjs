'use strict'
const bedrockService = require('./bedrockService.cjs')
const prisma = require('../prisma.cjs')

const ALLOWED_ENTITIES = {
  admin:   ['clientes', 'solicitudes', 'bancos', 'documentos', 'kpis', 'creditos', 'estados_financieros', 'estados_cuenta', 'general'],
  analyst: ['clientes', 'solicitudes', 'documentos', 'kpis', 'creditos', 'estados_financieros', 'estados_cuenta', 'general'],
  viewer:  ['general']
}

async function queryDatabase(entity, filters, userRole, solicitudId = null) {
  const allowed = ALLOWED_ENTITIES[userRole] || []
  if (!allowed.includes(entity)) return null

  // Si hay solicitudId, filtramos todo por esa solicitud
  const whereClause = solicitudId ? { id: solicitudId } : {}
  const docWhereClause = solicitudId ? { solicitud_id: solicitudId } : {}

  try {
    switch (entity) {

      case 'kpis':
        case 'solicitudes':
        return await prisma.solicitud.findMany({
            where: whereClause,
            take: solicitudId ? 1 : 5,
            orderBy: { created_at: 'desc' },
            include: {
            cliente: { select: { razon_social: true, rfc: true } },
            indicadores: true,
            score_crediticio: { include: { desglose: true } },
            recomendacion: {
                include: {
                condiciones: true,
                bancos: { include: { banco: { select: { nombre: true } } } }
                }
            },
            decision: true,
            // 👇 Solo campos extraídos relevantes, sin el texto completo
            campos_extraidos: {
                select: {
                campo: true,
                valor: true,
                seccion: true,
                periodo: true
                },
                take: 100  // máximo 100 campos
            },
            documentos: {
                select: {
                nombre_archivo: true,
                tipo_documento_id: true,
                estado: true,
                confianza: true,
                // 👇 NO incluir extracted_data completo — es muy pesado
                },
                take: 20
            },
            cuentas_bancarias: {
                include: {
                documentos: {
                    include: { estado_cuenta: true },
                    take: 10
                }
                }
            }
            }
        })

         case 'documentos':
            return await prisma.documento.findMany({
                where: docWhereClause,
                orderBy: { created_at: 'desc' },
                take: 20,
                select: {
                nombre_archivo: true,
                tipo_documento_id: true,
                estado: true,
                confianza: true,
                created_at: true,
                // 👇 Solo primeros campos extraídos, sin extracted_data completo
                campos_extraidos: {
                    select: { campo: true, valor: true, seccion: true },
                    take: 50
                },
                estado_cuenta: true,
                tipo_documento: { select: { label: true } }
                }
            })

      case 'clientes':
        if (solicitudId) {
          // Si estamos en una solicitud, traer solo ese cliente
          const sol = await prisma.solicitud.findUnique({
            where: { id: solicitudId },
            include: { cliente: true }
          })
          return sol ? [sol.cliente] : []
        }
        return await prisma.cliente.findMany({
          take: 10,
          orderBy: { created_at: 'desc' },
          include: { solicitudes: true }
        })

      case 'bancos':
        return await prisma.banco.findMany({
          where: { activo: true },
          orderBy: { nombre: 'asc' }
        })

      case 'creditos':
        return await prisma.credito.findMany({
          where: solicitudId ? { solicitud_id: solicitudId } : {},
          include: {
            covenants: true,
            alertas: true,
            solicitud: { include: { cliente: true } }
          }
        })

        case 'estados_financieros':
            return await prisma.campoExtraido.findMany({
                where: { 
                solicitud_id: solicitudId || undefined 
                },
                select: {
                campo: true,
                valor: true,
                seccion: true,
                periodo: true,
                documento: {
                    select: { nombre_archivo: true }
                }
                },
                orderBy: { periodo: 'asc' },
                take: 200
            })
        
        case 'estados_cuenta':
            return await prisma.estadoCuenta.findMany({
                where: {
                documento: {
                    solicitud_id: solicitudId || undefined
                }
                },
                include: {
                documento: {
                    select: {
                    nombre_archivo: true,
                    cuenta_bancaria: {
                        select: { banco: true, divisa: true }
                    }
                    }
                }
                },
                orderBy: { periodo: 'asc' }
            })

      case 'general':
        const [totalClientes, totalSolicitudes, totalBancos, solicitudesRecientes] = await Promise.all([
          prisma.cliente.count(),
          prisma.solicitud.count(),
          prisma.banco.count({ where: { activo: true } }),
          prisma.solicitud.findMany({
            where: whereClause,
            take: 5,
            orderBy: { created_at: 'desc' },
            include: {
              cliente: { select: { razon_social: true } },
              score_crediticio: { select: { grado: true, compuesto: true } },
              decision: { select: { tipo: true } },
              documentos: {
                include: {
                  tipo_documento: true,
                  campos_extraidos: true,
                  estado_cuenta: true
                }
              },
              campos_extraidos: true,
              indicadores: true
            }
          })
        ])
        return { totalClientes, totalSolicitudes, totalBancos, solicitudesRecientes }

      default:
        return null
    }
  } catch (err) {
    console.error(`[ChatbotService] Prisma error (${entity}):`, err.message)
    return null
  }
}

exports.processQuestion = async (question, user, history = [], solicitudId = null) => {
  console.log('[ChatbotService] question:', question)
  console.log('[ChatbotService] solicitudId:', solicitudId)

  if (!user?.role) return { type: 'error', message: 'Usuario no autenticado.' }

  let intent
    try {
    intent = await bedrockService.interpretQuestion(question)
    console.log('[ChatbotService] intent:', intent)  // 👈 asegúrate que esta línea existe
    } catch (err) {
    console.error('[ChatbotService] Error en interpretQuestion:', err.message) // 👈 agregar
    intent = { entity: 'general', action: 'general', needsChart: false, filters: {} }
    }

    console.log('[ChatbotService] dbData entity usado:', intent.entity) // 👈 agregar
    const dbData = await queryDatabase(intent.entity, intent.filters, user.role, solicitudId)
    console.log('[ChatbotService] dbData recibido:', dbData ? 'con datos' : 'null') // 👈 agregar
  try {
    const result = await bedrockService.generateChatResponse(
      question, 
      dbData, 
      history, 
      intent.needsChart  // 👈 nuevo parámetro
    )

    // Si Claude devolvió gráfica
    if (intent.needsChart && result?.chart) {
      return {
        type: 'chart',
        message: result.text,
        chart: {
          id: `chart-${Date.now()}`,
          type: result.chart.type,
          title: result.chart.title,
          data: result.chart.data
        }
      }
    }

    return { type: 'answer', message: typeof result === 'string' ? result : result.text }
  } catch (err) {
    console.error('[ChatbotService] Error:', err.message)
    return { type: 'error', message: 'Error al generar respuesta.' }
  }
}