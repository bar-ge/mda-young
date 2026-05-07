import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCalendar } from '../contexts/CalendarContext'
import CalendarGrid from '../components/CalendarGrid'

function formatHour(ts) {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

const statusConfig = {
  pending:   { label: 'ממתין לאישור', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   border: 'border-amber-100'   },
  confirmed: { label: 'מאושר',        bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-100' },
  declined:  { label: 'נדחה',         bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-400',     border: 'border-red-100'     },
}

function assignmentDot(a) {
  return statusConfig[a.status]?.dot || 'bg-gray-400'
}

export default function MyShifts() {
  const { user } = useAuth()
  const { year, month, prevMonth, nextMonth, refreshKey } = useCalendar()
  const [assignments, setAssignments] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState(null)
  const [pulling,   setPulling]   = useState(false)
  const [pullY,     setPullY]     = useState(0)
  const touchStartY  = useRef(0)
  const containerRef = useRef(null)

  useEffect(() => { load() }, [refreshKey])
  useEffect(() => { setSelected(null) }, [year, month])

  async function load() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('shift_assignments')
        .select('*, shifts(*)')
        .eq('user_id', user.id)
        .order('assigned_at', { ascending: false })
      if (data) setAssignments(data)
    } finally {
      setLoading(false)
    }
  }

  function onTouchStart(e) { touchStartY.current = e.touches[0].clientY }
  function onTouchMove(e) {
    const delta = e.touches[0].clientY - touchStartY.current
    const atTop = containerRef.current?.scrollTop === 0
    if (atTop && delta > 0 && !loading) setPullY(Math.min(delta * 0.4, 60))
  }
  function onTouchEnd() {
    if (pullY >= 55) { setPulling(true); load().finally(() => setPulling(false)) }
    setPullY(0)
  }

  // Stats use all assignments (not month-scoped)
  const now = new Date()
  const upcoming       = assignments.filter(a => a.shifts && new Date(a.shifts.start_time) > now)
  const confirmedCount = upcoming.filter(a => a.status === 'confirmed').length
  const pendingCount   = upcoming.filter(a => a.status === 'pending').length

  // Calendar shows only current month's assignments
  const monthPrefix    = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthAssignments = assignments.filter(a => a.shifts?.start_time?.startsWith(monthPrefix))

  // CalendarGrid expects objects with start_time at top level
  const calShifts = monthAssignments
    .filter(a => a.shifts)
    .map(a => ({ ...a, start_time: a.shifts.start_time }))

  const selectedAssignments = selected
    ? monthAssignments.filter(a => a.shifts?.start_time?.slice(0, 10) === selected)
    : []

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="flex flex-col gap-4 pt-3 lg:pt-0 lg:h-[calc(100svh-7.5rem)] lg:overflow-hidden"
    >
      {(pullY > 0 || pulling) && (
        <div className="flex justify-center transition-all" style={{ height: pulling ? 32 : pullY * 0.5 }}>
          <div className={`w-5 h-5 border-2 border-[#E30613] border-t-transparent rounded-full ${pulling ? 'animate-spin' : ''}`}
            style={{ opacity: pullY / 55, transform: `rotate(${pullY * 4}deg)` }} />
        </div>
      )}
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:shrink-0">
        <div className="bg-white rounded-2xl border border-amber-100/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-1 items-end overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-amber-50 -translate-y-5 translate-x-5 opacity-70" />
          <span className="text-3xl font-black text-amber-500 relative tracking-tight">{pendingCount}</span>
          <span className="text-xs text-gray-500 font-semibold relative">ממתין לאישור</span>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-1 items-end overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-emerald-50 -translate-y-5 translate-x-5 opacity-70" />
          <span className="text-3xl font-black text-emerald-600 relative tracking-tight">{confirmedCount}</span>
          <span className="text-xs text-gray-500 font-semibold relative">מאושרות</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-3 lg:shrink-0">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        ))}
      </div>

      <div className="lg:flex lg:gap-6 lg:flex-1 lg:min-h-0">
        <div className={`min-w-0 lg:h-full lg:overflow-hidden ${selected ? 'lg:flex-1' : 'lg:w-full'}`}>
          <CalendarGrid
            year={year} month={month}
            onPrev={() => { prevMonth(); setSelected(null) }}
            onNext={() => { nextMonth(); setSelected(null) }}
            shifts={calShifts}
            dotFn={assignmentDot}
            loading={loading}
            selected={selected}
            onSelect={setSelected}
          />
        </div>

      {/* Day detail panel */}
      {selected && (
        <div className="min-w-0 mt-4 lg:mt-0 lg:w-[380px] lg:shrink-0 lg:h-full lg:flex lg:flex-col">
          <div className="hidden lg:block lg:h-11 lg:shrink-0" />
          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto scrollbar-hide">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelected(null)} aria-label="סגור" className="p-2 -m-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="font-bold text-gray-900 text-sm text-right">
              {(() => { const d = new Date(selected + 'T12:00:00'); return `${d.toLocaleDateString('he-IL',{weekday:'long'})} · ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}` })()}
            </span>
          </div>

          {selectedAssignments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-3">אין משמרות ביום זה</p>
          ) : (
            selectedAssignments.map(a => {
              const shift = a.shifts
              const cfg   = statusConfig[a.status] || statusConfig.pending
              const isFuture = new Date(shift.start_time) > now

              return (
                <div key={a.id} className={`flex flex-col gap-2.5 rounded-2xl border p-3.5 ${cfg.border} ${cfg.bg}/20`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`shrink-0 flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    <div className="flex-1 text-right">
                      <p className="font-bold text-gray-900 text-sm">{shift.title}</p>
                      {shift.description && (
                        <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{shift.description}</p>
                      )}
                    </div>
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
                  </div>

                  {a.status === 'confirmed' && isFuture && (
                    <div className="flex items-center justify-end gap-1.5 bg-emerald-50 rounded-xl px-3 py-2">
                      <span className="text-xs text-emerald-700 font-medium">אתה מאושר למשמרת זו</span>
                      <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
