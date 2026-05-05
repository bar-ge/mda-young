import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useCalendar } from '../../contexts/CalendarContext'
import { isoDate } from '../../components/CalendarGrid'

function formatDate(ts) {
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
}
function formatHour(ts) {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

const statusCfg = {
  open:      { label: 'פתוחה',  bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  assigned:  { label: 'מאוישת', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  confirmed: { label: 'מאושרת', bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500'     },
  completed: { label: 'הושלמה', bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400'    },
  cancelled: { label: 'סגורה',  bg: 'bg-gray-100',   text: 'text-gray-400',    dot: 'bg-gray-300'    },
}
const typeDot = {
  regular: 'bg-[#E30613]',
  event:   'bg-amber-400',
  holiday: 'bg-gray-400',
}

export default function ShiftsList() {
  const { year, month, refreshKey } = useCalendar()
  const [shifts,   setShifts]   = useState([])
  const [countMap, setCountMap] = useState({})
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')

  useEffect(() => { load() }, [year, month, refreshKey])

  async function load() {
    setLoading(true)
    const from    = isoDate(year, month, 1)
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to      = isoDate(year, month, lastDay) + 'T23:59:59'

    const { data: sh } = await supabase
      .from('shifts').select('*')
      .gte('start_time', from).lte('start_time', to)
      .order('start_time')

    if (sh) {
      setShifts(sh)
      const ids = sh.map(s => s.id)
      if (ids.length) {
        const { data: ca } = await supabase
          .from('shift_assignments').select('shift_id')
          .eq('status', 'confirmed').in('shift_id', ids)
        const cmap = {}
        ca?.forEach(a => { cmap[a.shift_id] = (cmap[a.shift_id] || 0) + 1 })
        setCountMap(cmap)
      }
    }
    setLoading(false)
  }

  const monthName = new Date(year, month, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })

  const filtered = shifts.filter(s => {
    if (filter === 'open')   return s.status !== 'cancelled'
    if (filter === 'closed') return s.status === 'cancelled'
    return true
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{filtered.length} משמרות</span>
        <span className="text-xs font-semibold text-gray-500">{monthName}</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[['all', 'הכל'], ['open', 'פתוחות'], ['closed', 'סגורות']].map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === f
                ? 'bg-[#E30613] text-white shadow-md shadow-red-500/25'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <span className="text-4xl">📅</span>
          <p className="text-gray-400 text-sm">אין משמרות בחודש זה</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(shift => {
            const cfg       = statusCfg[shift.status] || statusCfg.open
            const confirmed = countMap[shift.id] || 0
            const isFull    = shift.max_volunteers > 0 && confirmed >= shift.max_volunteers

            return (
              <div key={shift.id} className={`bg-white rounded-2xl border shadow-sm px-4 py-3 flex flex-col gap-1.5 ${
                shift.status === 'cancelled' ? 'border-gray-100 opacity-60' : 'border-gray-100'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  {/* Left: status + capacity */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                    {shift.max_volunteers > 0 && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isFull
                          ? 'bg-red-50 text-red-600 border-red-100'
                          : confirmed > 0
                          ? 'bg-sky-50 text-sky-700 border-sky-100'
                          : 'bg-gray-50 text-gray-400 border-gray-100'
                      }`}>
                        {confirmed}/{shift.max_volunteers}
                      </span>
                    )}
                    {shift.veteran_only && <span className="text-xs">🎖️</span>}
                  </div>
                  {/* Right: title */}
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${shift.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {shift.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${typeDot[shift.shift_type] || 'bg-gray-400'}`} />
                    {shift.location && <span className="text-[10px] text-gray-400">{shift.location}</span>}
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatDate(shift.start_time)} · {formatHour(shift.start_time)}–{formatHour(shift.end_time)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
