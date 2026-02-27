import { useState, useEffect } from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import FullFlow from './pages/FullFlow'
import Login from './pages/Login'

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('pontifex_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {
      // ignore storage errors in prototype
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    try {
      window.localStorage.setItem('pontifex_user', JSON.stringify(userData))
    } catch {
      // ignore
    }
  }

  const handleLogout = () => {
    setUser(null)
    try {
      window.localStorage.removeItem('pontifex_user')
    } catch {
      // ignore
    }
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-pontifex-600 flex items-center justify-center text-white font-semibold text-sm">P</div>
            <span className="font-semibold text-slate-800">Pontifex</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm text-slate-600">
              Sesión: <span className="font-medium text-slate-800">{user.name}</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 py-1.5 text-xs sm:text-sm rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<FullFlow user={user} />} />
          <Route path="/documentos" element={<Navigate to="/" replace />} />
          <Route path="/decision" element={<Navigate to="/" replace />} />
          <Route path="/covenants" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-slate-500 text-sm">
        Pontifex Financiación del desarrollo sostenible
      </footer>
    </div>
  )
}

export default App
