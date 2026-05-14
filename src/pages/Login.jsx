import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/* ─── Static data ─── */
const BG_STYLE = {
  background: 'linear-gradient(150deg, #E30613 0%, #a50010 55%, #6b0009 100%)',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='1.2' fill='white' fill-opacity='0.12'/%3E%3C/svg%3E"), linear-gradient(150deg, #E30613 0%, #a50010 55%, #6b0009 100%)`,
  backgroundSize: '24px 24px, 100% 100%',
}

const BD_DAYS   = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))
const BD_MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const BD_YEARS  = Array.from(
  { length: new Date().getFullYear() - 1950 - 13 },
  (_, i) => String(new Date().getFullYear() - 14 - i)
)

const INPUT     = "w-full px-4 py-3 rounded-2xl border border-gray-200 text-gray-900 placeholder-gray-300 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all duration-200 text-right"
const INPUT_LTR = "w-full px-4 py-3 rounded-2xl border border-gray-200 text-gray-900 placeholder-gray-300 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all duration-200 text-left"
const BTN_RED   = "w-full py-3.5 bg-[#E30613] text-white font-bold rounded-2xl shadow-lg shadow-red-600/30 hover:bg-[#c0000f] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50 text-sm"
const BTN_GHOST = "flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-2xl text-sm hover:bg-gray-50 active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"

/* ─── Small helpers ─── */
function Spinner({ label }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      {label}
    </span>
  )
}

function ErrorBanner({ msg }) {
  if (!msg) return null
  return (
    <div className="flex items-center justify-end gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
      {msg}
      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    </div>
  )
}

function StepDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all duration-300 ${
          i + 1 === current ? 'w-6 h-2 bg-[#E30613]' :
          i + 1 < current   ? 'w-2 h-2 bg-[#E30613]/35' :
                              'w-2 h-2 bg-gray-200'
        }`} />
      ))}
    </div>
  )
}

function EyeIcon({ open }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

/* ─── Password box (reused in step 2 + success) ─── */
function PwdBox({ pwd, copied, onCopy, compact }) {
  if (!pwd) return (
    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 text-center">
      <p className="text-xs text-gray-400">תאריך הלידה שלך יהפוך לסיסמה</p>
    </div>
  )
  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-2xl ${compact ? 'p-3' : 'p-4'} flex flex-col gap-2`}>
      <p className="text-xs font-semibold text-amber-700 text-right flex items-center justify-end gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        הסיסמה שלך לכניסה
      </p>
      <div className="flex items-center gap-2">
        <button onClick={onCopy}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
            copied ? 'bg-emerald-500 text-white' : 'bg-amber-200 text-amber-800 hover:bg-amber-300'
          }`}>
          {copied ? '✓ הועתק' : 'העתק'}
        </button>
        <span dir="ltr" className={`flex-1 font-mono font-black text-amber-900 tracking-widest text-center ${compact ? 'text-xl' : 'text-2xl'}`}>
          {pwd}
        </span>
      </div>
      {!compact && <p className="text-[10px] text-amber-600 text-center">שמור! תצטרך אותה בכל כניסה — פורמט DDMMYYYY</p>}
    </div>
  )
}

/* ─── Main component ─── */
export default function Login() {
  const { user } = useAuth()

  // mode: 'login' | 'signup' | 'forgot' | 'sent' | 'success'
  const [mode,    setMode]    = useState('login')
  const [step,    setStep]    = useState(1)
  const [dir,     setDir]     = useState('right')
  const [showPwd, setShowPwd] = useState(false)
  const [copied,  setCopied]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [form,    setForm]    = useState({
    email: '', password: '',
    full_name: '', phone: '',
    birth_day: '', birth_month: '', birth_year: '',
  })

  if (user) return <Navigate to="/" replace />

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); setError('') }

  function switchMode(m) { setMode(m); setStep(1); setDir('right'); setError('') }

  function goStep(n) {
    setDir(n > step ? 'right' : 'left')
    setStep(n)
    setError('')
  }

  const signupPwd = form.birth_day && form.birth_month && form.birth_year
    ? `${form.birth_day}${form.birth_month}${form.birth_year}`
    : ''

  const birthISO = form.birth_day && form.birth_month && form.birth_year
    ? `${form.birth_year}-${form.birth_month}-${form.birth_day}`
    : ''

  async function copyPwd() {
    try { await navigator.clipboard.writeText(signupPwd) } catch { }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  /* ── Login ── */
  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (err) setError(
      err.message.includes('Invalid login') ? 'אימייל או סיסמה שגויים' :
      err.message.includes('Email not confirmed') ? 'אנא אמת את האימייל שלך תחילה' :
      'שגיאה בכניסה — נסה שנית'
    )
    setLoading(false)
  }

  /* ── Forgot password ── */
  async function handleForgot(e) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('נא להזין כתובת אימייל תקינה'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: window.location.origin,
    })
    if (err) { setError('שגיאה בשליחת המייל'); setLoading(false); return }
    setMode('sent')
    setLoading(false)
  }

  /* ── Signup step validation ── */
  function validateStep() {
    if (step === 1) {
      if (!form.full_name.trim() || form.full_name.trim().length < 2) { setError('נא להזין שם מלא (לפחות 2 תווים)'); return false }
      if (form.phone.trim() && !/^[+]?[\d\s-]{9,15}$/.test(form.phone.trim())) { setError('מספר טלפון לא תקין — לדוגמה: 050-1234567'); return false }
    }
    if (step === 2) {
      if (!signupPwd) { setError('נא למלא תאריך לידה מלא'); return false }
    }
    if (step === 3) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('נא להזין כתובת אימייל תקינה'); return false }
    }
    return true
  }

  /* ── Signup submit ── */
  async function handleSignup() {
    if (!validateStep()) return
    setLoading(true); setError('')
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: form.email,
        password: signupPwd,
        options: { data: { full_name: form.full_name.trim(), phone: form.phone.trim() || null } },
      })
      if (err) throw err
      if (data.user && birthISO) {
        const { error: bdErr } = await supabase.from('profiles').update({ birth_date: birthISO }).eq('id', data.user.id)
        if (bdErr) console.error('birth_date update failed:', bdErr.message)
      }
      setMode('success')
    } catch (err) {
      setError(
        err.message?.includes('already registered') ? 'האימייל כבר קיים — נסה להתחבר' :
        err.message?.includes('User already registered') ? 'האימייל כבר קיים — נסה להתחבר' :
        err.message?.includes('Password should be') ? 'תאריך לידה שגוי' :
        err.message?.includes('signup') ? 'ההרשמה אינה זמינה כרגע' :
        'שגיאה ברישום — נסה שנית'
      )
    }
    setLoading(false)
  }

  /* ─── Render ─── */
  return (
    <div className="min-h-svh flex flex-col items-center justify-center p-5 pb-10" style={BG_STYLE}>

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="relative">
          {/* Double-bezel logo */}
          <div className="p-1.5 rounded-[1.75rem] bg-white/15 ring-1 ring-white/30 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="w-20 h-20 rounded-[calc(1.75rem-6px)] bg-white flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
              <svg viewBox="0 0 48 48" fill="#E30613" className="w-10 h-10">
                <polygon points="24,2 4.95,35 43.05,35"/>
                <polygon points="24,46 4.95,13 43.05,13"/>
              </svg>
            </div>
          </div>
          <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-white border-2 border-[#E30613] flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-white font-bold text-2xl tracking-tight">מד״א</h1>
          <p className="text-white/55 text-sm mt-0.5 font-medium tracking-wide">ניהול משמרות מתנדבים</p>
        </div>
      </div>

      <div className="w-full max-w-sm">

        {/* ══ SUCCESS ══ */}
        {mode === 'success' && (
          <div className="animate-pop-in p-1.5 rounded-[2rem] bg-white/15 ring-1 ring-white/25 shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
          <div className="bg-white rounded-[calc(2rem-6px)] overflow-hidden">
            <div className="h-1 bg-emerald-500" />
            <div className="p-7 flex flex-col items-center gap-5 text-center">

              <div className="animate-pop-in w-24 h-24 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center">
                <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h2 className="text-2xl font-black text-gray-900">!ברוכים הבאים</h2>
                <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
                  {form.full_name}, החשבון שלך נוצר בהצלחה.<br />
                  שמור את הסיסמה שלך:
                </p>
              </div>

              <PwdBox pwd={signupPwd} copied={copied} onCopy={copyPwd} />

              <div className="w-full flex flex-col gap-2 pt-1">
                <button onClick={() => { switchMode('login'); setForm(f => ({ ...f, password: '' })) }}
                  className={BTN_RED}>
                  כניסה לחשבון →
                </button>
                <p className="text-[10px] text-gray-400">ניתן להתחבר עם האימייל והסיסמה שלמעלה</p>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* ══ RESET SENT ══ */}
        {mode === 'sent' && (
          <div className="animate-pop-in p-1.5 rounded-[2rem] bg-white/15 ring-1 ring-white/25 shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
          <div className="bg-white rounded-[calc(2rem-6px)] overflow-hidden">
            <div className="h-1 bg-sky-500" />
            <div className="p-7 flex flex-col items-center gap-5 text-center">
              <div className="w-24 h-24 rounded-full bg-sky-50 border-4 border-sky-100 flex items-center justify-center">
                <svg className="w-12 h-12 text-sky-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">בדוק את המייל שלך</h2>
                <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
                  שלחנו קישור לאיפוס סיסמה אל:
                </p>
                <p className="text-[#E30613] font-bold text-sm mt-1" dir="ltr">{form.email}</p>
                <p className="text-xs text-gray-400 mt-2">אם לא קיבלת, בדוק את תיקיית הספאם</p>
              </div>
              <button onClick={() => switchMode('login')}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-semibold transition-colors duration-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                חזרה לכניסה
              </button>
            </div>
          </div>
          </div>
        )}

        {/* ══ MAIN CARD (login / signup / forgot) ══ */}
        {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
          <div className="p-1.5 rounded-[2rem] bg-white/15 ring-1 ring-white/25 shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
          <div className="bg-white rounded-[calc(2rem-6px)] overflow-hidden">
            <div className="h-1 bg-[#E30613]" />

            <div className="p-6 flex flex-col gap-5">

              {/* Mode toggle */}
              {mode !== 'forgot' && (
                <div className="flex bg-gray-100/80 rounded-2xl p-1 gap-1">
                  {[['login', 'כניסה'], ['signup', 'הרשמה']].map(([m, label]) => (
                    <button key={m} type="button" onClick={() => switchMode(m)}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                        mode === m
                          ? 'bg-white text-gray-900 shadow-sm shadow-black/6'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Signup step dots */}
              {mode === 'signup' && <StepDots current={step} total={3} />}

              {/* ── LOGIN ── */}
              {mode === 'login' && (
                <form key="login" onSubmit={handleLogin} className="animate-slide-in-right flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 text-right">אימייל</label>
                    <input type="email" required dir="ltr" autoComplete="email"
                      placeholder="you@example.com"
                      value={form.email} onChange={e => set('email', e.target.value)}
                      className={INPUT_LTR} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <button type="button" onClick={() => switchMode('forgot')}
                        className="text-[10px] text-[#E30613] font-bold hover:opacity-75 transition-opacity">
                        שכחת סיסמה?
                      </button>
                      <label className="text-xs font-semibold text-gray-500">סיסמה</label>
                    </div>
                    <div className="relative">
                      <input type={showPwd ? 'text' : 'password'} required dir="ltr"
                        autoComplete="current-password"
                        placeholder="DDMMYYYY"
                        value={form.password} onChange={e => set('password', e.target.value)}
                        className={INPUT_LTR + ' pl-10 tracking-widest'} />
                      <button type="button" onClick={() => setShowPwd(v => !v)}
                        aria-label={showPwd ? 'הסתר סיסמה' : 'הצג סיסמה'}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        <EyeIcon open={showPwd} />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-right">הסיסמה היא תאריך הלידה שלך — פורמט DDMMYYYY</p>
                  </div>

                  <ErrorBanner msg={error} />

                  <button type="submit" disabled={loading} className={BTN_RED}>
                    {loading ? <Spinner label="נכנס..." /> : 'כניסה לחשבון'}
                  </button>
                </form>
              )}

              {/* ── FORGOT PASSWORD ── */}
              {mode === 'forgot' && (
                <form key="forgot" onSubmit={handleForgot} className="animate-slide-in-right flex flex-col gap-4">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-[#E30613] uppercase tracking-wider">שחזור גישה</p>
                    <h3 className="font-bold text-gray-900 mt-0.5 text-lg">שכחת סיסמה?</h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      הזן את האימייל שלך ונשלח קישור לאיפוס הסיסמה
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 text-right">אימייל</label>
                    <input type="email" required dir="ltr" autoComplete="email"
                      placeholder="you@example.com"
                      value={form.email} onChange={e => set('email', e.target.value)}
                      className={INPUT_LTR} />
                  </div>

                  <ErrorBanner msg={error} />

                  <button type="submit" disabled={loading} className={BTN_RED}>
                    {loading ? <Spinner label="שולח..." /> : 'שלח קישור לאיפוס'}
                  </button>

                  <button type="button" onClick={() => switchMode('login')}
                    className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 font-semibold transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    חזרה לכניסה
                  </button>
                </form>
              )}

              {/* ── SIGNUP STEPS ── */}
              {mode === 'signup' && (
                <div key={`step-${step}`}
                  className={`flex flex-col gap-4 ${dir === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}>

                  {/* ─ Step 1: Personal info ─ */}
                  {step === 1 && (
                    <>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[#E30613] uppercase tracking-wider">שלב 1 מתוך 3</p>
                        <h3 className="font-bold text-gray-900 mt-0.5 text-lg">פרטים אישיים</h3>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 text-right">שם מלא *</label>
                        <input type="text" autoComplete="name" autoFocus
                          placeholder="השם המלא שלך"
                          value={form.full_name} onChange={e => set('full_name', e.target.value)}
                          className={INPUT} />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 text-right">טלפון <span className="font-normal text-gray-400">(אופציונלי)</span></label>
                        <input type="tel" dir="ltr" autoComplete="tel"
                          placeholder="050-000-0000"
                          value={form.phone} onChange={e => set('phone', e.target.value)}
                          className={INPUT_LTR} />
                      </div>

                      <ErrorBanner msg={error} />

                      <button type="button" className={BTN_RED}
                        onClick={() => { if (validateStep()) goStep(2) }}>
                        המשך ←
                      </button>
                    </>
                  )}

                  {/* ─ Step 2: Birth date → password ─ */}
                  {step === 2 && (
                    <>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[#E30613] uppercase tracking-wider">שלב 2 מתוך 3</p>
                        <h3 className="font-bold text-gray-900 mt-0.5 text-lg">תאריך לידה</h3>
                        <p className="text-xs text-gray-400 mt-1">תאריך הלידה ישמש כסיסמה שלך לכניסה</p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 text-right">תאריך לידה *</label>
                        <div dir="ltr" className="flex items-center gap-1 rounded-xl border border-gray-200 px-2 bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#E30613]/25 focus-within:border-[#E30613] transition-all">
                          {[
                            { val: form.birth_day,   field: 'birth_day',   opts: BD_DAYS,   ph: 'DD'   },
                            { val: form.birth_month, field: 'birth_month', opts: BD_MONTHS, ph: 'MM'   },
                            { val: form.birth_year,  field: 'birth_year',  opts: BD_YEARS,  ph: 'YYYY' },
                          ].map(({ val, field, opts, ph }, i) => (
                            <div key={field} className="flex items-center flex-1">
                              {i > 0 && <span className="text-gray-300 font-bold text-sm select-none">/</span>}
                              <select value={val} onChange={e => set(field, e.target.value)}
                                className="flex-1 py-3 text-sm bg-transparent focus:outline-none text-center appearance-none text-gray-900">
                                <option value="">{ph}</option>
                                {opts.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      <PwdBox pwd={signupPwd} copied={copied} onCopy={copyPwd} />

                      <ErrorBanner msg={error} />

                      <div className="flex gap-2">
                        <button type="button" onClick={() => goStep(1)} className={BTN_GHOST}>
                          → חזרה
                        </button>
                        <button type="button"
                          onClick={() => { if (validateStep()) goStep(3) }}
                          className="flex-[2] py-3 bg-[#E30613] text-white font-bold rounded-xl shadow-lg shadow-red-600/35 active:scale-[0.98] transition-all text-sm">
                          המשך ←
                        </button>
                      </div>
                    </>
                  )}

                  {/* ─ Step 3: Email + confirm ─ */}
                  {step === 3 && (
                    <>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[#E30613] uppercase tracking-wider">שלב 3 מתוך 3</p>
                        <h3 className="font-bold text-gray-900 mt-0.5 text-lg">כתובת אימייל</h3>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 text-right">אימייל *</label>
                        <input type="email" required dir="ltr" autoComplete="email" autoFocus
                          placeholder="you@example.com"
                          value={form.email} onChange={e => set('email', e.target.value)}
                          className={INPUT_LTR} />
                      </div>

                      {/* Summary card */}
                      <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">סיכום פרטי הרישום</p>
                        {[
                          { label: 'שם',    val: form.full_name,    dir: 'rtl' },
                          form.phone ? { label: 'טלפון', val: form.phone, dir: 'ltr' } : null,
                          { label: 'סיסמה', val: signupPwd,         dir: 'ltr', mono: true },
                        ].filter(Boolean).map(row => (
                          <div key={row.label} className="flex items-center justify-between gap-3">
                            <span className="text-xs text-gray-400">{row.label}</span>
                            <span className={`text-sm font-bold ${row.mono ? 'font-mono text-[#E30613]' : 'text-gray-800'}`} dir={row.dir}>
                              {row.val}
                            </span>
                          </div>
                        ))}
                      </div>

                      <ErrorBanner msg={error} />

                      <div className="flex gap-2">
                        <button type="button" onClick={() => goStep(2)} className={BTN_GHOST}>
                          → חזרה
                        </button>
                        <button type="button" onClick={handleSignup} disabled={loading}
                          className="flex-[2] py-3 bg-[#E30613] text-white font-bold rounded-xl shadow-lg shadow-red-600/35 active:scale-[0.98] transition-all disabled:opacity-50 text-sm">
                          {loading ? <Spinner label="יוצר..." /> : 'יצירת חשבון ✓'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
          </div>
        )}
      </div>

      <p className="text-white/30 text-xs mt-8 font-medium tracking-wide">מגן דוד אדום — ישראל</p>
    </div>
  )
}
