import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCalendar } from '../../contexts/CalendarContext'

function pad(n) { return String(n).padStart(2, '0') }
function hourLabel(h) { return `${pad(h)}:00` }

const DAYS = [
  { value: 0, short: 'א׳', label: 'ראשון' },
  { value: 1, short: 'ב׳', label: 'שני' },
  { value: 2, short: 'ג׳', label: 'שלישי' },
  { value: 3, short: 'ד׳', label: 'רביעי' },
  { value: 4, short: 'ה׳', label: 'חמישי' },
  { value: 5, short: 'ו׳', label: 'שישי' },
  { value: 6, short: 'ש׳', label: 'שבת' },
]

function DaysPicker({ value, onChange }) {
  function toggle(d) {
    onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d].sort((a, b) => a - b))
  }
  return (
    <div className="flex gap-1.5 flex-wrap justify-end">
      {DAYS.map(d => (
        <button
          key={d.value}
          type="button"
          onClick={() => toggle(d.value)}
          className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
            value.includes(d.value)
              ? 'bg-[#E30613] text-white shadow-sm shadow-red-500/20'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
          title={d.label}
        >
          {d.short}
        </button>
      ))}
    </div>
  )
}

const emptyForm = {
  name: '', branch_id: '', start_hour: 8, end_hour: 14,
  max_volunteers: 1, description: '', days_of_week: [],
}

function TemplateForm({ initial = emptyForm, branches, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial)
  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }}
      className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-3">

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">שם התבנית *</label>
        <input required value={form.name} onChange={e => set('name', e.target.value)}
          placeholder='למשל: משמרת בוקר, משמרת ערב'
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">ימי שבוע</label>
        <DaysPicker value={form.days_of_week} onChange={v => set('days_of_week', v)} />
        <p className="text-[10px] text-gray-400 mt-1 text-right">
          {form.days_of_week.length === 0 ? 'לא נבחרו ימים — חל על כל הימים' : `נבחרו: ${form.days_of_week.map(d => DAYS[d]?.label).join(', ')}`}
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">סניף</label>
        <select value={form.branch_id} onChange={e => set('branch_id', e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] bg-white">
          <option value="">ללא סניף ספציפי</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">שעת סיום</label>
          <select value={form.end_hour} onChange={e => set('end_hour', Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] bg-white">
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{hourLabel(i)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">שעת התחלה</label>
          <select value={form.start_hour} onChange={e => set('start_hour', Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] bg-white">
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{hourLabel(i)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">מתנדבים מקסימלי</label>
        <input type="number" min="1" max="50" value={form.max_volunteers}
          onChange={e => set('max_volunteers', Number(e.target.value))}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">תיאור</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={2} placeholder='תיאור אופציונלי'
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] resize-none" />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 bg-[#E30613] text-white text-sm font-semibold rounded-xl disabled:opacity-50 active:scale-[0.98] transition-all">
          {saving ? '...שומר' : 'שמירה'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl">
          ביטול
        </button>
      </div>
    </form>
  )
}

async function runGenerate(templates, daysAhead, userId) {
  const active = templates.filter(t => t.active)
  if (!active.length) return 0

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const until = new Date(now.getTime() + daysAhead * 86400000)

  const { data: existing } = await supabase
    .from('shifts')
    .select('template_id, start_time')
    .gte('start_time', now.toISOString())
    .lt('start_time', until.toISOString())
    .not('template_id', 'is', null)

  const existingSet = new Set(
    (existing || []).map(s => {
      const d = new Date(s.start_time)
      return `${s.template_id}:${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
    })
  )

  const toInsert = []
  for (const tpl of active) {
    const days = tpl.days_of_week?.length > 0 ? tpl.days_of_week : null
    for (let i = 0; i < daysAhead; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() + i)
      if (days && !days.includes(date.getDay())) continue

      const dateStr = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
      if (existingSet.has(`${tpl.id}:${dateStr}`)) continue

      const start = new Date(date)
      start.setHours(tpl.start_hour, 0, 0, 0)
      const end = new Date(date)
      end.setHours(tpl.end_hour, 0, 0, 0)
      if (end <= start) end.setDate(end.getDate() + 1)

      toInsert.push({
        title: tpl.name,
        description: tpl.description || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        max_volunteers: tpl.max_volunteers,
        branch_id: tpl.branch_id || null,
        template_id: tpl.id,
        shift_type: 'regular',
        status: 'open',
        created_by: userId,
      })
    }
  }

  if (toInsert.length > 0) {
    const BATCH = 500
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const { error } = await supabase.from('shifts').insert(toInsert.slice(i, i + BATCH))
      if (error) throw error
    }
  }
  return toInsert.length
}

export default function Templates() {
  const { user } = useAuth()
  const { invalidate } = useCalendar()
  const [templates, setTemplates] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null)
  const [saving, setSaving] = useState(false)
  const [daysAhead, setDaysAhead] = useState(14)
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState(null)
  const autoRan = useRef(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    let t, b
    try {
      const [{ data: td }, { data: bd }] = await Promise.all([
        supabase.from('shift_templates').select('*, branches(name)').order('start_hour'),
        supabase.from('branches').select('id, name').eq('active', true).order('name'),
      ])
      t = td; b = bd
      if (t) setTemplates(t)
      if (b) setBranches(b)
    } finally {
      setLoading(false)
    }

    if (!autoRan.current && t?.some(tpl => tpl.active)) {
      autoRan.current = true
      try {
        const count = await runGenerate(t, 14, user.id)
        if (count > 0) setGenResult({ count, auto: true })
      } catch (_) {}
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenResult(null)
    try {
      const count = await runGenerate(templates, daysAhead, user.id)
      setGenResult({ count, auto: false })
      if (count > 0) invalidate()
    } catch (_) {
      setGenResult({ count: -1, auto: false })
    }
    setGenerating(false)
  }

  async function handleSave(form) {
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      branch_id: form.branch_id || null,
      start_hour: Number(form.start_hour),
      end_hour: Number(form.end_hour),
      max_volunteers: Number(form.max_volunteers),
      description: form.description?.trim() || null,
      days_of_week: form.days_of_week || [],
    }
    if (mode?.editing) {
      await supabase.from('shift_templates').update(payload).eq('id', mode.editing.id)
    } else {
      await supabase.from('shift_templates').insert(payload)
    }
    setMode(null)
    await load()
    setSaving(false)
  }

  async function deleteTemplate(id) {
    if (!confirm('למחוק את התבנית וכל המשמרות שנוצרו ממנה?')) return

    const { data: shiftRows } = await supabase
      .from('shifts').select('id').eq('template_id', id)
    const shiftIds = (shiftRows || []).map(s => s.id)

    if (shiftIds.length > 0) {
      await supabase.from('shift_assignments').delete().in('shift_id', shiftIds)
      await supabase.from('shifts').delete().in('id', shiftIds)
    }
    await supabase.from('shift_templates').delete().eq('id', id)
    invalidate()
    await load()
  }

  async function toggleActive(t) {
    await supabase.from('shift_templates').update({ active: !t.active }).eq('id', t.id)
    await load()
  }

  const activeCount = templates.filter(t => t.active).length

  return (
    <div className="flex flex-col gap-3">

      {/* Auto-generate panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <select
            value={daysAhead}
            onChange={e => setDaysAhead(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] bg-white"
          >
            <option value={7}>שבוע קדימה</option>
            <option value={14}>שבועיים קדימה</option>
            <option value={30}>חודש קדימה</option>
            <option value={90}>3 חודשים קדימה</option>
            <option value={180}>6 חודשים קדימה</option>
            <option value={365}>שנה קדימה</option>
            <option value={730}>לתמיד (שנתיים)</option>
          </select>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-800">יצירה אוטומטית</p>
            <p className="text-[10px] text-gray-400">
              {activeCount > 0 ? `${activeCount} תבניות פעילות` : 'אין תבניות פעילות'}
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || loading || activeCount === 0}
          className="w-full py-2.5 bg-[#E30613] text-white text-sm font-bold rounded-xl shadow-sm shadow-red-500/20 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              יוצר משמרות...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              צור משמרות לפי תבניות
            </>
          )}
        </button>

        {genResult && (
          <div className={`flex items-center justify-end gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold ${
            genResult.count === -1  ? 'bg-red-50 text-red-600' :
            genResult.count === 0   ? 'bg-gray-50 text-gray-500' :
                                      'bg-emerald-50 text-emerald-700'
          }`}>
            {genResult.count === -1  ? 'שגיאה ביצירת משמרות' :
             genResult.count === 0   ? 'כל המשמרות כבר קיימות ✓' :
             `${genResult.count} משמרות נוצרו${genResult.auto ? ' אוטומטית' : ''} ✓`}
          </div>
        )}

        <p className="text-[10px] text-gray-400 text-right leading-relaxed">
          רץ אוטומטית בפתיחת הדף לשבועיים קדימה · מדלג על משמרות קיימות · לתמיד = שנתיים קדימה
        </p>
      </div>

      {/* Templates list header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{templates.length} תבניות</span>
        <button
          onClick={() => setMode('new')}
          disabled={!!mode}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E30613] text-white text-xs font-semibold rounded-xl shadow-sm shadow-red-500/20 active:scale-95 transition-all disabled:opacity-40"
        >
          <span className="text-base leading-none">+</span>
          תבנית חדשה
        </button>
      </div>

      {mode === 'new' && (
        <TemplateForm
          branches={branches}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setMode(null)}
        />
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
          <div key={t.id} className="flex flex-col gap-0">
            {mode?.editing?.id === t.id ? (
              <TemplateForm
                initial={{
                  name: t.name,
                  branch_id: t.branch_id || '',
                  start_hour: t.start_hour,
                  end_hour: t.end_hour,
                  max_volunteers: t.max_volunteers,
                  description: t.description || '',
                  days_of_week: t.days_of_week || [],
                }}
                branches={branches}
                saving={saving}
                onSave={handleSave}
                onCancel={() => setMode(null)}
              />
            ) : (
              <div className={`bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-2.5 ${!t.active ? 'opacity-55' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => deleteTemplate(t.id)}
                      className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center text-sm hover:bg-red-100 transition-colors">×</button>
                    <button onClick={() => setMode({ editing: t })} disabled={!!mode}
                      className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-40">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button onClick={() => toggleActive(t)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${t.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
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
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5">
                  {(t.days_of_week?.length === 0 || !t.days_of_week) ? (
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">כל הימים</span>
                  ) : (
                    DAYS.map(d => (
                      <span key={d.value}
                        className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center ${
                          t.days_of_week.includes(d.value)
                            ? 'bg-[#E30613]/10 text-[#E30613]'
                            : 'bg-gray-50 text-gray-300'
                        }`}>
                        {d.short}
                      </span>
                    ))
                  )}
                </div>

                {t.description && (
                  <p className="text-xs text-gray-400 text-right">{t.description}</p>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
