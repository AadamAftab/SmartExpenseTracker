import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-emerald-400 text-xl">₹</span>
        <span className="text-white font-semibold text-lg">Finance Copilot</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-slate-400 text-sm">Hi, {user?.name}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}