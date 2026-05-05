import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCalendar } from '../contexts/CalendarContext'
import CalendarGrid, { isoDate } from '../components/CalendarGrid'

function formatHour(ts) {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}
function formatDuration(start, end) {
  const h = (new Date(end) - new Date(start)) / 3600000
  return Number.isInteger(h) ? `${h} שע׳` : `${h.toFixed(1)} שע׳`
}

const statusConfig = {
  open:      { label: 'פתוחה',   bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  assigned:  { label: 'מאוישת',  bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-400' },
  confirmed: { label: 'מאושרת',  bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',     dot: 'bg-sky-500' },
  completed: { label: 'הושלמה',  bg: 'bg-gray-100',   text: 'text-gray-500',    border: 'border-gray-200',    dot: 'bg-gray-400' },
  cancelled: { label: 'סגור',    bg: 'bg-gray-100',   text: 'text-gray-500',    border: 'border-gray-200',    dot: 'bg-gray-400' },
}

function shiftDot(shift) {
  if (shift.shift_type === 'event')   return 'bg-amber-400'
  if (shift.shift_type === 'holiday') return 'bg-gray-400'
  return 'bg-[#E30613]'
}

export default function Shifts() {
  const { user } = useAuth()
  const { year, month, prevMonth, nextMonth, refreshKey, invalidate } = useCalendar()
  const [shifts,        setShifts]        = useState([])
  const [blocked,       setBlocked]       = useState([])
  const [myAssignments, setMyAssignments] = useState({})
  const [confirmedMap,  setConfirmedMap]  = useState({})
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('open')
  const [selected, setSelected] = useState(null)
  const [acting,   setActing]   = useState(null)

  useEffect(() => { load() }, [year, month, refreshKey])

  async function load() {
    setLoading(true)
    const from    = isoDate(year, month, 1)
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to      = isoDate(year, month, lastDay) + 'T23:59:59'

    const [{ data: sh }, { data: as }, { data: bl }] = await Promise.all([
      supabase.from('shifts').select('*')
        .gte('start_time', from).lte('start_time', to)
        .order('start_time'),
      supabase.from('shift_assignments').select('*').eq('user_id', user.id),
      supabase.from('blocked_dates').select('date, reason')
        .gte('date', from).lte('date', to.slice(0, 10)),
    ])
    if (sh) setShifts(sh)
    if (as) {
      const map = {}
      as.forEach(a => { map[a.shift_id] = a })
      setMyAssignments(map)
    }
    if (bl) setBlocked(bl)

    const shiftIds = sh?.map(s => s.id) || []
    if (shiftIds.length) {
      const { data: confirmed } = await supabase
        .from('shift_assignments')
        .select('shift_id')
        .eq('status', 'confirmed')
        .in('shift_id', shiftIds)
      if (confirmed) {
        const cmap = {}
        confirmed.forEach(a => { cmap[a.shift_id] = (cmap[a.shift_id] || 0) + 1 })
        setConfirmedMap(cmap)
      }
    }

    setLoading(false)
  }

  async function applyForShift(shiftId) {
    setActing(shiftId)
    await supabase.from('shift_assignments').insert({ shift_id: shiftId, user_id: user.id, status: 'pending' })
    setActing(null)
    invalidate()
  }
  async function cancelAssignment(assignmentId, shiftId) {
    setActing(shiftId)
    await supabase.from('shift_assignments').delete().eq('id', assignmentId)
    setActing(null)
    invalidate()
  }

  const now = new Date()
  const displayShifts = shifts.filter(s =>
    s.shift_type !== 'holiday' && s.status !== 'cancelled' &&
    (filter === 'all' || s.status === 'open')
  )
  const selectedShifts  = selected ? displayShifts.filter(s => s.start_time.slice(0, 10) === selected) : []
  const selectedBlocked = selected ? blocked.find(b => b.date === selected) : null

  return (
    <div className="flex flex-col gap-4 pt-3 lg:pt-0">
      {/* Filter + legend row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[['open', 'פתוחות'], ['all', 'הכל']].map(([f, label]) => (
            <button key={f} onClick={() => { setFilter(f); setSelected(null); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-[#E30613] text-white shadow-md shadow-red-500/25'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            אירוע
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-[#E30613]" />
            משמרת
          </span>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr,380px] lg:gap-6 lg:items-start">
        <div className="min-w-0 lg:sticky lg:top-20 lg:self-start lg:pb-4">
          <CalendarGrid
            year={year} month={month}
            onPrev={() => { prevMonth(); setSelected(null) }}
            onNext={() => { nextMonth(); setSelected(null) }}
            shifts={displayShifts}
            blocked={blocked}
            dotFn={shiftDot}
            loading={loading}
            selected={selected}
            onSelect={setSelected}
          />
        </div>

        <div className="min-w-0 mt-4 lg:mt-0 flex flex-col gap-3">
          {/* placeholder so the right column isn't empty when nothing is selected */}
          {!selected && (
            <div className="hidden lg:flex flex-col items-center justify-center gap-2 py-20 text-center text-gray-300">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
              </svg>
              <p className="text-sm">בחר יום לצפייה במשמרות</p>
            </div>
          )}

      {/* Day detail panel */}
      {selected && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="font-bold text-gray-900 text-sm text-right">
              {(() => { const d = new Date(selected + 'T12:00:00'); return `${d.toLocaleDateString('he-IL',{weekday:'long'})} · ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}` })()}
            </span>
          </div>

          {selectedBlocked && (
            <div className="flex items-center justify-end gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="text-sm text-gray-600 font-medium">{selectedBlocked.reason || 'יום חסום'}</span>
              <span className="text-lg">🔒</span>
            </div>
          )}

          {selectedShifts.length === 0 && !selectedBlocked ? (
            <p className="text-gray-400 text-sm text-center py-3">אין משמרות ביום זה</p>
          ) : (
            selectedShifts.map(shift => {
              const assignment = myAssignments[shift.id]
              const isPast     = new Date(shift.start_time) <= now
              const statusCfg  = statusConfig[shift.status] || statusConfig.open
              const isEvent    = shift.shift_type === 'event'
              const isFull     = shift.max_volunteers > 0 && (confirmedMap[shift.id] || 0) >= shift.max_volunteers

              return (
                <div key={shift.id} className={`flex flex-col gap-3 rounded-2xl border p-3.5 ${
                  isEvent ? 'border-amber-100 bg-amber-50/30' : 'border-gray-100 bg-gray-50/40'
                }`}>
                  {isEvent && (
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-xs font-bold text-amber-700">אירוע מיוחד</span>
                      <span>⭐</span>
                    </div>
                  )}

                  <div className="text-right">
                    <p className="font-bold text-gray-900 text-sm">{shift.title}</p>
                    {shift.description && (
                      <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{shift.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-4 text-xs text-gray-500">
                    {shift.location && (
                      <span className="flex items-center gap-1.5">
                        {shift.location}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      {formatHour(shift.start_time)} – {formatHour(shift.end_time)}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {formatDuration(shift.start_time, shift.end_time)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      {statusCfg.label}
                    </span>

                    {!isPast && shift.status === 'open' && (
                      isFull && !assignment ? (
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-50 text-red-500 border border-red-100">
                          המשמרת מלאה
                        </span>
                      ) : assignment ? (
                        <div className="flex items-center gap-2">
                          {assignment.status === 'pending' && (
                            <button onClick={() => cancelAssignment(assignment.id, shift.id)} disabled={acting === shift.id}
                              className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium">
                              ביטול
                            </button>
                          )}
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                            assignment.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                            assignment.status === 'declined'  ? 'bg-red-50 text-red-600' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {assignment.status === 'pending'   ? '⏳ נרשמת' :
                             assignment.status === 'confirmed' ? '✓ מאושר' : '✗ נדחה'}
                          </span>
                        </div>
                      ) : (
                        <button onClick={() => applyForShift(shift.id)} disabled={acting === shift.id}
                          className="py-2 px-4 bg-[#E30613] text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm shadow-red-500/25">
                          {acting === shift.id ? '...' : 'הרשמה'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
        </div>{/* right column */}
      </div>{/* desktop grid */}
    </div>
  )
}
