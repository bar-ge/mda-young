import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const TARGET_LABELS = { all: 'לכולם', driver: 'נהגים', volunteer: 'נוער' }
const TARGET_COLORS = {
  all:       'bg-sky-50 text-sky-600',
  driver:    'bg-emerald-50 text-emerald-700',
  volunteer: 'bg-amber-50 text-amber-700',
}

function formatDate(ts) {
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function Messages() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const isManager = profile?.role === 'admin' || profile?.role === 'dispatcher'

  const [messages,   setMessages]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [composing,  setComposing]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [form, setForm] = useState({ title: '', body: '', target_role: 'all' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('station_messages')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setMessages(data)
    setLoading(false)
  }

  async function handleSend() {
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true)
    const { error } = await supabase.from('station_messages').insert({
      title:           form.title.trim(),
      body:            form.body.trim(),
      target_role:     form.target_role,
      created_by:      profile.id,
      created_by_name: profile.full_name,
    })
    setSaving(false)
    if (error) { toast('שגיאה בשליחת ההודעה', { type: 'error' }); return }
    toast('ההודעה נשלחה')
    setComposing(false)
    setForm({ title: '', body: '', target_role: 'all' })
    load()
  }

  async function handleDelete(id) {
    setDeletingId(id)
    const { error } = await supabase.from('station_messages').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('שגיאה במחיקה', { type: 'error' }); return }
    toast('ההודעה נמחקה')
    setMessages(m => m.filter(msg => msg.id !== id))
  }

  return (
    <div className="flex flex-col gap-4 pt-3 lg:pt-0">

      {/* Compose button */}
      {isManager && !composing && (
        <button
          onClick={() => setComposing(true)}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#E30613] text-white font-bold rounded-2xl shadow-sm shadow-red-500/25 active:scale-[0.98] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          הודעה חדשה
        </button>
      )}

      {/* Compose form */}
      {isManager && composing && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setComposing(false); setForm({ title: '', body: '', target_role: 'all' }) }}
              className="p-1 -m-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            <p className="font-bold text-gray-900 text-sm">הודעה חדשה</p>
          </div>

          {/* Audience selector */}
          <div className="flex gap-1.5">
            {[
              { val: 'all',       label: 'לכולם'     },
              { val: 'driver',    label: 'נהגים'     },
              { val: 'volunteer', label: 'נוער'       },
            ].map(({ val, label }) => (
              <button key={val}
                onClick={() => setForm(f => ({ ...f, target_role: val }))}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  form.target_role === val
                    ? 'bg-[#E30613] text-white shadow-sm shadow-red-500/20'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="כותרת ההודעה"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-right bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all"
          />
          <textarea
            placeholder="תוכן ההודעה..."
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-right bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all resize-none"
          />

          <button
            onClick={handleSend}
            disabled={saving || !form.title.trim() || !form.body.trim()}
            className="w-full py-3 bg-[#E30613] text-white font-bold rounded-xl shadow-sm shadow-red-500/20 disabled:opacity-40 active:scale-[0.98] transition-all text-sm"
          >
            {saving ? 'שולח...' : 'שלח הודעה ←'}
          </button>
        </div>
      )}

      {/* Messages list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">אין הודעות תחנה</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map(msg => (
            <div key={msg.id} dir="rtl" className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-gray-900 text-sm leading-snug">{msg.title}</p>
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TARGET_COLORS[msg.target_role]}`}>
                    {TARGET_LABELS[msg.target_role]}
                  </span>
                  {isManager && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      disabled={deletingId === msg.id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
                      aria-label="מחק הודעה"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>

              <div className="flex items-center justify-between pt-1.5 border-t border-gray-50">
                <span className="text-[10px] text-gray-400 font-medium">{msg.created_by_name}</span>
                <span className="text-[10px] text-gray-300 font-medium" dir="ltr">{formatDate(msg.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
