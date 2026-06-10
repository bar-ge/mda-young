import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'

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

function toLocal(ts) {
  const d = new Date(ts)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const YEARS  = [2025, 2026, 2027, 2028]
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const DAYS   = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

function DateSelects({ value, onChange }) {
  const y = value.slice(0, 4), m = value.slice(5, 7), d = value.slice(8, 10)
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

function Stepper({ label, value, onChange }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] font-semibold text-gray-500 text-center leading-tight">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))}
          className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 font-bold text-base hover:bg-gray-200 transition-colors flex items-center justify-center">−</button>
        <span className={`w-7 text-center text-sm font-bold tabular-nums ${value > 0 ? 'text-[#E30613]' : 'text-gray-300'}`}>{value}</span>
        <button type="button" onClick={() => onChange(value + 1)}
          className="w-9 h-9 rounded-lg bg-[#E30613]/10 text-[#E30613] font-bold text-base hover:bg-[#E30613]/20 transition-colors flex items-center justify-center">+</button>
      </div>
    </div>
  )
}

export default function EditEventPanel({ shift, onClose, onSaved }) {
  const { toast } = useToast()

  const [form, setForm] = useState({
    title:             shift.title          || '',
    location:          shift.location       || '',
    start_time:        toLocal(shift.start_time),
    end_time:          toLocal(shift.end_time),
    event_nature:      shift.event_nature   || '',
    expected_crowd:    shift.expected_crowd || 0,
    motorcycle_count:  shift.motorcycle_count  || 0,
    asn_count:         shift.asn_count         || 0,
    white_amb_count:   shift.white_amb_count   || 0,
    amb_4x4_count:     shift.amb_4x4_count     || 0,
    als_tent_count:    shift.als_tent_count     || 0,
    er_team_count:     shift.er_team_count      || 0,
    hq_rep_count:      shift.hq_rep_count       || 0,
    commander_count:   shift.commander_count    || 0,
    emt_count:         shift.emt_count          || 0,
    ops_manager_count: shift.ops_manager_count  || 0,
    atv_count:         shift.atv_count          || 0,
    paramedic_count:   shift.paramedic_count    || 0,
    taran:             shift.taran              || 0,
    description:       shift.description        || '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave() {
    if (!form.title.trim()) { setError('שם האירוע הוא שדה חובה'); return }
    if (new Date(form.end_time) <= new Date(form.start_time)) { setError('שעת הסיום חייבת להיות אחרי שעת ההתחלה'); return }
    setSaving(true); setError('')

    const { error: err } = await supabase.from('shifts').update({
      title:             form.title.trim(),
      location:          form.location.trim() || null,
      start_time:        new Date(form.start_time).toISOString(),
      end_time:          new Date(form.end_time).toISOString(),
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
      description:       form.description.trim() || null,
    }).eq('id', shift.id)

    setSaving(false)
    if (err) { setError('שגיאה בשמירה — נסה שנית'); return }
    toast('האירוע עודכן בהצלחה')
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:justify-center lg:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-3xl lg:rounded-3xl w-full lg:max-w-lg max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 py-3 rounded-t-3xl z-10 shrink-0">
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <span className="font-bold text-gray-900 text-sm">עריכת אירוע</span>
          <button onClick={handleSave} disabled={saving}
            className="text-[#E30613] font-bold text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-all">
            {saving ? 'שומר...' : 'שמירה'}
          </button>
        </div>

        {/* Scrollable form */}
        <div className="overflow-y-auto flex-1 px-4 py-4 flex flex-col gap-4" dir="rtl">

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">שם האירוע *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
          </div>

          {/* Start time */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">התחלה</label>
            <div className="grid grid-cols-2 gap-2">
              <DateSelects value={form.start_time.slice(0,10)}
                onChange={d => set('start_time', d + 'T' + form.start_time.slice(11))} />
              <div dir="ltr" className="flex items-center gap-1 rounded-xl border border-gray-200 px-2 bg-white focus-within:ring-2 focus-within:ring-[#E30613]/30 focus-within:border-[#E30613]">
                <select value={form.start_time.slice(11,13)}
                  onChange={e => set('start_time', form.start_time.slice(0,11) + e.target.value + ':' + form.start_time.slice(14))}
                  className="flex-1 py-2.5 text-sm bg-transparent focus:outline-none text-center appearance-none">
                  {Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=><option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-gray-400 font-bold text-sm">:</span>
                <select value={form.start_time.slice(14,16)}
                  onChange={e => set('start_time', form.start_time.slice(0,14) + e.target.value)}
                  className="flex-1 py-2.5 text-sm bg-transparent focus:outline-none text-center appearance-none">
                  {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* End time */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">סיום</label>
            <div className="grid grid-cols-2 gap-2">
              <DateSelects value={form.end_time.slice(0,10)}
                onChange={d => set('end_time', d + 'T' + form.end_time.slice(11))} />
              <div dir="ltr" className="flex items-center gap-1 rounded-xl border border-gray-200 px-2 bg-white focus-within:ring-2 focus-within:ring-[#E30613]/30 focus-within:border-[#E30613]">
                <select value={form.end_time.slice(11,13)}
                  onChange={e => set('end_time', form.end_time.slice(0,11) + e.target.value + ':' + form.end_time.slice(14))}
                  className="flex-1 py-2.5 text-sm bg-transparent focus:outline-none text-center appearance-none">
                  {Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=><option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-gray-400 font-bold text-sm">:</span>
                <select value={form.end_time.slice(14,16)}
                  onChange={e => set('end_time', form.end_time.slice(0,14) + e.target.value)}
                  className="flex-1 py-2.5 text-sm bg-transparent focus:outline-none text-center appearance-none">
                  {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Location + nature + crowd */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">מיקום</label>
            <input value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="כתובת / עיר"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">אופי האירוע</label>
              <input value={form.event_nature} onChange={e => set('event_nature', e.target.value)}
                placeholder="כדורגל, ריצה..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">צפי קהל</label>
              <input type="number" min="0" value={form.expected_crowd}
                onChange={e => set('expected_crowd', Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]" />
            </div>
          </div>

          {/* Resource steppers */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">כוח אדם וציוד</label>
            <div className="grid grid-cols-4 gap-x-2 gap-y-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
              {RESOURCE_FIELDS.map(({ key, label }) => (
                <Stepper key={key} label={label} value={form[key]} onChange={v => set(key, v)} />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">תיאור</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="פרטים נוספים..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613] resize-none" />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Save button (also at bottom for long scroll) */}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 bg-[#E30613] text-white font-bold rounded-xl shadow-sm shadow-red-500/20 disabled:opacity-50 active:scale-[0.98] transition-all mb-2">
            {saving ? 'שומר...' : 'שמירת שינויים'}
          </button>
        </div>
      </div>
    </div>
  )
}
