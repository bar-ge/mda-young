import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Shifts from './pages/Shifts'
import MyShifts from './pages/MyShifts'
import Profile from './pages/Profile'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function Splash() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#E30613] flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-2xl">מ</span>
        </div>
        <div className="w-6 h-6 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/shifts" replace />} />
            <Route path="shifts" element={<Shifts />} />
            <Route path="my-shifts" element={<MyShifts />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/shifts" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
