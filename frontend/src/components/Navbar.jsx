import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-xl">₹</span>
          <span className="text-white font-semibold text-lg">Finance Copilot</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/"       className="text-slate-400 hover:text-white transition-colors">Dashboard</Link>
          <Link to="/import" className="text-slate-400 hover:text-white transition-colors">Import</Link>
          <Link to="/categorize" className="text-slate-400 hover:text-white transition-colors">Categorize</Link>
          <Link to="/analytics" className="text-slate-400 hover:text-white transition-colors">Analytics</Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-slate-400 text-sm">Hi, {user?.name}</span>
        <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-white transition-colors">
          Logout
        </button>
      </div>
    </nav>
  )
}