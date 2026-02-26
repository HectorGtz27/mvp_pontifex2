import { Routes, Route, Link, Navigate } from 'react-router-dom'
import FullFlow from './pages/FullFlow'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-pontifex-600 flex items-center justify-center text-white font-semibold text-sm">P</div>
            <span className="font-semibold text-slate-800">Pontifex</span>
          </Link>
          <span className="text-sm text-slate-500">Flujo completo: Documentos → Decisión → Covenants</span>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<FullFlow />} />
          <Route path="/documentos" element={<Navigate to="/" replace />} />
          <Route path="/decision" element={<Navigate to="/" replace />} />
          <Route path="/covenants" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-slate-500 text-sm">
        Pontifex — Mockup · Financiación del desarrollo sostenible
      </footer>
    </div>
  )
}

export default App
