import { useNavigate } from 'react-router-dom'

function Landing() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800">Bienvenido a Pontifex</h1>
        <p className="mt-2 text-slate-500 text-lg">¿Qué deseas hacer?</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        {/* Crear solicitud */}
        <button
          onClick={() => navigate('/solicitud')}
          className="flex-1 flex flex-col items-center gap-4 bg-pontifex-600 hover:bg-pontifex-700 text-white rounded-2xl px-8 py-12 shadow-md transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold">Crear solicitud</p>
            <p className="text-sm text-white/75 mt-1">Inicia un nuevo análisis crediticio</p>
          </div>
        </button>

        {/* Administrar solicitudes */}
        <button
          disabled
          className="flex-1 flex flex-col items-center gap-4 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl px-8 py-12 shadow-md border border-slate-200 transition-all duration-150 cursor-not-allowed opacity-60"
        >
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold">Administrar solicitudes</p>
            <p className="text-sm text-slate-400 mt-1">Próximamente disponible</p>
          </div>
        </button>
      </div>
    </div>
  )
}

export default Landing
