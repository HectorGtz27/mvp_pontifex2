import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchClientes } from '../utils/api'

function formatDate(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(iso))
}

function formatMoney(mxn) {
  if (typeof mxn !== 'number' || Number.isNaN(mxn)) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(mxn)
}

const ESTATUS_COLORS = {
  borrador: 'bg-slate-100 text-slate-600',
  en_revision: 'bg-yellow-50 text-yellow-700',
  aprobada: 'bg-green-50 text-green-700',
  rechazada: 'bg-red-50 text-red-700',
  cancelada: 'bg-slate-100 text-slate-500',
}

export default function AdminClientes() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const [expanded, setExpanded] = useState(null)

  const filteredQuery = useMemo(() => query.trim(), [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchClientes({ q: filteredQuery, limit: 100, offset: 0 })
      .then((data) => {
        if (cancelled) return
        setRows(Array.isArray(data) ? data : [])
      })
      .catch((e) => {
        if (cancelled) return
        setError(e?.message || 'No se pudo cargar la lista de clientes.')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [filteredQuery])

  function toggleExpand(id) {
    setExpanded((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-600 mt-1">
            Directorio de empresas registradas y sus solicitudes asociadas.
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

      {/* Search bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex-1">
          <label htmlFor="q-clientes" className="sr-only">Buscar</label>
          <input
            id="q-clientes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por razón social, nombre comercial o RFC…"
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-medium text-slate-800">Clientes registrados</span>
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
                <th className="px-4 py-2 font-medium w-6"></th>
                <th className="px-4 py-2 font-medium">Razón social</th>
                <th className="px-4 py-2 font-medium">RFC</th>
                <th className="px-4 py-2 font-medium">Ciudad / Estado</th>
                <th className="px-4 py-2 font-medium">Contacto</th>
                <th className="px-4 py-2 font-medium">Solicitudes</th>
                <th className="px-4 py-2 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    No hay clientes para mostrar.
                    <div className="mt-2">
                      <Link className="text-pontifex-600 hover:text-pontifex-700 font-medium" to="/solicitud">
                        Crear primera solicitud →
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {rows.map((c) => {
                const isOpen = expanded === c.id
                const nombreMostrado = c.razonSocial || c.nombreComercial || '—'
                const ubicacion = [c.ciudad, c.estado].filter(Boolean).join(', ') || '—'

                return (
                  <>
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer"
                      onClick={() => toggleExpand(c.id)}
                    >
                      {/* expand toggle */}
                      <td className="px-4 py-3 text-slate-400 select-none">
                        <span className="text-xs">{isOpen ? '▾' : '▸'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{nombreMostrado}</div>
                        {c.nombreComercial && c.nombreComercial !== c.razonSocial && (
                          <div className="text-xs text-slate-400">{c.nombreComercial}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">{c.rfc || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{ubicacion}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {c.correoElectronico && (
                          <div className="truncate max-w-[180px]">{c.correoElectronico}</div>
                        )}
                        {c.telefono && (
                          <div className="text-xs text-slate-400">{c.telefono}</div>
                        )}
                        {!c.correoElectronico && !c.telefono && '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            c.solicitudes?.length > 0 ? 'bg-pontifex-50 text-pontifex-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {c.solicitudes?.length ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                    </tr>

                    {/* expanded solicitudes */}
                    {isOpen && (
                      <tr key={`${c.id}-detail`} className="bg-slate-50 border-b border-slate-200">
                        <td colSpan={7} className="px-8 py-3">
                          {c.solicitudes?.length === 0 ? (
                            <p className="text-slate-500 text-sm">Este cliente no tiene solicitudes registradas.</p>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                Solicitudes asociadas
                              </p>
                              <div className="flex flex-col gap-1">
                                {c.solicitudes.map((s) => (
                                  <div
                                    key={s.id}
                                    className="flex items-center gap-4 bg-white rounded-lg border border-slate-200 px-4 py-2 text-sm"
                                  >
                                    <span className="font-mono text-slate-500 text-xs w-20 shrink-0">
                                      {s.id?.slice(0, 8)}
                                    </span>
                                    <span className="text-slate-700 flex-1">{formatMoney(s.monto)}</span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        ESTATUS_COLORS[s.estatus] || 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {s.estatus?.replace('_', ' ') || '—'}
                                    </span>
                                    <span className="text-slate-400 text-xs">{formatDate(s.createdAt)}</span>
                                    <Link
                                      to="/solicitud"
                                      state={{ solicitudId: s.id }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-pontifex-600 hover:text-pontifex-700 font-medium text-xs"
                                    >
                                      Abrir →
                                    </Link>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
