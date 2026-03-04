import { useEffect, useState, useCallback } from 'react'
import { fetchBancos, createBanco, updateBanco } from '../utils/api'

// ─── Definición de los 7 pilares ────────────────────────────────────────────

const PILARES = [
  {
    key: 'cobertura',
    label: 'Cobertura',
    color: 'blue',
    campos: [
      { key: 'cob_local',    label: 'Local (L)' },
      { key: 'cob_estatal',  label: 'Estatal (E)' },
      { key: 'cob_regional', label: 'Regional (R)' },
      { key: 'cob_nacional', label: 'Nacional (N)' },
    ],
  },
  {
    key: 'producto',
    label: 'Producto',
    color: 'violet',
    campos: [
      { key: 'prod_credito_simple',     label: 'Crédito Simple' },
      { key: 'prod_credito_revolvente', label: 'Crédito Revolvente' },
      { key: 'prod_factoraje',          label: 'Factoraje' },
      { key: 'prod_arrendamiento',      label: 'Arrendamiento' },
    ],
  },
  {
    key: 'experiencia',
    label: 'Experiencia',
    color: 'amber',
    campos: [
      { key: 'exp_menor_1_anio', label: '< 1 año' },
      { key: 'exp_1_anio',       label: '1 año' },
      { key: 'exp_2_mas_anios',  label: '2+ años' },
    ],
  },
  {
    key: 'sector',
    label: 'Sector Empresarial',
    color: 'emerald',
    campos: [
      { key: 'sec_comercio',  label: 'Comercio' },
      { key: 'sec_industria', label: 'Industria' },
      { key: 'sec_servicio',  label: 'Servicio' },
      { key: 'sec_primario',  label: 'Primario' },
    ],
  },
  {
    key: 'buro',
    label: 'Solvencia Moral (Buró)',
    color: 'rose',
    campos: [
      { key: 'buro_excelente', label: 'Excelente MOP 0' },
      { key: 'buro_bueno',     label: 'Bueno MOP 01,0' },
      { key: 'buro_regular',   label: 'Regular MOP 01,02,0' },
      { key: 'buro_malo',      label: 'Mal Buró' },
    ],
  },
  {
    key: 'garantias',
    label: 'Fincabilidad (Garantías)',
    color: 'orange',
    campos: [
      { key: 'gar_aval',                 label: 'Aval / Obligado solidario' },
      { key: 'gar_relacion_patrimonial', label: 'Relación Patrimonial' },
      { key: 'gar_hipotecaria',          label: 'Hipotecaria' },
      { key: 'gar_prendaria',            label: 'Prendaria' },
      { key: 'gar_liquidez',             label: 'Liquidez' },
      { key: 'gar_contrato',             label: 'Contrato' },
    ],
  },
  {
    key: 'solvencia',
    label: 'Solvencia Financiera',
    color: 'cyan',
    campos: [
      { key: 'solv_utilidad',        label: 'Utilidad' },
      { key: 'solv_perdida',         label: 'Pérdida' },
      { key: 'solv_quiebra_tecnica', label: 'Quiebra Técnica' },
    ],
  },
]

const COLOR_STYLES = {
  blue:    { pill: 'bg-blue-100 text-blue-700',    badge: 'bg-blue-50 border-blue-200 text-blue-700',   dot: 'bg-blue-500'   },
  violet:  { pill: 'bg-violet-100 text-violet-700', badge: 'bg-violet-50 border-violet-200 text-violet-700', dot: 'bg-violet-500' },
  amber:   { pill: 'bg-amber-100 text-amber-700',  badge: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-500'  },
  emerald: { pill: 'bg-emerald-100 text-emerald-700', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
  rose:    { pill: 'bg-rose-100 text-rose-700',    badge: 'bg-rose-50 border-rose-200 text-rose-700',   dot: 'bg-rose-500'   },
  orange:  { pill: 'bg-orange-100 text-orange-700', badge: 'bg-orange-50 border-orange-200 text-orange-700', dot: 'bg-orange-500' },
  cyan:    { pill: 'bg-cyan-100 text-cyan-700',    badge: 'bg-cyan-50 border-cyan-200 text-cyan-700',   dot: 'bg-cyan-500'   },
}

// ─── Estado vacío para formulario nuevo ──────────────────────────────────────

const EMPTY_BANCO = {
  id: '', nombre: '', activo: true,
  cob_local: false, cob_estatal: false, cob_regional: false, cob_nacional: false,
  prod_credito_simple: false, prod_credito_revolvente: false, prod_factoraje: false, prod_arrendamiento: false,
  exp_menor_1_anio: false, exp_1_anio: false, exp_2_mas_anios: false,
  sec_comercio: false, sec_industria: false, sec_servicio: false, sec_primario: false,
  buro_excelente: false, buro_bueno: false, buro_regular: false, buro_malo: false,
  gar_aval: false, gar_relacion_patrimonial: false, gar_hipotecaria: false,
  gar_prendaria: false, gar_liquidez: false, gar_contrato: false,
  solv_utilidad: false, solv_perdida: false, solv_quiebra_tecnica: false,
}

// ─── Componente chip de condición ────────────────────────────────────────────

function CondChip({ label, color }) {
  const s = COLOR_STYLES[color]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.pill}`}>
      {label}
    </span>
  )
}

// ─── Resumen de condiciones activas de un pilar ───────────────────────────────

function PilarResumen({ pilar, banco }) {
  const activos = pilar.campos.filter(c => banco[c.key])
  const s = COLOR_STYLES[pilar.color]
  if (activos.length === 0) {
    return <span className="text-xs text-slate-300 italic">—</span>
  }
  if (activos.length === pilar.campos.length) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.pill}`}>
        Todos
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1">
      {activos.map(c => (
        <span key={c.key} className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full ${s.pill}`}>
          {c.label}
        </span>
      ))}
    </div>
  )
}

// ─── Panel lateral de edición / creación ─────────────────────────────────────

function BancoDrawer({ banco, onClose, onSaved }) {
  const isNew = !banco.id || banco._isNew
  const [form, setForm] = useState(() => ({ ...EMPTY_BANCO, ...banco }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const toggle = (key) => setForm(f => ({ ...f, [key]: !f[key] }))
  const setVal = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError('El nombre del banco es requerido.'); return }
    if (isNew && !form.id.trim()) { setError('El ID es requerido (ej: santander_pyme).'); return }
    setSaving(true)
    setError(null)
    try {
      const { _isNew, ...payload } = form
      const saved = isNew
        ? await createBanco(payload)
        : await updateBanco(form.id, payload)
      onSaved(saved)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-20 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-30 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isNew ? '+ Nuevo banco' : `Editar: ${banco.nombre}`}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Configura los 7 pilares de condición del banco</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none px-2"
          >×</button>
        </div>

        {/* Formulario scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Datos básicos */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Datos generales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del banco *</label>
                <input
                  value={form.nombre}
                  onChange={e => setVal('nombre', e.target.value)}
                  placeholder="Ej: SANTANDER PyME / EMPRESAS"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  ID único *{!isNew && <span className="text-slate-400 ml-1">(no editable)</span>}
                </label>
                <input
                  value={form.id}
                  onChange={e => setVal('id', e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
                  placeholder="ej: santander_pyme"
                  disabled={!isNew}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggle('activo')}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.activo ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.activo ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-slate-700">Banco activo</span>
            </div>
          </div>

          {/* Pilares */}
          {PILARES.map(pilar => {
            const s = COLOR_STYLES[pilar.color]
            const activos = pilar.campos.filter(c => form[c.key]).length
            return (
              <div key={pilar.key} className={`rounded-xl border p-4 space-y-3 ${s.badge}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{pilar.label}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.pill}`}>
                    {activos}/{pilar.campos.length} seleccionados
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {pilar.campos.map(campo => (
                    <label
                      key={campo.key}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={!!form[campo.key]}
                          onChange={() => toggle(campo.key)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded border-2 transition-colors flex items-center justify-center
                          ${form[campo.key]
                            ? `${s.dot} border-transparent`
                            : 'border-slate-300 bg-white group-hover:border-slate-400'
                          }`}>
                          {form[campo.key] && (
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-slate-700 group-hover:text-slate-900">{campo.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3 bg-white">
          {error && <p className="text-sm text-rose-600 flex-1">{error}</p>}
          {!error && <div className="flex-1" />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-pontifex-600 text-white text-sm font-medium hover:bg-pontifex-700 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : isNew ? 'Crear banco' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function AdminBancos() {
  const [bancos, setBancos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [drawerBanco, setDrawerBanco] = useState(null) // null = cerrado
  const [pilarFiltro, setPilarFiltro] = useState(null) // pilar seleccionado para ver columna

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchBancos()
      .then(data => setBancos(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const onSaved = useCallback((saved) => {
    setBancos(prev => {
      const idx = prev.findIndex(b => b.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = saved; return next
      }
      return [...prev, saved]
    })
    setDrawerBanco(null)
  }, [])

  const bancosFiltrados = bancos.filter(b =>
    b.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    b.id.toLowerCase().includes(busqueda.toLowerCase())
  )

  // Conteo de condiciones activas por banco (todos los campos boolean)
  const countActivos = (banco) => PILARES.reduce(
    (sum, p) => sum + p.campos.filter(c => banco[c.key]).length, 0
  )
  const totalCondiciones = PILARES.reduce((s, p) => s + p.campos.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bancos con convenio</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Gestiona las instituciones financieras y sus condiciones por los 7 pilares de evaluación.
          </p>
        </div>
        <button
          onClick={() => setDrawerBanco({ ...EMPTY_BANCO, _isNew: true })}
          className="px-4 py-2.5 bg-pontifex-600 text-white rounded-lg text-sm font-medium hover:bg-pontifex-700 flex items-center gap-2"
        >
          <span className="text-base leading-none">+</span> Nuevo banco
        </button>
      </div>

      {/* Buscador + stats */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" />
          </svg>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar banco…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500"
          />
        </div>
        <div className="flex gap-3 text-sm text-slate-500">
          <span className="bg-slate-100 px-3 py-1.5 rounded-lg">
            <strong className="text-slate-800">{bancos.filter(b => b.activo).length}</strong> activos
          </span>
          <span className="bg-slate-100 px-3 py-1.5 rounded-lg">
            <strong className="text-slate-800">{bancos.length}</strong> total
          </span>
        </div>
      </div>

      {/* Error / loading */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm flex items-center gap-2">
          <span>⚠</span> {error}
          <button onClick={load} className="ml-auto underline text-rose-600">Reintentar</button>
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-slate-400">
          <div className="inline-block w-8 h-8 border-2 border-slate-200 border-t-pontifex-500 rounded-full animate-spin mb-3" />
          <p>Cargando bancos…</p>
        </div>
      )}

      {/* Tabla de bancos */}
      {!loading && !error && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Filtro de pilar para columna de detalle */}
          <div className="px-4 pt-4 pb-2 border-b border-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 mr-1">Ver pilar:</span>
            <button
              onClick={() => setPilarFiltro(null)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${pilarFiltro === null ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Resumen
            </button>
            {PILARES.map(p => {
              const s = COLOR_STYLES[p.color]
              const isActive = pilarFiltro?.key === p.key
              return (
                <button
                  key={p.key}
                  onClick={() => setPilarFiltro(isActive ? null : p)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${isActive ? `${s.pill} border-transparent` : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          {bancosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No se encontraron bancos{busqueda ? ` para "${busqueda}"` : ''}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-3 font-medium text-slate-600 sticky left-0 bg-slate-50 z-10 min-w-48">Institución</th>
                    {pilarFiltro
                      ? pilarFiltro.campos.map(c => (
                          <th key={c.key} className="px-3 py-3 font-medium text-slate-600 text-center min-w-28 whitespace-nowrap">
                            {c.label}
                          </th>
                        ))
                      : PILARES.map(p => (
                          <th key={p.key} className="px-3 py-3 font-medium text-slate-600 min-w-44">
                            {p.label}
                          </th>
                        ))
                    }
                    <th className="px-3 py-3 font-medium text-slate-600 text-center">Cobertura</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bancosFiltrados.map(banco => {
                    const activos = countActivos(banco)
                    const pct = Math.round((activos / totalCondiciones) * 100)
                    return (
                      <tr key={banco.id} className="hover:bg-slate-50 transition-colors">
                        {/* Nombre */}
                        <td className="px-4 py-3 sticky left-0 bg-white hover:bg-slate-50 z-10">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0
                              ${banco.activo ? 'bg-pontifex-600' : 'bg-slate-300'}`}>
                              {banco.nombre.charAt(0)}
                            </div>
                            <div>
                              <p className={`font-medium leading-tight ${banco.activo ? 'text-slate-900' : 'text-slate-400'}`}>
                                {banco.nombre}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <div className="flex h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="bg-pontifex-500 h-full rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-400">{activos}/{totalCondiciones}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* columnas según filtro */}
                        {pilarFiltro
                          ? pilarFiltro.campos.map(c => {
                              const s = COLOR_STYLES[pilarFiltro.color]
                              return (
                                <td key={c.key} className="px-3 py-3 text-center">
                                  {banco[c.key]
                                    ? <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs ${s.dot}`}>✓</span>
                                    : <span className="text-slate-200 text-lg">—</span>
                                  }
                                </td>
                              )
                            })
                          : PILARES.map(pilar => (
                              <td key={pilar.key} className="px-3 py-3">
                                <PilarResumen pilar={pilar} banco={banco} />
                              </td>
                            ))
                        }

                        {/* Cobertura breve */}
                        <td className="px-3 py-3">
                          <div className="flex gap-1 justify-center flex-wrap">
                            {banco.cob_local    && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">L</span>}
                            {banco.cob_estatal  && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">E</span>}
                            {banco.cob_regional && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">R</span>}
                            {banco.cob_nacional && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">N</span>}
                          </div>
                        </td>

                        {/* Acción editar */}
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => setDrawerBanco(banco)}
                            className="text-sm text-pontifex-600 hover:text-pontifex-800 font-medium px-2 py-1 rounded hover:bg-pontifex-50"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Drawer de creación / edición */}
      {drawerBanco && (
        <BancoDrawer
          banco={drawerBanco}
          onClose={() => setDrawerBanco(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
