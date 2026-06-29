import { Link } from 'react-router-dom'

const BG_STYLE = {
  background: 'linear-gradient(150deg, #E30613 0%, #a50010 55%, #6b0009 100%)',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='1.2' fill='white' fill-opacity='0.10'/%3E%3C/svg%3E"), linear-gradient(150deg, #E30613 0%, #a50010 55%, #6b0009 100%)`,
  backgroundSize: '24px 24px, 100% 100%',
}

export default function Landing() {
  return (
    <div dir="rtl" className="min-h-svh flex flex-col" style={BG_STYLE}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 pt-6">
        <Link to="/login"
          className="px-5 py-2 bg-white/15 hover:bg-white/25 text-white text-sm font-bold rounded-full border border-white/20 transition-all duration-200 active:scale-[0.97]">
          כניסה למערכת
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
            <svg viewBox="0 0 48 48" fill="white" className="w-4 h-4">
              <polygon points="24,2 4.95,35 43.05,35"/>
              <polygon points="24,46 4.95,13 43.05,13"/>
            </svg>
          </div>
          <span className="text-white font-bold text-sm tracking-tight">מד״א</span>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 gap-8">

        {/* Logo */}
        <div className="p-2 rounded-[2rem] bg-white/15 ring-1 ring-white/30 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <div className="w-24 h-24 rounded-[calc(2rem-8px)] bg-white flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
            <svg viewBox="0 0 48 48" fill="#E30613" className="w-12 h-12">
              <polygon points="24,2 4.95,35 43.05,35"/>
              <polygon points="24,46 4.95,13 43.05,13"/>
            </svg>
          </div>
        </div>

        <div className="flex flex-col gap-3 max-w-sm">
          <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
            מערכת ניהול<br/>משמרות מתנדבים
          </h1>
          <p className="text-white/70 text-base leading-relaxed">
            פלטפורמה לניהול ותיאום משמרות, אירועים ושיבוצי מתנדבי מד״א — מהירה, נגישה ומותאמת לנייד.
          </p>
        </div>

        <Link to="/login"
          className="px-8 py-4 bg-white text-[#E30613] font-black text-base rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          כניסה למערכת ←
        </Link>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs mt-4">
          {[
            { icon: '📅', label: 'ניהול משמרות' },
            { icon: '⭐', label: 'תיאום אירועים' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 bg-white/10 border border-white/15 rounded-2xl py-4 px-2">
              <span className="text-2xl">{icon}</span>
              <span className="text-white/80 text-[11px] font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-center gap-4 pb-8 text-white/40 text-xs">
        <Link to="/privacy" className="hover:text-white/70 transition-colors">מדיניות פרטיות</Link>
        <span>·</span>
        <Link to="/terms" className="hover:text-white/70 transition-colors">תנאי שימוש</Link>
        <span>·</span>
        <span>מד״א © {new Date().getFullYear()}</span>
      </footer>

    </div>
  )
}
