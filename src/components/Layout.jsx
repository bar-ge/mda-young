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

const messagesNav = {
  to: '/messages',
  label: 'הודעות',
  icon: (active) => (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
}

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
  '/messages':  'הודעות תחנה',
  '/profile':   'פרופיל',
  '/manager':   'ניהול',
}

const roleLabels = {
  admin:      'מנהל',
  dispatcher: 'סדרן',
  volunteer:  'מתנדב',
  driver:     'נהג',
}

// shifts, my-shifts, messages, profile
const volunteerFullNav = [volunteerNav[0], volunteerNav[1], messagesNav, volunteerNav[3]]
// duty, messages, profile
const driverFullNav = [volunteerNav[2], messagesNav, volunteerNav[3]]
// shifts, duty, messages, manager
const managerNav = [volunteerNav[0], volunteerNav[2], messagesNav, managerExtra]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  const role = profile?.role
  const isManager = role === 'admin' || role === 'dispatcher'
  const nav = isManager ? managerNav : role === 'driver' ? driverFullNav : volunteerFullNav

  const title    = pageTitles[location.pathname] || 'מד״א צעירים'
  const initials = profile?.full_name?.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'

  return (
    <CalendarProvider>
      <div className="flex min-h-svh bg-[#f0f2f5]">

        {/* ── Desktop sidebar (left) ── */}
        <aside className="hidden lg:flex flex-col fixed inset-y-0 right-0 w-60 bg-white border-l border-gray-100 shadow-[0_0_40px_rgba(0,0,0,0.06)] z-40">
          {/* Brand */}
          <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-100/80 shrink-0">
            <div className="p-0.5 rounded-[0.65rem] bg-[#E30613]/10 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-[#E30613] flex items-center justify-center shadow-sm shadow-red-500/30">
                <svg viewBox="0 0 20 20" fill="white" className="w-[18px] h-[18px]">
                  <polygon points="10,1 2.2,14.5 17.8,14.5"/>
                  <polygon points="10,19 2.2,5.5 17.8,5.5"/>
                </svg>
              </div>
            </div>
            <div>
              <span className="font-bold text-gray-900 text-sm tracking-tight block">מד״א צעירים</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
            {nav.map(({ to, label, icon }) => (
              <NavLink key={to} to={to}>
                {({ isActive }) => (
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer ${
                    isActive
                      ? 'bg-[#E30613] text-white shadow-sm shadow-red-500/20'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}>
                    <div className="shrink-0">{icon(isActive)}</div>
                    <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User + sign-out */}
          <div className="px-3 pb-4 pt-3 border-t border-gray-100/80 shrink-0">
            <div className="flex items-center gap-2.5 bg-gray-50/80 rounded-xl px-3 py-2.5">
              <div className="p-0.5 rounded-full bg-white shadow-sm shrink-0">
                <div className="w-7 h-7 rounded-full bg-[#E30613] flex items-center justify-center">
                  <span className="text-white font-bold text-[10px]">{initials}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-xs font-semibold text-gray-900 truncate">{profile?.full_name}</p>
                <p className="text-[10px] text-gray-400">{roleLabels[profile?.role] || 'מתנדב'}</p>
              </div>
              <button
                onClick={signOut}
                title="התנתק"
                aria-label="התנתק"
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
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
          <header className="hidden lg:flex sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-100/80 px-8 h-14 items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="font-medium">מד״א צעירים</span>
              <span className="text-gray-200">/</span>
              <span className="text-gray-600 font-semibold">{title}</span>
            </div>
            <h1 className="font-bold text-gray-900 text-base tracking-tight">{title}</h1>
          </header>

          {/* Mobile page title */}
          <div className="lg:hidden max-w-lg mx-auto w-full px-4 pt-5 pb-1">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
          </div>

          {/* Content */}
          <main className="flex-1 mx-auto w-full px-4 lg:px-8 pb-28 lg:pb-10 max-w-lg lg:max-w-5xl pt-0 lg:pt-6">
            <Outlet />
          </main>

          {/* Mobile bottom nav — floating island */}
          <nav
            className="lg:hidden fixed left-4 right-4 z-40"
            style={{ bottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
          >
            <div className="max-w-sm mx-auto">
              <div className="flex h-[58px] items-stretch px-1 bg-white/95 backdrop-blur-xl border border-gray-100/80 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.10),0_2px_8px_rgba(0,0,0,0.05)]">
                {nav.map(({ to, label, icon }) => (
                  <NavLink key={to} to={to} className="flex-1">
                    {({ isActive }) => (
                      <div className={`h-full flex flex-col items-center justify-center gap-0.5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                        isActive ? 'text-[#E30613]' : 'text-gray-400'
                      }`}>
                        <div className={`flex items-center justify-center w-10 h-[30px] rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                          isActive ? 'bg-[#E30613]/10' : ''
                        }`}>
                          {icon(isActive)}
                        </div>
                        <span className={`text-[9px] leading-none transition-all duration-300 ${
                          isActive ? 'font-bold' : 'font-medium'
                        }`}>{label}</span>
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </CalendarProvider>
  )
}
