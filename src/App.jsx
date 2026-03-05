import { Routes, Route, Link, Navigate } from 'react-router-dom'
import FullFlow from './pages/FullFlow'
import Landing from './pages/Landing'
import AdminSolicitudes from './pages/AdminSolicitudes'
import PontifexLogo from '../public/pontifex_logo.png'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80 focus:opacity-80 focus:outline-none"
            aria-label="Ir al inicio"
          >
            <img
              src={PontifexLogo}
              alt="Pontifex"
              className="h-12 w-auto"
            />
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/solicitud" element={<FullFlow />} />
          <Route path="/solicitudes" element={<AdminSolicitudes />} />
          <Route path="/documentos" element={<Navigate to="/" replace />} />
          <Route path="/decision" element={<Navigate to="/" replace />} />
          <Route path="/covenants" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
