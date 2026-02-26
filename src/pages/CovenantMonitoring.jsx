import { MOCK_CREDITS } from '../data/mock'

const STATUS_STYLES = {
  green: 'bg-emerald-100 text-emerald-800',
  yellow: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
}

export default function CovenantMonitoring() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Monitoreo de covenants y triggers</h1>
        <p className="text-slate-600 mt-1">
          Solución al problema 3: monitoreo post-desembolso, alertas automáticas y bloqueos según reglas (DSCR, Deuda/EBIT, capital de trabajo, mora).
        </p>
      </div>

      <div className="grid gap-4">
        {MOCK_CREDITS.map((credit) => (
          <div
            key={credit.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          >
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium text-slate-800">{credit.id}</span>
                <span className="text-slate-700">{credit.applicant}</span>
                <span className="text-sm text-slate-500">
                  {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(credit.amount)} · Saldo: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(credit.balance)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {credit.alerts.some((a) => a.type === 'red') && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">Alertas rojas</span>
                )}
                {credit.alerts.some((a) => a.type === 'yellow') && !credit.alerts.some((a) => a.type === 'red') && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">Alerta amarilla</span>
                )}
                {credit.alerts.length === 0 && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800">Sin alertas</span>
                )}
              </div>
            </div>
            <div className="p-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {credit.covenants.map((c, i) => (
                  <div key={i} className="border border-slate-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{c.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_STYLES[c.status]}`}>
                        {c.status === 'green' ? 'OK' : c.status === 'yellow' ? 'Alerta' : 'Trigger'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{c.trigger}</p>
                    {c.current !== undefined && (
                      <p className="text-sm font-mono text-slate-800">
                        Actual: {typeof c.current === 'number' && c.current > 100
                          ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(c.current)
                          : c.current}
                        {c.threshold !== undefined && (
                          <span className="text-slate-500"> / límite {c.threshold}</span>
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {credit.alerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700">Alertas activas</h4>
                  {credit.alerts.map((a, i) => (
                    <div
                      key={i}
                      className={`text-sm px-3 py-2 rounded-lg ${
                        a.type === 'red' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-amber-50 text-amber-800 border border-amber-100'
                      }`}
                    >
                      {a.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-sm text-slate-600">
        <h3 className="font-medium text-slate-800 mb-2">Reglas de triggers (mock)</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>DSCR &lt; 1.2 → Alerta amarilla</li>
          <li>Deuda/EBIT &gt; 4 → Alerta roja</li>
          <li>Mora en buró &gt; 30 días → Revisión manual</li>
          <li>Capital de trabajo negativo → Bloqueo automático de desembolsos</li>
        </ul>
      </div>
    </div>
  )
}
