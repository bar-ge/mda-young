import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlockedDates() {
  const { user } = useAuth()
  const [blocked, setBlocked] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ date: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('blocked_dates').select('*').order('date')
    if (data) setBlocked(data)
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.date) return
    setSaving(true)
    await supabase.from('blocked_dates').upsert({ date: form.date, reason: form.reason.trim() || null, created_by: user.id })
    setForm({ date: '', reason: '' })
    setShowForm(false)
    await load()
    setSaving(false)
  }

  async function remove(id) {
    if (!confirm('להסיר חסימה זו?')) return
    await supabase.from('blocked_dates').delete().eq('id', id)
    await load()
  }

  const now = new Date().toISOString().slice(0, 10)
  const upcoming = blocked.filter(b => b.date >= now)
  const past = blocked.filter(b => b.date < now)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{upcoming.length} חסימות קרובות</span>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E30613] text-white text-xs font-semibold rounded-xl shadow-sm shadow-red-500/20 active:scale-95 transition-all">
          <span className="text-base leading-none">+</span>
          חסימת יום
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
          <h3 className="font-semibold text-gray-900 text-sm text-right">חסימת תאריך</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">תאריך *</label>
            <input type="date" required value={form.date} min={now}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">סיבה</label>
            <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder='למשל: יום כיפור, שבתון'
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#E30613] text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {saving ? '...שומר' : 'חסימת תאריך'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl">
              ביטול
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : blocked.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <span className="text-4xl">🔒</span>
          <p className="text-gray-400 text-sm">אין תאריכים חסומים</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">קרובים</p>
              {upcoming.map(b => (
                <div key={b.id} className="bg-white rounded-2xl border border-red-100 shadow-sm p-4 flex items-center justify-between gap-3">
                  <button onClick={() => remove(b.id)}
                    className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center text-sm hover:bg-red-100 transition-colors shrink-0">×</button>
                  <div className="flex-1 text-right">
                    <p className="font-semibold text-gray-900 text-sm">{formatDate(b.date)}</p>
                    {b.reason && <p className="text-xs text-gray-400 mt-0.5">{b.reason}</p>}
                  </div>
                  <span className="text-xl">🔒</span>
                </div>
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">עבר</p>
              {past.map(b => (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3 opacity-50">
                  <button onClick={() => remove(b.id)}
                    className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center text-sm shrink-0">×</button>
                  <div className="flex-1 text-right">
                    <p className="font-semibold text-gray-900 text-sm">{formatDate(b.date)}</p>
                    {b.reason && <p className="text-xs text-gray-400 mt-0.5">{b.reason}</p>}
                  </div>
                  <span className="text-xl">🔒</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
