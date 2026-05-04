import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

function pad(n) { return String(n).padStart(2, '0') }
function hourLabel(h) { return `${pad(h)}:00` }

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', branch_id: '', start_hour: 8, end_hour: 14,
    max_volunteers: 1, description: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: t }, { data: b }] = await Promise.all([
      supabase.from('shift_templates').select('*, branches(name)').order('start_hour'),
      supabase.from('branches').select('id, name').eq('active', true).order('name'),
    ])
    if (t) setTemplates(t)
    if (b) setBranches(b)
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('shift_templates').insert({
      name: form.name.trim(),
      branch_id: form.branch_id || null,
      start_hour: Number(form.start_hour),
      end_hour: Number(form.end_hour),
      max_volunteers: Number(form.max_volunteers),
      description: form.description.trim() || null,
    })
    setForm({ name: '', branch_id: '', start_hour: 8, end_hour: 14, max_volunteers: 1, description: '' })
    setShowForm(false)
    await load()
    setSaving(false)
  }

  async function deleteTemplate(id) {
    if (!confirm('למחוק את התבנית?')) return
    await supabase.from('shift_templates').delete().eq('id', id)
    await load()
  }

  async function toggleActive(t) {
    await supabase.from('shift_templates').update({ active: !t.active }).eq('id', t.id)
    await load()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{templates.length} תבניות</span>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E30613] text-white text-xs font-semibold rounded-xl shadow-sm shadow-red-500/20 active:scale-95 transition-all"
        >
          <span className="text-base leading-none">+</span>
          תבנית חדשה
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
          <h3 className="font-semibold text-gray-900 text-sm text-right">תבנית משמרת חדשה</h3>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">שם התבנית *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder='למשל: משמרת בוקר, משמרת ערב'
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">סניף</label>
            <select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] bg-white">
              <option value="">ללא סניף ספציפי</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">שעת סיום</label>
              <select value={form.end_hour} onChange={e => setForm(f => ({ ...f, end_hour: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] bg-white">
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{hourLabel(i)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">שעת התחלה</label>
              <select value={form.start_hour} onChange={e => setForm(f => ({ ...f, start_hour: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] bg-white">
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{hourLabel(i)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">מספר מתנדבים מקסימלי</label>
            <input type="number" min="1" max="50" value={form.max_volunteers}
              onChange={e => setForm(f => ({ ...f, max_volunteers: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">תיאור</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder='תיאור אופציונלי'
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] resize-none" />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#E30613] text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {saving ? '...שומר' : 'שמירת תבנית'}
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
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <span className="text-4xl">📋</span>
          <p className="text-gray-400 text-sm">אין תבניות עדיין</p>
        </div>
      ) : (
        templates.map(t => (
          <div key={t.id} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start justify-between gap-3 ${!t.active ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              <button onClick={() => deleteTemplate(t.id)}
                className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center text-sm hover:bg-red-100 transition-colors">×</button>
              <button onClick={() => toggleActive(t)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${t.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {t.active ? 'פעיל' : 'כבוי'}
              </button>
            </div>
            <div className="flex-1 text-right">
              <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {hourLabel(t.start_hour)} – {hourLabel(t.end_hour)}
                {t.branches?.name && ` · ${t.branches.name}`}
                {` · עד ${t.max_volunteers} מתנדבים`}
              </p>
              {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
            </div>
            <span className="text-2xl">📋</span>
          </div>
        ))
      )}
    </div>
  )
}
