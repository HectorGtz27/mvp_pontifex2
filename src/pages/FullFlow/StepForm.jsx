/**
 * Step 0 — Formulario de datos de la solicitud (cliente + crédito).
 * Pure presentation: receives all data & callbacks as props.
 */
export default function StepForm({ formData, updateForm, formComplete, savingApp, onSubmit }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Datos de la solicitud</h1>
        <p className="text-slate-600 mt-1">Completa la información de la solicitud. La Razón Social oficial se actualizará al procesar la Constancia de Situación Fiscal.</p>
        {formData.razonSocial && (
          <p className="text-sm text-slate-500 mt-2">Cliente: <strong>{formData.razonSocial}</strong></p>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (formComplete && !savingApp) onSubmit() }}
        className="space-y-6"
      >
        {/* ── Sección 1: Datos del Cliente (Empresa) ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">Datos de la empresa</h2>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p><strong>Nota:</strong> La Razón Social oficial se extraerá de la Constancia de Situación Fiscal. Por ahora, ingresa un nombre temporal para identificar esta solicitud.</p>
          </div>

          <div>
            <label htmlFor="razonSocial" className="block text-sm font-medium text-slate-700 mb-1">
              Nombre del cliente / Identificador temporal
            </label>
            <input id="razonSocial" type="text" value={formData.razonSocial} onChange={(e) => updateForm('razonSocial', e.target.value)} placeholder="Ej. Empresa Verde, Cliente ABC, etc." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
            <p className="text-xs text-slate-500 mt-1">Este nombre te ayudará a identificar la solicitud mientras subes documentos. Se actualizará con la razón social oficial de la Constancia.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="correoElectronico" className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
              <input id="correoElectronico" type="email" value={formData.correoElectronico} onChange={(e) => updateForm('correoElectronico', e.target.value)} placeholder="contacto@empresa.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
            </div>
            <div>
              <label htmlFor="paginaWeb" className="block text-sm font-medium text-slate-700 mb-1">Página web</label>
              <input id="paginaWeb" type="url" value={formData.paginaWeb} onChange={(e) => updateForm('paginaWeb', e.target.value)} placeholder="https://www.empresa.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input id="telefono" type="tel" value={formData.telefono} onChange={(e) => updateForm('telefono', e.target.value)} placeholder="Ej. 55 1234 5678" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
            </div>
            <div>
              <label htmlFor="celular" className="block text-sm font-medium text-slate-700 mb-1">Celular</label>
              <input id="celular" type="tel" value={formData.celular} onChange={(e) => updateForm('celular', e.target.value)} placeholder="Ej. 55 9876 5432" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="numEmpleadosPermanentes" className="block text-sm font-medium text-slate-700 mb-1">Empleados permanentes</label>
              <input id="numEmpleadosPermanentes" type="number" min="0" value={formData.numEmpleadosPermanentes} onChange={(e) => updateForm('numEmpleadosPermanentes', e.target.value)} placeholder="Ej. 25" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
            </div>
            <div>
              <label htmlFor="numEmpleadosEventuales" className="block text-sm font-medium text-slate-700 mb-1">Empleados eventuales</label>
              <input id="numEmpleadosEventuales" type="number" min="0" value={formData.numEmpleadosEventuales} onChange={(e) => updateForm('numEmpleadosEventuales', e.target.value)} placeholder="Ej. 10" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
            </div>
          </div>
        </div>

        {/* ── Sección 2: Datos de la Solicitud de Crédito ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">Solicitud de crédito</h2>

          <div className="grid sm:grid-cols-3 gap-5">
            <div>
              <label htmlFor="monto" className="block text-sm font-medium text-slate-700 mb-1">Monto solicitado *</label>
              <input id="monto" type="number" min="1" value={formData.monto} onChange={(e) => updateForm('monto', e.target.value)} placeholder="Ej. 850000" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
            </div>
            <div>
              <label htmlFor="divisa" className="block text-sm font-medium text-slate-700 mb-1">Divisa</label>
              <select id="divisa" value={formData.divisa} onChange={(e) => updateForm('divisa', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500">
                <option value="MXN">MXN — Peso mexicano</option>
                <option value="USD">USD — Dólar estadounidense</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
            <div>
              <label htmlFor="plazoDeseado" className="block text-sm font-medium text-slate-700 mb-1">Plazo deseado</label>
              <input id="plazoDeseado" type="text" value={formData.plazoDeseado} onChange={(e) => updateForm('plazoDeseado', e.target.value)} placeholder="Ej. 24 meses" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="destino" className="block text-sm font-medium text-slate-700 mb-1">Destino del crédito *</label>
              <input id="destino" type="text" value={formData.destino} onChange={(e) => updateForm('destino', e.target.value)} placeholder="Ej. Capital de trabajo, equipo, infraestructura" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
            </div>
            <div>
              <label htmlFor="tasaObjetivo" className="block text-sm font-medium text-slate-700 mb-1">Tasa objetivo</label>
              <input id="tasaObjetivo" type="text" value={formData.tasaObjetivo} onChange={(e) => updateForm('tasaObjetivo', e.target.value)} placeholder="Ej. TIIE + 4%" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
            </div>
          </div>

          <div>
            <label htmlFor="tipoColateral" className="block text-sm font-medium text-slate-700 mb-1">Tipo de colateral</label>
            <input id="tipoColateral" type="text" value={formData.tipoColateral} onChange={(e) => updateForm('tipoColateral', e.target.value)} placeholder="Ej. Inmueble, aval personal, garantía líquida" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
          </div>
        </div>

        {/* ── Sección 3: Información cuantitativa adicional ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">Información cuantitativa</h2>

          <div className="grid sm:grid-cols-3 gap-5">
            <div>
              <label htmlFor="nivelVentasAnuales" className="block text-sm font-medium text-slate-700 mb-1">Nivel de ventas anuales</label>
              <input id="nivelVentasAnuales" type="number" min="0" value={formData.nivelVentasAnuales} onChange={(e) => updateForm('nivelVentasAnuales', e.target.value)} placeholder="Ej. 5000000" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
            </div>
            <div>
              <label htmlFor="margenRealUtilidad" className="block text-sm font-medium text-slate-700 mb-1">Margen real de utilidad (%)</label>
              <input id="margenRealUtilidad" type="number" step="0.01" min="0" max="100" value={formData.margenRealUtilidad} onChange={(e) => updateForm('margenRealUtilidad', e.target.value)} placeholder="Ej. 12.5" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
            </div>
            <div>
              <label htmlFor="situacionBuroCredito" className="block text-sm font-medium text-slate-700 mb-1">Situación buró de crédito</label>
              <select id="situacionBuroCredito" value={formData.situacionBuroCredito} onChange={(e) => updateForm('situacionBuroCredito', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500">
                <option value="">Seleccionar</option>
                <option value="sin_atrasos">Sin atrasos</option>
                <option value="atrasos_menores">Atrasos menores (1-30 días)</option>
                <option value="atrasos_moderados">Atrasos moderados (31-90 días)</option>
                <option value="cartera_vencida">Cartera vencida (90+ días)</option>
                <option value="sin_historial">Sin historial</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="notas" className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
            <textarea id="notas" rows={2} value={formData.notas} onChange={(e) => updateForm('notas', e.target.value)} placeholder="Información adicional relevante" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500 resize-none" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={!formComplete || savingApp} className="px-5 py-2.5 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {savingApp ? 'Guardando…' : 'Continuar a documentos →'}
          </button>
        </div>
      </form>
    </div>
  )
}
