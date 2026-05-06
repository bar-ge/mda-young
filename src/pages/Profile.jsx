import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const roleLabels = {
  admin: 'מנהל',
  dispatcher: 'סדרן',
  volunteer: 'מתנדב',
}

const roleColors = {
  admin:      'bg-purple-50 text-purple-700 border-purple-200',
  dispatcher: 'bg-sky-50 text-sky-700 border-sky-200',
  volunteer:  'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export default function Profile() {
  const { user, profile, signOut, fetchProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Sync form when profile loads or changes
  useEffect(() => {
    if (profile) {
      setForm({ full_name: profile.full_name || '', phone: profile.phone || '' })
    }
  }, [profile])

  function startEdit() {
    setForm({ full_name: profile?.full_name || '', phone: profile?.phone || '' })
    setError('')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setError('')
  }

  async function save(e) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('שם מלא הוא שדה חובה'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name.trim(), phone: form.phone.trim() || null })
      .eq('id', user.id)
    if (err) {
      setError('שגיאה בשמירה — נסה שנית')
    } else {
      await fetchProfile(user.id)
      setEditing(false)
      setSuccess('הפרופיל עודכן!')
      setTimeout(() => setSuccess(''), 3000)
    }
    setSaving(false)
  }

  if (!profile) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const initials = profile.full_name?.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
  const roleKey = profile.role || 'volunteer'

  return (
    <div className="flex flex-col gap-3 pt-3 lg:pt-0 lg:h-[calc(100svh-7.5rem)] lg:overflow-hidden">

      {/* Avatar card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-2 text-center">
        <div className="w-16 h-16 rounded-full bg-[#E30613] flex items-center justify-center shadow-lg shadow-red-500/20">
          <span className="text-white font-bold text-xl">{initials}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-bold text-gray-900 text-lg leading-tight">{profile.full_name}</h2>
          <p className="text-gray-400 text-sm" dir="ltr">{user?.email}</p>
          {profile.phone && <p className="text-gray-500 text-sm">{profile.phone}</p>}
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${roleColors[roleKey]}`}>
          {roleLabels[roleKey]}
        </span>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center justify-end gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3 rounded-xl">
          {success}
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {/* Edit form */}
      {editing ? (
        <form onSubmit={save} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
          <h3 className="font-semibold text-gray-900 text-sm text-right">עריכת פרופיל</h3>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">שם מלא *</label>
            <input
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              disabled={saving}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] transition-all disabled:opacity-60 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">טלפון</label>
            <input
              type="tel"
              dir="ltr"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="050-000-0000"
              disabled={saving}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] transition-all disabled:opacity-60 disabled:bg-gray-50"
            />
          </div>

          {error && (
            <div className="flex items-center justify-end gap-2 bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2.5 rounded-xl">
              {error}
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#E30613] text-white text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm shadow-red-500/20">
              {saving ? '...שומר' : 'שמירת שינויים'}
            </button>
            <button type="button" onClick={cancelEdit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-50">
              ביטול
            </button>
          </div>
        </form>
      ) : (
        <button onClick={startEdit}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3.5 flex items-center justify-between text-sm font-medium text-gray-700 active:bg-gray-50 transition-colors">
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="flex items-center gap-3">
            עריכת פרופיל
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </span>
        </button>
      )}

      {/* Info rows */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {[
          { label: 'אימייל',     value: user?.email, dir: 'ltr' },
          { label: 'טלפון',      value: profile.phone || '—' },
          { label: 'תאריך לידה', value: profile.birth_date ? (() => { const d = new Date(profile.birth_date + 'T12:00:00'); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}` })() : '—' },
          { label: 'תפקיד',      value: roleLabels[roleKey] },
        ].map((row, i, arr) => (
          <div key={i} className={`px-4 py-2.5 flex items-center justify-between ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
            <span className="text-xs text-gray-400">{row.label}</span>
            <span className="text-sm font-medium text-gray-700" dir={row.dir}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Sign out */}
      <button onClick={() => { if (confirm('להתנתק?')) signOut() }}
        className="bg-white rounded-2xl border border-red-100 shadow-sm px-4 py-3 flex items-center justify-end gap-3 text-[#E30613] text-sm font-semibold active:bg-red-50 transition-colors">
        התנתקות
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>

      <p className="text-center text-xs text-gray-300 pb-2">מד״א צעירים v1.0</p>
    </div>
  )
}
