import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Shifts from './pages/Shifts'
import MyShifts from './pages/MyShifts'
import Duty from './pages/Duty'
import Profile from './pages/Profile'
import Manager from './pages/Manager'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function Splash() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#f0f2f5]">
      <div className="flex flex-col items-center gap-5">
        <div className="w-20 h-20 rounded-3xl bg-[#E30613] flex items-center justify-center shadow-xl shadow-red-500/30">
          <svg viewBox="0 0 48 48" fill="white" className="w-10 h-10">
            <polygon points="24,2 4.95,35 43.05,35"/>
            <polygon points="24,46 4.95,13 43.05,13"/>
          </svg>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-bold text-gray-900 text-lg tracking-tight">מד״א צעירים</span>
          <span className="text-xs text-gray-400">טוען...</span>
        </div>
        <div className="w-6 h-6 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/shifts" replace />} />
            <Route path="shifts"    element={<Shifts />} />
            <Route path="my-shifts" element={<MyShifts />} />
            <Route path="duty"      element={<Duty />} />
            <Route path="manager"   element={<Manager />} />
            <Route path="profile"   element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/shifts" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
