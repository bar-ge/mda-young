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

export default function ShiftsList({ typeFilter = null }) {
  const { year, month, refreshKey } = useCalendar()
  const [shifts,       setShifts]       = useState([])
  const [countMap,     setCountMap]     = useState({})
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState('all')
  const [expandedId,   setExpandedId]   = useState(null)
  const [volunteersMap, setVolunteersMap] = useState({})
  const [loadingVols,  setLoadingVols]  = useState(null)

  useEffect(() => { load() }, [year, month, refreshKey])

  async function load() {
    setLoading(true)
    setExpandedId(null)
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

  async function toggleExpand(shiftId) {
    if (expandedId === shiftId) {
      setExpandedId(null)
      return
    }
    setExpandedId(shiftId)
    if (volunteersMap[shiftId]) return

    setLoadingVols(shiftId)
    const { data: asgn } = await supabase
      .from('shift_assignments')
      .select('id, user_id, manual_name, status')
      .eq('shift_id', shiftId)
      .eq('status', 'confirmed')

    if (asgn) {
      const userIds = asgn.filter(a => a.user_id).map(a => a.user_id)
      let profileMap = {}
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('profiles').select('id, full_name, phone').in('id', userIds)
        profs?.forEach(p => { profileMap[p.id] = p })
      }

      const volunteers = asgn.map(a => ({
        id: a.id,
        name: a.manual_name || profileMap[a.user_id]?.full_name || 'לא ידוע',
        phone: profileMap[a.user_id]?.phone || null,
        isManual: !!a.manual_name,
      }))
      setVolunteersMap(prev => ({ ...prev, [shiftId]: volunteers }))
    }
    setLoadingVols(null)
  }

  const monthName = new Date(year, month, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })

  const filtered = shifts.filter(s => {
    if (typeFilter && s.shift_type !== typeFilter) return false
    if (filter === 'open')   return s.status !== 'cancelled'
    if (filter === 'closed') return s.status === 'cancelled'
    return true
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{filtered.length} {typeFilter === 'event' ? 'אירועים' : 'משמרות'}</span>
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
          <p className="text-gray-400 text-sm">{typeFilter === 'event' ? 'אין אירועים בחודש זה' : 'אין משמרות בחודש זה'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(shift => {
            const cfg       = statusCfg[shift.status] || statusCfg.open
            const confirmed = countMap[shift.id] || 0
            const isFull    = shift.max_volunteers > 0 && confirmed >= shift.max_volunteers
            const isExpanded = expandedId === shift.id
            const vols      = volunteersMap[shift.id]

            return (
              <div key={shift.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                shift.status === 'cancelled' ? 'border-gray-100 opacity-60' : 'border-gray-100'
              }`}>
                {/* Clickable row */}
                <button
                  onClick={() => toggleExpand(shift.id)}
                  className="w-full px-4 py-3 flex flex-col gap-1.5 text-right active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Left: chevron + status + capacity */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
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
                </button>

                {/* Expanded volunteer list */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3" dir="rtl">
                    {loadingVols === shift.id ? (
                      <div className="flex justify-center py-3">
                        <div className="w-4 h-4 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : !vols || vols.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">אין מתנדבים מאושרים</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">מתנדבים מאושרים</p>
                        {vols.map(v => (
                          <div key={v.id} className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100">
                            <div className="flex items-center gap-2">
                              {v.phone && (
                                <a href={`tel:${v.phone}`} onClick={e => e.stopPropagation()}
                                  className="text-[10px] text-sky-600 font-medium">
                                  {v.phone}
                                </a>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                v.isManual
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {v.isManual ? 'ידני' : 'אפליקציה'}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-800">{v.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
