import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CalendarProvider } from '../contexts/CalendarContext'

const volunteerNav = [
  {
    to: '/shifts',
    label: 'משמרות',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    to: '/my-shifts',
    label: 'המשמרות שלי',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'פרופיל',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

const managerExtra = {
  to: '/manager',
  label: 'ניהול',
  icon: (active) => (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
}

const pageTitles = {
  '/shifts':    'משמרות',
  '/my-shifts': 'המשמרות שלי',
  '/profile':   'פרופיל',
  '/manager':   'ניהול',
}

export default function Layout() {
  const { profile } = useAuth()
  const location = useLocation()

  const isManager = profile?.role === 'admin' || profile?.role === 'dispatcher'
  const nav = isManager
    ? [...volunteerNav.slice(0, 2), managerExtra, volunteerNav[2]]
    : volunteerNav

  const title = pageTitles[location.pathname] || 'מד״א צעירים'
  const initials = profile?.full_name?.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'

  return (
    <CalendarProvider>
    <div className="flex flex-col min-h-svh bg-[#f0f2f5]">
      {/* Header */}
      <header className="glass sticky top-0 z-40 border-b border-gray-100/80 safe-top">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          {/* User avatar - left (RTL: visual left = end) */}
          <div className="flex items-center gap-2.5">
            {profile && (
              <>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E30613] to-[#9b000b] flex items-center justify-center shadow-sm shadow-red-500/30">
                  <span className="text-white font-bold text-xs">{initials}</span>
                </div>
                <span className="text-xs font-medium text-gray-500 hidden sm:block">{profile.full_name}</span>
              </>
            )}
          </div>

          {/* Brand - right (RTL: visual right = start) */}
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-gray-900 text-sm tracking-tight">מד״א צעירים</span>
            <div className="w-8 h-8 rounded-xl bg-[#E30613] flex items-center justify-center shadow-md shadow-red-500/40">
              {/* Medical cross */}
              <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
                <rect x="7" y="1" width="6" height="18" rx="1.5"/>
                <rect x="1" y="7" width="18" height="6" rx="1.5"/>
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* Page title */}
      <div className="max-w-lg mx-auto w-full px-4 pt-5 pb-1">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-28">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-gray-100/80 safe-bottom">
        <div className="max-w-lg mx-auto flex h-16 items-stretch">
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className="flex-1"
            >
              {({ isActive }) => (
                <div className={`h-full flex flex-col items-center justify-center gap-0.5 relative transition-all duration-200 ${
                  isActive ? 'text-[#E30613]' : 'text-gray-400'
                }`}>
                  {isActive && (
                    <span className="absolute top-0 inset-x-4 h-0.5 rounded-b-full bg-[#E30613]" />
                  )}
                  <div className={`flex items-center justify-center w-11 h-7 rounded-2xl transition-all duration-200 ${
                    isActive ? 'bg-[#E30613]/10' : ''
                  }`}>
                    {icon(isActive)}
                  </div>
                  <span className={`text-[10px] transition-all duration-200 ${
                    isActive ? 'font-bold' : 'font-medium'
                  }`}>{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
    </CalendarProvider>
  )
}
