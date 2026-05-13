import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

const shiftTypes = [
  { id: 'regular', label: 'משמרת רגילה', icon: '🕐', desc: 'בוקר / ערב / לילה' },
  { id: 'event',   label: 'אירוע',        icon: '⭐', desc: 'חד פעמי' },
  { id: 'holiday', label: 'חג / סגירה',   icon: '🔒', desc: 'סגירת יום' },
]

const RESOURCE_FIELDS = [
  { key: 'motorcycle_count',  label: 'אופנוע'    },
  { key: 'asn_count',         label: 'אס"ן'       },
  { key: 'white_amb_count',   label: 'לבן'        },
  { key: 'amb_4x4_count',     label: "אמב' 4X4"  },
  { key: 'als_tent_count',    label: 'ALS באהל'  },
  { key: 'er_team_count',     label: 'ע"ר'        },
  { key: 'hq_rep_count',      label: 'חפ"ק'       },
  { key: 'commander_count',   label: 'מפקד'       },
  { key: 'emt_count',         label: 'חובש'       },
  { key: 'ops_manager_count', label: 'ס. מנהל'   },
  { key: 'atv_count',         label: 'טרקטורון'  },
  { key: 'paramedic_count',   label: 'פרמדיק'    },
  { key: 'taran',             label: 'תאר"ן'      },
]

function Stepper({ label, value, onChange }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] font-semibold text-gray-500 text-center leading-tight">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold text-base hover:bg-gray-200 transition-colors flex items-center justify-center">
          −
        </button>
        <span className={`w-7 text-center text-sm font-bold tabular-nums ${value > 0 ? 'text-[#E30613]' : 'text-gray-300'}`}>
          {value}
        </span>
        <button type="button"
          onClick={() => onChange(value + 1)}
          className="w-7 h-7 rounded-lg bg-[#E30613]/10 text-[#E30613] font-bold text-base hover:bg-[#E30613]/20 transition-colors flex items-center justify-center">
          +
        </button>
      </div>
    </div>
  )
}

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

const curYear = new Date().getFullYear()
const YEARS   = [curYear, curYear + 1, curYear + 2]
const MONTHS  = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const DAYS    = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

function DateSelects({ value, onChange }) {
  const y = value.slice(0, 4)
  const m = value.slice(5, 7)
  const d = value.slice(8, 10)
  return (
    <div dir="ltr" className="flex items-center gap-1 rounded-xl border border-gray-200 px-2 bg-white focus-within:ring-2 focus-within:ring-[#E30613]/30 focus-within:border-[#E30613]">
      <select value={d} onChange={e => onChange(`${y}-${m}-${e.target.value}`)}
        className="flex-1 py-2.5 text-sm bg-transparent focus:outline-none text-center appearance-none">
        {DAYS.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
      <span className="text-gray-400 font-bold text-sm select-none">/</span>
      <select value={m} onChange={e => onChange(`${y}-${e.target.value}-${d}`)}
        className="flex-1 py-2.5 text-sm bg-transparent focus:outline-none text-center appearance-none">
        {MONTHS.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
      <span className="text-gray-400 font-bold text-sm select-none">/</span>
      <select value={y} onChange={e => onChange(`${e.target.value}-${m}-${d}`)}
        className="flex-1 py-2.5 text-sm bg-transparent focus:outline-none text-center appearance-none">
        {YEARS.map(v => <option key={v} value={String(v)}>{v}</option>)}
      </select>
    </div>
  )
}

const EMPTY_FORM = {
  title: '', description: '', location: '',
  start_time: todayAt(8), end_time: todayAt(14),
  max_volunteers: 1, branch_id: '', template_id: '', veteran_only: false,
  event_nature: '', expected_crowd: 0,
  motorcycle_count: 0, asn_count: 0, white_amb_count: 0, amb_4x4_count: 0,
  als_tent_count: 0, er_team_count: 0, hq_rep_count: 0, commander_count: 0,
  emt_count: 0, ops_manager_count: 0, atv_count: 0, paramedic_count: 0,
  taran: 0,
}

export default function CreateShift({ onShiftCreated }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [shiftType, setShiftType] = useState('regular')
  const [branches, setBranches] = useState([])
  const [templates, setTemplates] = useState([])
  const [saving, setSaving] = useState(false)
  const [error,   setError]   = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => { loadOptions() }, [])

  async function loadOptions() {
    try {
      const [{ data: b }, { data: t }] = await Promise.all([
        supabase.from('branches').select('id, name').eq('active', true).order('name'),
        supabase.from('shift_templates').select('*, branches(name)').eq('active', true).order('start_hour'),
      ])
      if (b) setBranches(b)
      if (t) setTemplates(t)
    } catch {}
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
    setError('')

    if (!isHoliday && new Date(form.end_time) <= new Date(form.start_time)) {
      setError('שעת הסיום חייבת להיות אחרי שעת ההתחלה')
      setSaving(false)
      return
    }

    const payload = {
      title:          form.title.trim(),
      description:    form.description.trim() || null,
      location:       form.location.trim() || null,
      start_time:     new Date(form.start_time).toISOString(),
      end_time:       new Date(form.end_time).toISOString(),
      max_volunteers: Number(form.max_volunteers),
      branch_id:      form.branch_id || null,
      template_id:    form.template_id || null,
      veteran_only:   form.veteran_only,
      shift_type:     shiftType,
      status:         shiftType === 'holiday' || form.veteran_only ? 'cancelled' : 'open',
      created_by:     user.id,
      ...(shiftType === 'event' ? {
        event_nature:      form.event_nature.trim() || null,
        expected_crowd:    Number(form.expected_crowd) || null,
        motorcycle_count:  form.motorcycle_count,
        asn_count:         form.asn_count,
        white_amb_count:   form.white_amb_count,
        amb_4x4_count:     form.amb_4x4_count,
        als_tent_count:    form.als_tent_count,
        er_team_count:     form.er_team_count,
        hq_rep_count:      form.hq_rep_count,
        commander_count:   form.commander_count,
        emt_count:         form.emt_count,
        ops_manager_count: form.ops_manager_count,
        atv_count:         form.atv_count,
        paramedic_count:   form.paramedic_count,
        taran:             form.taran,
      } : {}),
    }

    const { error: insertError } = await supabase.from('shifts').insert(payload)
    if (!insertError) {
      const msg = shiftType === 'holiday' ? 'יום החג נסגר בהצלחה' : 'המשמרת נוצרה בהצלחה!'
      toast(msg)
      await supabase.from('audit_logs').insert({
        user_id: user.id, action: 'shift_created', entity_type: 'shift',
        details: { title: payload.title, shift_type: payload.shift_type },
      })
      onShiftCreated?.(new Date(form.start_time).toISOString().slice(0, 10))
      setForm({ ...EMPTY_FORM, start_time: todayAt(8), end_time: todayAt(14) })
    } else {
      setError('שגיאה ביצירת המשמרת, נסה שנית')
    }
    setSaving(false)
  }

  const isHoliday = shiftType === 'holiday'
  const isEvent   = shiftType === 'event'

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

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-4">

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
            {isHoliday ? 'שם החג / הסיבה *' : isEvent ? 'שם האירוע *' : 'כותרת המשמרת *'}
          </label>
          <input required value={form.title} onChange={e => set('title', e.target.value)}
            placeholder={isHoliday ? 'למשל: יום כיפור' : isEvent ? 'למשל: מרתון תל אביב' : 'למשל: משמרת בוקר — תל אביב'}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
        </div>

        {/* Date/time */}
        {isHoliday ? (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">תאריך הסגירה *</label>
            <DateSelects
              value={form.start_time.slice(0, 10)}
              onChange={dateStr => {
                set('start_time', dateStr + 'T00:00')
                set('end_time',   dateStr + 'T23:59')
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {[
              { label: 'התחלה', key: 'start_time' },
              { label: 'סיום',  key: 'end_time'   },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">{label}</label>
                <div className="grid grid-cols-2 gap-2">
                  <DateSelects
                    value={form[key].slice(0, 10)}
                    onChange={dateStr => set(key, dateStr + 'T' + form[key].slice(11))}
                  />
                  <div dir="ltr" className="flex items-center gap-1 rounded-xl border border-gray-200 px-2 bg-white focus-within:ring-2 focus-within:ring-[#E30613]/30 focus-within:border-[#E30613]">
                    <select value={form[key].slice(11, 13)}
                      onChange={e => set(key, form[key].slice(0, 11) + e.target.value + ':' + form[key].slice(14))}
                      className="flex-1 py-2.5 text-sm bg-transparent focus:outline-none text-center appearance-none">
                      {Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=>(
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="text-gray-400 font-bold text-sm select-none">:</span>
                    <select value={form[key].slice(14, 16)}
                      onChange={e => set(key, form[key].slice(0, 14) + e.target.value)}
                      className="flex-1 py-2.5 text-sm bg-transparent focus:outline-none text-center appearance-none">
                      {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m=>(
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isHoliday && (
          <>
            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">מיקום</label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                placeholder='כתובת / עיר'
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
            </div>

            {/* Event-specific fields */}
            {isEvent && (
              <>
                {/* Nature + Crowd */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">אופי האירוע</label>
                    <input value={form.event_nature} onChange={e => set('event_nature', e.target.value)}
                      placeholder='כדורגל, ריצה...'
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">צפי קהל</label>
                    <input type="number" min="0" value={form.expected_crowd}
                      onChange={e => set('expected_crowd', Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
                  </div>
                </div>

                {/* Resource counters */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 text-right">כוח אדם וציוד</label>
                  <div className="grid grid-cols-4 gap-x-2 gap-y-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    {RESOURCE_FIELDS.map(({ key, label }) => (
                      <Stepper key={key} label={label} value={form[key]} onChange={v => set(key, v)} />
                    ))}
                  </div>
                </div>

              </>
            )}

            {/* Regular-only fields */}
            {!isEvent && (
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

                {/* Max volunteers */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">מספר מתנדבים מקסימלי</label>
                  <input type="number" min="1" max="100" value={form.max_volunteers}
                    onChange={e => set('max_volunteers', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
                </div>

                {/* Veteran only */}
                <div className="flex flex-col gap-1">
                  <label className="flex items-center justify-end gap-3 cursor-pointer select-none">
                    <span className="text-sm font-medium text-gray-700">בוגרים בלבד 🎖️</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={form.veteran_only}
                        onChange={e => set('veteran_only', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-purple-500 transition-colors" />
                      <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-all peer-checked:translate-x-4" />
                    </div>
                  </label>
                  {form.veteran_only && (
                    <p className="text-xs text-purple-600 text-right">המשמרת תיסגר למתנדבים — לבוגרים בלבד</p>
                  )}
                </div>
              </>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">תיאור</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={2} placeholder='פרטים נוספים...'
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] resize-none" />
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl justify-end">
            {error}
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-3 bg-[#E30613] text-white font-semibold rounded-xl shadow-sm shadow-red-500/20 disabled:opacity-50 active:scale-[0.98] transition-all">
          {saving ? '...יוצר' : isHoliday ? 'סגור יום' : isEvent ? 'יצירת אירוע' : 'יצירת משמרת'}
        </button>
      </form>
    </div>
  )
}
