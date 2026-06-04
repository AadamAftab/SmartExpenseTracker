import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Import from './pages/Import'
import Categorize from './pages/Categorize'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Loading...</div>
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/"         element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/import" element={<PrivateRoute><Import /></PrivateRoute>} />
          <Route path="/categorize" element={<PrivateRoute><Categorize /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}