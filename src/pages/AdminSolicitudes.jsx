import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchSolicitudes } from '../utils/api'
import { formatMoney } from '../utils/format'

export default function AdminSolicitudes() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])

  const filteredQuery = useMemo(() => query.trim(), [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchSolicitudes({ q: filteredQuery, limit: 100, offset: 0 })
      .then((data) => {
        if (cancelled) return
        setRows(Array.isArray(data) ? data : [])
      })
      .catch((e) => {
        if (cancelled) return
        setError(e?.message || 'No se pudo cargar la lista de solicitudes.')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filteredQuery])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Administrar solicitudes</h1>
          <p className="text-slate-600 mt-1">
            Revisa solicitudes existentes, su estatus de documentos y abre el flujo para continuar el análisis.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/solicitud"
            className="px-4 py-2.5 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700"
          >
            + Nueva solicitud
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex-1">
          <label htmlFor="q" className="sr-only">Buscar</label>
          <input
            id="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por ID o solicitante…"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setQuery('')}
          className="px-3 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 text-sm"
        >
          Limpiar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-medium text-slate-800">Solicitudes</span>
          <span className="text-sm text-slate-500">
            {loading ? 'Cargando…' : `${rows.length} resultado(s)`}
          </span>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-100">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white sticky top-0">
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="px-4 py-2 font-medium">ID</th>
                <th className="px-4 py-2 font-medium">Solicitante</th>
                <th className="px-4 py-2 font-medium">Monto</th>
                <th className="px-4 py-2 font-medium">Plazo</th>
                <th className="px-4 py-2 font-medium">Documentos</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No hay solicitudes para mostrar.
                    <div className="mt-2">
                      <Link className="text-pontifex-600 hover:text-pontifex-700 font-medium" to="/solicitud">
                        Crear una solicitud →
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {rows.map((a) => {
                const total = a?.docsTotal ?? 0
                const uploaded = a?.docsSubidos ?? 0
                return (
                  <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-mono text-slate-800">{a.id?.slice(0, 8)}</td>
                    <td className="px-4 py-2 text-slate-800">{a.razonSocial || a.nombreComercial || '—'}</td>
                    <td className="px-4 py-2 text-slate-800">{formatMoney(a.monto)}</td>
                    <td className="px-4 py-2 text-slate-700">{a.plazoDeseado || '—'}</td>
                    <td className="px-4 py-2 text-slate-700">
                      <span className="font-medium text-slate-800">{uploaded}</span>
                      <span className="text-slate-400">/{total}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => navigate('/solicitud', { state: { solicitudId: a.id } })}
                        className="text-sm font-medium text-pontifex-600 hover:text-pontifex-700"
                      >
                        Abrir →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-slate-500">
        Nota: el botón "Abrir" lleva al flujo actual con los datos precargados de la solicitud seleccionada.
      </div>
    </div>
  )
}

