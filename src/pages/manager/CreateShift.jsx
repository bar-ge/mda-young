import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const shiftTypes = [
  { id: 'regular', label: 'משמרת רגילה', icon: '🕐', desc: 'בוקר / ערב / לילה' },
  { id: 'event',   label: 'אירוע',        icon: '⭐', desc: 'חד פעמי' },
  { id: 'holiday', label: 'חג / סגירה',   icon: '🔒', desc: 'סגירת יום' },
]

function toLocalDatetimeValue(date) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function todayAt(hour) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return toLocalDatetimeValue(d)
}

export default function CreateShift() {
  const { user } = useAuth()
  const [shiftType, setShiftType] = useState('regular')
  const [branches, setBranches] = useState([])
  const [templates, setTemplates] = useState([])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', location: '',
    start_time: todayAt(8), end_time: todayAt(14),
    max_volunteers: 1, branch_id: '', template_id: '',
  })

  useEffect(() => { loadOptions() }, [])

  async function loadOptions() {
    const [{ data: b }, { data: t }] = await Promise.all([
      supabase.from('branches').select('id, name').eq('active', true).order('name'),
      supabase.from('shift_templates').select('*, branches(name)').eq('active', true).order('start_hour'),
    ])
    if (b) setBranches(b)
    if (t) setTemplates(t)
  }

  function applyTemplate(templateId) {
    const t = templates.find(t => t.id === templateId)
    if (!t) return
    const start = new Date()
    start.setHours(t.start_hour, 0, 0, 0)
    const end = new Date()
    end.setHours(t.end_hour, 0, 0, 0)
    if (end <= start) end.setDate(end.getDate() + 1)
    setForm(f => ({
      ...f,
      template_id: templateId,
      title: t.name,
      description: t.description || '',
      max_volunteers: t.max_volunteers,
      branch_id: t.branch_id || '',
      location: t.branches?.name || f.location,
      start_time: toLocalDatetimeValue(start),
      end_time: toLocalDatetimeValue(end),
    }))
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSuccess('')

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      max_volunteers: Number(form.max_volunteers),
      branch_id: form.branch_id || null,
      template_id: form.template_id || null,
      shift_type: shiftType,
      status: shiftType === 'holiday' ? 'cancelled' : 'open',
      created_by: user.id,
    }

    const { error } = await supabase.from('shifts').insert(payload)
    if (!error) {
      setSuccess(shiftType === 'holiday' ? 'יום החג נסגר בהצלחה' : 'המשמרת נוצרה בהצלחה!')
      setForm({ title: '', description: '', location: '', start_time: todayAt(8), end_time: todayAt(14), max_volunteers: 1, branch_id: '', template_id: '' })
      setTimeout(() => setSuccess(''), 4000)
    }
    setSaving(false)
  }

  const isHoliday = shiftType === 'holiday'

  return (
    <div className="flex flex-col gap-4">
      {/* Type selector */}
      <div className="grid grid-cols-3 gap-2">
        {shiftTypes.map(t => (
          <button key={t.id} onClick={() => setShiftType(t.id)}
            className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 transition-all text-center ${
              shiftType === t.id
                ? 'border-[#E30613] bg-[#E30613]/5 shadow-sm'
                : 'border-gray-200 bg-white'
            }`}>
            <span className="text-2xl">{t.icon}</span>
            <span className={`text-xs font-semibold ${shiftType === t.id ? 'text-[#E30613]' : 'text-gray-700'}`}>{t.label}</span>
            <span className="text-[10px] text-gray-400">{t.desc}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-4">

        {/* Template picker (regular only) */}
        {shiftType === 'regular' && templates.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">טען מתבנית</label>
            <select value={form.template_id} onChange={e => applyTemplate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] bg-white">
              <option value="">בחר תבנית (אופציונלי)</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} — {String(t.start_hour).padStart(2,'0')}:00–{String(t.end_hour).padStart(2,'0')}:00
                  {t.branches?.name ? ` · ${t.branches.name}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">
            {isHoliday ? 'שם החג / הסיבה *' : 'כותרת המשמרת *'}
          </label>
          <input required value={form.title} onChange={e => set('title', e.target.value)}
            placeholder={isHoliday ? 'למשל: יום כיפור' : 'למשל: משמרת בוקר — תל אביב'}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
        </div>

        {/* Date/time */}
        {isHoliday ? (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">תאריך הסגירה *</label>
            <input type="date" required value={form.start_time.slice(0, 10)}
              onChange={e => {
                set('start_time', e.target.value + 'T00:00')
                set('end_time', e.target.value + 'T23:59')
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">סיום</label>
              <input type="datetime-local" required value={form.end_time}
                onChange={e => set('end_time', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">התחלה</label>
              <input type="datetime-local" required value={form.start_time}
                onChange={e => set('start_time', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
            </div>
          </div>
        )}

        {!isHoliday && (
          <>
            {/* Branch */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">סניף</label>
              <select value={form.branch_id} onChange={e => set('branch_id', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] bg-white">
                <option value="">ללא סניף</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">מיקום</label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                placeholder='כתובת / עיר'
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
            </div>

            {/* Max volunteers */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">מספר מתנדבים מקסימלי</label>
              <input type="number" min="1" max="100" value={form.max_volunteers}
                onChange={e => set('max_volunteers', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">תיאור</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={2} placeholder='פרטים נוספים על המשמרת'
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] resize-none" />
            </div>
          </>
        )}

        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3 rounded-xl justify-end">
            {success}
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-3 bg-[#E30613] text-white font-semibold rounded-xl shadow-sm shadow-red-500/20 disabled:opacity-50 active:scale-[0.98] transition-all">
          {saving ? '...יוצר' : isHoliday ? 'סגור יום' : 'יצירת משמרת'}
        </button>
      </form>
    </div>
  )
}
