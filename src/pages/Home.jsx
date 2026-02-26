import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="space-y-10">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Pontifex</h1>
        <p className="text-slate-600 max-w-xl mx-auto">
          Plataforma de evaluación crediticia para financiación del desarrollo sostenible.
          Este mockup muestra las soluciones a los 3 problemas principales.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Link
          to="/documentos"
          className="block p-6 bg-white rounded-xl border border-slate-200 hover:border-pontifex-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xl mb-4">📄</div>
          <h2 className="font-semibold text-slate-900 mb-1">1. Documentos</h2>
          <p className="text-sm text-slate-600">
            Carga, extracción y validación de datos desde PDFs. Tipos de documento, detección automática y resultados de extracción.
          </p>
          <span className="inline-block mt-3 text-sm font-medium text-pontifex-600">Ver flujo →</span>
        </Link>

        <Link
          to="/decision"
          className="block p-6 bg-white rounded-xl border border-slate-200 hover:border-pontifex-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl mb-4">✓</div>
          <h2 className="font-semibold text-slate-900 mb-1">2. Decisión crediticia</h2>
          <p className="text-sm text-slate-600">
            Score A/B/C/D, KPIs, recomendación del sistema y acción humana (Aprobar / Ajustar / Rechazar).
          </p>
          <span className="inline-block mt-3 text-sm font-medium text-pontifex-600">Ver flujo →</span>
        </Link>

        <Link
          to="/covenants"
          className="block p-6 bg-white rounded-xl border border-slate-200 hover:border-pontifex-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xl mb-4">📊</div>
          <h2 className="font-semibold text-slate-900 mb-1">3. Covenants y triggers</h2>
          <p className="text-sm text-slate-600">
            Monitoreo post-desembolso: estado de covenants, alertas amarillas/rojas y bloqueos automáticos.
          </p>
          <span className="inline-block mt-3 text-sm font-medium text-pontifex-600">Ver flujo →</span>
        </Link>
      </div>
    </div>
  )
}
