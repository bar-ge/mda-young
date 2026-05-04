import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const volunteerNav = [
  {
    to: '/shifts',
    label: 'משמרות',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
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
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'פרופיל',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

const managerExtra = {
  to: '/manager',
  label: 'ניהול',
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
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

  return (
    <div className="flex flex-col min-h-svh bg-[#f4f5f7]">
      {/* Header */}
      <header className="glass sticky top-0 z-40 border-b border-gray-100 safe-top">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {profile && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 hidden sm:block">{profile.full_name}</span>
                <div className="w-8 h-8 rounded-full bg-[#E30613]/10 flex items-center justify-center">
                  <span className="text-[#E30613] font-semibold text-xs">
                    {profile.full_name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-gray-900 text-sm">מד״א צעירים</span>
            <div className="w-8 h-8 rounded-lg bg-[#E30613] flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">מ</span>
            </div>
          </div>
        </div>
      </header>

      {/* Page title */}
      <div className="max-w-lg mx-auto w-full px-4 pt-5 pb-1">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-24">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-gray-100 safe-bottom">
        <div className="max-w-lg mx-auto flex">
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${
                  isActive ? 'text-[#E30613]' : 'text-gray-400'
                }`
              }
            >
              {icon}
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
