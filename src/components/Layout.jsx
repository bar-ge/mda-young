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
    to: '/duty',
    label: 'כוננים',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M19 17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2z"/>
        <circle cx="12" cy="11" r="2.5"/>
        <path d="M7 17v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1"/>
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
  '/duty':      'כוננים',
  '/profile':   'פרופיל',
  '/manager':   'ניהול',
}

const roleLabels = {
  admin:      'מנהל',
  dispatcher: 'סדרן',
  volunteer:  'מתנדב',
}

export default function Layout() {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  const isManager = profile?.role === 'admin' || profile?.role === 'dispatcher'
  const nav = isManager
    ? [...volunteerNav.slice(0, 3), managerExtra]
    : volunteerNav

  const title    = pageTitles[location.pathname] || 'מד״א צעירים'
  const initials = profile?.full_name?.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'

  return (
    <CalendarProvider>
      <div className="flex min-h-svh bg-[#f0f2f5]">

        {/* ── Desktop sidebar (left) ── */}
        <aside className="hidden lg:flex flex-col fixed inset-y-0 right-0 w-60 bg-white border-l border-gray-100 shadow-sm z-40">
          {/* Brand */}
          <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-100 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#E30613] flex items-center justify-center shadow-md shadow-red-500/40 shrink-0">
              <svg viewBox="0 0 20 20" fill="white" className="w-5 h-5">
                <polygon points="10,1 2.2,14.5 17.8,14.5"/>
                <polygon points="10,19 2.2,5.5 17.8,5.5"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-sm tracking-tight">מד״א צעירים</span>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
            {nav.map(({ to, label, icon }) => (
              <NavLink key={to} to={to}>
                {({ isActive }) => (
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#E30613]/10 text-[#E30613]'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}>
                    <div className="shrink-0">{icon(isActive)}</div>
                    <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
                    {isActive && (
                      <span className="mr-auto w-1.5 h-1.5 rounded-full bg-[#E30613]" />
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User + sign-out */}
          <div className="px-4 pb-5 pt-3 border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E30613] flex items-center justify-center shadow-sm shadow-red-500/30 shrink-0">
                <span className="text-white font-bold text-xs">{initials}</span>
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-xs font-semibold text-gray-900 truncate">{profile?.full_name}</p>
                <p className="text-[10px] text-gray-400">{roleLabels[profile?.role] || 'מתנדב'}</p>
              </div>
              <button
                onClick={signOut}
                title="התנתק"
                aria-label="התנתק"
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main column ── */}
        <div className="flex-1 lg:mr-60 flex flex-col min-h-svh">

          {/* Mobile header */}
          <header className="lg:hidden glass sticky top-0 z-40 border-b border-gray-100/80 safe-top">
            <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {profile && (
                  <>
                    <div className="w-8 h-8 rounded-full bg-[#E30613] flex items-center justify-center shadow-sm shadow-red-500/30">
                      <span className="text-white font-bold text-xs">{initials}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-500 hidden sm:block">{profile.full_name}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-gray-900 text-sm tracking-tight">מד״א צעירים</span>
                <div className="w-8 h-8 rounded-xl bg-[#E30613] flex items-center justify-center shadow-md shadow-red-500/40">
                  <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
                    <polygon points="10,1 2.2,14.5 17.8,14.5"/>
                    <polygon points="10,19 2.2,5.5 17.8,5.5"/>
                  </svg>
                </div>
              </div>
            </div>
          </header>

          {/* Desktop top bar */}
          <header className="hidden lg:flex sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-8 h-14 items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>מד״א צעירים</span>
              <span>/</span>
              <span className="text-gray-700 font-semibold">{title}</span>
            </div>
            <h1 className="font-bold text-gray-900 text-base">{title}</h1>
          </header>

          {/* Mobile page title */}
          <div className="lg:hidden max-w-lg mx-auto w-full px-4 pt-5 pb-1">
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          </div>

          {/* Content */}
          <main className="flex-1 mx-auto w-full px-4 lg:px-8 pb-28 lg:pb-10 max-w-lg lg:max-w-5xl pt-0 lg:pt-6">
            <Outlet />
          </main>

          {/* Mobile bottom nav */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-gray-100/80 safe-bottom">
            <div className="max-w-lg mx-auto flex h-16 items-stretch">
              {nav.map(({ to, label, icon }) => (
                <NavLink key={to} to={to} className="flex-1">
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
      </div>
    </CalendarProvider>
  )
}
