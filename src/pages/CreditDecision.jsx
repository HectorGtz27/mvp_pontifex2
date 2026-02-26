import { useState } from 'react'
import {
  MOCK_APPLICATION,
  MOCK_SCORE,
  MOCK_KPIS,
  MOCK_RECOMMENDATION,
} from '../data/mock'

const GRADE_COLORS = { A: 'bg-emerald-100 text-emerald-800', B: 'bg-sky-100 text-sky-800', C: 'bg-amber-100 text-amber-800', D: 'bg-red-100 text-red-800' }

export default function CreditDecision() {
  const [decision, setDecision] = useState(null) // null | approved | adjusted | rejected
  const [notes, setNotes] = useState('')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Decisión crediticia</h1>
        <p className="text-slate-600 mt-1">
          Solución al problema 2: score consistente, recomendación del sistema y acción humana (Aprobar / Ajustar / Rechazar).
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Resumen solicitud */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Solicitud</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-slate-500">ID</dt>
              <dd className="font-mono">{MOCK_APPLICATION.id}</dd>
              <dt className="text-slate-500">Solicitante</dt>
              <dd>{MOCK_APPLICATION.applicant}</dd>
              <dt className="text-slate-500">Monto solicitado</dt>
              <dd>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(MOCK_APPLICATION.requestedAmount)}</dd>
              <dt className="text-slate-500">Plazo</dt>
              <dd>{MOCK_APPLICATION.termMonths} meses</dd>
              <dt className="text-slate-500">Destino</dt>
              <dd>{MOCK_APPLICATION.purpose}</dd>
              <dt className="text-slate-500">Documentos</dt>
              <dd>{MOCK_APPLICATION.documentsStatus.validated}/{MOCK_APPLICATION.documentsStatus.total} validados</dd>
            </dl>
          </div>

          {/* KPIs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">KPIs calculados</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Indicador</th>
                    <th className="pb-2 font-medium">Valor</th>
                    <th className="pb-2 font-medium">Benchmark</th>
                    <th className="pb-2 font-medium w-16">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_KPIS.map((k, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 text-slate-800">{k.name}</td>
                      <td className="py-2 font-mono">
                        {k.format === 'percent' ? `${(k.value * 100).toFixed(2)}%` : k.value}
                      </td>
                      <td className="py-2 text-slate-500">{k.benchmark}</td>
                      <td className="py-2">
                        <span className={k.status === 'ok' ? 'text-emerald-600' : 'text-amber-600'}>
                          {k.status === 'ok' ? '✓' : '⚠'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recomendación */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Recomendación del sistema</h2>
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-slate-500">Acción sugerida:</span>{' '}
                <span className="font-medium">
                  {MOCK_RECOMMENDATION.action === 'approve_conditional' ? 'Aprobar con condiciones' : MOCK_RECOMMENDATION.action}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Monto sugerido:</span>{' '}
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(MOCK_RECOMMENDATION.suggestedAmount)}
              </p>
              <p>
                <span className="text-slate-500">Plazo:</span> {MOCK_RECOMMENDATION.suggestedTermMonths} meses ·{' '}
                <span className="text-slate-500">Tasa:</span> {MOCK_RECOMMENDATION.suggestedRate}
              </p>
              <ul className="list-disc list-inside text-slate-700 mt-2 space-y-1">
                {MOCK_RECOMMENDATION.conditions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              <p className="text-slate-600 italic mt-2">"{MOCK_RECOMMENDATION.analystNotes}"</p>
            </div>
          </div>
        </div>

        {/* Score + Acción humana */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Score y clasificación</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold ${GRADE_COLORS[MOCK_SCORE.grade]}`}>
                {MOCK_SCORE.grade}
              </div>
              <div>
                <p className="font-medium text-slate-800">{MOCK_SCORE.gradeLabel}</p>
                <p className="text-sm text-slate-500">Puntuación compuesta: {MOCK_SCORE.composite}/100</p>
                <p className="text-sm text-slate-500">Buró: {MOCK_SCORE.bureauScore} — {MOCK_SCORE.bureauBand}</p>
              </div>
            </div>
            <div className="space-y-2">
              {MOCK_SCORE.scoreBreakdown.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-24 text-slate-600">{b.name}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-pontifex-500"
                      style={{ width: `${b.score}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono">{b.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Decisión del analista</h2>
            <textarea
              placeholder="Motivo de la decisión (obligatorio para auditoría)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-24 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500"
            />
            <div className="flex flex-col gap-2 mt-4">
              <button
                type="button"
                onClick={() => setDecision('approved')}
                className="w-full py-2.5 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Aprobar (según recomendación)
              </button>
              <button
                type="button"
                onClick={() => setDecision('adjusted')}
                className="w-full py-2.5 rounded-lg font-medium border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
              >
                Aprobar con ajustes
              </button>
              <button
                type="button"
                onClick={() => setDecision('rejected')}
                className="w-full py-2.5 rounded-lg font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
              >
                Rechazar
              </button>
            </div>
            {decision && (
              <p className="mt-3 text-sm text-slate-600">
                Decisión registrada: <strong>{decision === 'approved' ? 'Aprobado' : decision === 'adjusted' ? 'Aprobado con ajustes' : 'Rechazado'}</strong>.
                Todas las decisiones quedan registradas con timestamp y usuario para consistencia y auditoría.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
