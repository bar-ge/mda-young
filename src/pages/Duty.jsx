import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useCalendar } from '../contexts/CalendarContext'
import CalendarGrid, { isoDate } from '../components/CalendarGrid'

function formatHour(ts) {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

function vehicleDot() { return 'bg-blue-500' }

export default function Duty() {
  const { year, month, prevMonth, nextMonth, refreshKey } = useCalendar()
  const [shifts,   setShifts]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [pulling,  setPulling]  = useState(false)
  const [pullY,    setPullY]    = useState(0)
  const touchStartY  = useRef(0)
  const containerRef = useRef(null)

  useEffect(() => { load() }, [year, month, refreshKey])

  async function load() {
    setLoading(true)
    const from    = isoDate(year, month, 1)
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to      = isoDate(year, month, lastDay) + 'T23:59:59'

    const { data } = await supabase
      .from('duty_shifts')
      .select('*, duty_vehicles(*), driver:profiles!duty_shifts_driver_id_fkey(id,full_name,phone)')
      .gte('start_time', from)
      .lte('start_time', to)
      .neq('status', 'cancelled')
      .order('start_time')

    if (data) setShifts(data)
    setLoading(false)
  }

  function onTouchStart(e) { touchStartY.current = e.touches[0].clientY }
  function onTouchMove(e) {
    const delta = e.touches[0].clientY - touchStartY.current
    if (containerRef.current?.scrollTop === 0 && delta > 0 && !loading)
      setPullY(Math.min(delta * 0.4, 60))
  }
  function onTouchEnd() {
    if (pullY >= 55) { setPulling(true); load().finally(() => setPulling(false)) }
    setPullY(0)
  }

  // build calendar-compatible objects (need start_time at top level)
  const calShifts = shifts.map(s => ({ ...s, start_time: s.start_time }))

  const selectedShifts = selected
    ? shifts.filter(s => s.start_time.slice(0, 10) === selected)
    : []

  // count per date for calendar badge
  const countMap = {}
  shifts.forEach(s => {
    const d = s.start_time.slice(0, 10)
    countMap[d] = (countMap[d] || 0) + 1
  })

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
          <div className={`w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full ${pulling ? 'animate-spin' : ''}`}
            style={{ opacity: pullY / 55, transform: `rotate(${pullY * 4}deg)` }} />
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-3 lg:shrink-0">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          כוננות
        </span>
      </div>

      <div className="lg:flex lg:gap-6 lg:flex-1 lg:min-h-0">
        <div className={`min-w-0 lg:h-full lg:overflow-hidden ${selected ? 'lg:flex-1' : 'lg:w-full'}`}>
          <CalendarGrid
            year={year} month={month}
            onPrev={() => { prevMonth(); setSelected(null) }}
            onNext={() => { nextMonth(); setSelected(null) }}
            shifts={calShifts}
            dotFn={vehicleDot}
            loading={loading}
            selected={selected}
            onSelect={setSelected}
            countMap={countMap}
          />
        </div>

        {selected && (
          <div className="min-w-0 mt-4 lg:mt-0 lg:w-[380px] lg:shrink-0 lg:h-full lg:flex lg:flex-col">
            <div className="hidden lg:block lg:h-11 lg:shrink-0" />
            <div className="flex flex-col gap-3 lg:flex-1 lg:min-h-0 lg:overflow-y-auto scrollbar-hide">

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <button onClick={() => setSelected(null)} aria-label="סגור" className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <span className="font-bold text-gray-900 text-sm text-right">
                    {(() => { const d = new Date(selected + 'T12:00:00'); return `${d.toLocaleDateString('he-IL',{weekday:'long'})} · ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}` })()}
                  </span>
                </div>

                {selectedShifts.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-3">אין כוננות ביום זה</p>
                ) : (
                  selectedShifts.map(shift => {
                    const v = shift.duty_vehicles
                    return (
                      <div key={shift.id} className="flex flex-col gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/30 p-3.5">
                        {/* Vehicle name */}
                        <div className="text-right">
                          <p className="font-bold text-gray-900 text-sm">{v?.name}</p>
                        </div>

                        {/* Time */}
                        <div className="flex items-center justify-end gap-1.5 text-xs text-gray-500">
                          <span>{formatHour(shift.start_time)} – {formatHour(shift.end_time)}</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                        </div>

                        {/* Driver */}
                        <div className={`flex items-center justify-end gap-2 rounded-xl px-3 py-2 ${
                          shift.driver ? 'bg-emerald-50' : 'bg-amber-50'
                        }`}>
                          {shift.driver ? (
                            <>
                              <span className="text-xs text-emerald-700 font-medium">{shift.driver.full_name}</span>
                              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16z" fill="currentColor" className="text-emerald-500"/>
                              </svg>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-amber-700 font-medium">לא שובץ נהג</span>
                              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                              </svg>
                            </>
                          )}
                        </div>

                        {shift.notes && (
                          <p className="text-gray-400 text-xs text-right">{shift.notes}</p>
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
