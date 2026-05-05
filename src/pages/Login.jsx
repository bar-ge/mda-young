import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const DOT_PATTERN = `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='1.2' fill='white' fill-opacity='0.12'/%3E%3C/svg%3E")`

export default function Login() {
  const { user } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  if (user) return <Navigate to="/" replace />

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.full_name, phone: form.phone } },
        })
        if (error) throw error

        if (data.user) {
          await supabase.from('profiles').upsert({
            id:        data.user.id,
            full_name: form.full_name.trim(),
            phone:     form.phone.trim() || null,
            role:      'volunteer',
          })
        }

        setSuccess('הרישום הושלם! ניתן להתחבר עם הסיסמה שהזנת.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
      }
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'אימייל או סיסמה שגויים'
          : err.message === 'User already registered'
          ? 'האימייל כבר רשום. נסה להתחבר.'
          : 'שגיאה: ' + err.message
      )
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-300 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/25 focus:border-[#E30613] transition-all text-right"

  return (
    <div
      className="min-h-svh flex flex-col items-center justify-center p-5"
      style={{
        background: 'linear-gradient(150deg, #E30613 0%, #a50010 55%, #6b0009 100%)',
        backgroundImage: `${DOT_PATTERN}, linear-gradient(150deg, #E30613 0%, #a50010 55%, #6b0009 100%)`,
        backgroundSize: '24px 24px, 100% 100%',
      }}
    >
      {/* Logo block */}
      <div className="mb-7 flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-2xl shadow-black/30">
            <svg viewBox="0 0 48 48" fill="#E30613" className="w-10 h-10">
              <rect x="18" y="2" width="12" height="44" rx="3"/>
              <rect x="2" y="18" width="44" height="12" rx="3"/>
            </svg>
          </div>
          <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-white border-2 border-[#E30613] flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-white font-bold text-2xl tracking-tight leading-tight">מד״א צעירים</h1>
          <p className="text-white/65 text-sm mt-1 font-medium">ניהול משמרות מתנדבים</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl shadow-black/25 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#E30613] via-[#ff2233] to-[#E30613]" />

        <div className="p-6 flex flex-col gap-5">
          {/* Toggle */}
          <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
            {[['login', 'כניסה'], ['signup', 'הרשמה']].map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); setSuccess('') }}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  mode === m
                    ? 'bg-white text-gray-900 shadow-sm shadow-black/8'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Signup-only fields */}
            {mode === 'signup' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 text-right">שם מלא *</label>
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={e => set('full_name', e.target.value)}
                    placeholder="השם המלא שלך"
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 text-right">טלפון</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="050-000-0000"
                    className={inputCls + ' text-left'}
                  />
                </div>
              </>
            )}

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 text-right">אימייל</label>
              <input
                type="email"
                required
                dir="ltr"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="you@example.com"
                className={inputCls + ' text-left'}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 text-right">סיסמה</label>
              <input
                type="password"
                required
                dir="ltr"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="DDMMYYYY"
                className={inputCls + ' text-left tracking-widest'}
              />
              <p className="text-[10px] text-gray-400 text-right">הסיסמה היא תאריך הלידה בפורמט DDMMYYYY — לדוגמה: 15011990</p>
            </div>

            {error && (
              <div className="flex items-center justify-end gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {success && (
              <div className="flex items-center justify-end gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3 rounded-xl">
                {success}
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#E30613] text-white font-bold rounded-xl shadow-lg shadow-red-600/35 hover:bg-[#c0000f] active:scale-[0.98] transition-all disabled:opacity-55 disabled:cursor-not-allowed text-sm tracking-wide"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'נכנס...' : 'יוצר חשבון...'}
                </span>
              ) : (
                mode === 'login' ? 'כניסה' : 'יצירת חשבון'
              )}
            </button>
          </form>
        </div>
      </div>

      <p className="text-white/40 text-xs mt-6 font-medium">מגן דוד אדום — ישראל</p>
    </div>
  )
}
