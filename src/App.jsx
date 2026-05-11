import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Component } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Shifts from './pages/Shifts'
import MyShifts from './pages/MyShifts'
import Duty from './pages/Duty'
import Profile from './pages/Profile'
import Manager from './pages/Manager'
import Messages from './pages/Messages'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#f0f2f5]">
          <div className="flex flex-col items-center gap-5 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-[#E30613]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#E30613]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-bold text-gray-900 text-base">משהו השתבש</p>
              <p className="text-sm text-gray-400">רענן את הדף כדי להמשיך</p>
            </div>
            <button onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-[#E30613] text-white text-sm font-semibold rounded-xl shadow-sm shadow-red-500/20 active:scale-[0.98] transition-all">
              רענון
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

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
    <ErrorBoundary>
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
            <Route path="messages"  element={<Messages />} />
            <Route path="manager"   element={<Manager />} />
            <Route path="profile"   element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/shifts" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
    </ErrorBoundary>
  )
}
