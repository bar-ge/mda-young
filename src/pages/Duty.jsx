import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCalendar } from '../contexts/CalendarContext'
import { useToast } from '../contexts/ToastContext'
import CalendarGrid, { isoDate } from '../components/CalendarGrid'

function vehicleDot() { return 'bg-blue-500' }

export default function Duty() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const { year, month, prevMonth, nextMonth, refreshKey } = useCalendar()

  const [vehicles,    setVehicles]    = useState([])
  const [monthShifts, setMonthShifts] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState(null)
  const [assigningId, setAssigningId] = useState(null)
  const [driverText,  setDriverText]  = useState('')
  const [saving,      setSaving]      = useState(false)
  const [pulling,     setPulling]     = useState(false)
  const [pullY,       setPullY]       = useState(0)
  const touchStartY  = useRef(0)
  const containerRef = useRef(null)

  const isManager = profile?.role === 'admin' || profile?.role === 'dispatcher'

  useEffect(() => { load() }, [year, month, refreshKey])

  async function load() {
    setLoading(true)
    const from    = isoDate(year, month, 1)
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to      = isoDate(year, month, lastDay) + 'T23:59:59'

    const [{ data: veh }, { data: sh }] = await Promise.all([
      supabase.from('duty_vehicles').select('*').eq('status', 'active').order('name'),
      supabase.from('duty_shifts')
        .select('*, driver:profiles!duty_shifts_driver_id_fkey(id,full_name)')
        .gte('start_time', from).lte('start_time', to)
        .neq('status', 'cancelled'),
    ])
    if (veh) setVehicles(veh)
    if (sh)  setMonthShifts(sh)
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

  // Assign driver: upsert duty_shift for vehicle+date
  async function handleAssign(vehicle, dateStr) {
    const name = driverText.trim()
    if (!name) return
    setSaving(true)
    const existing = monthShifts.find(s => s.vehicle_id === vehicle.id && s.start_time.slice(0, 10) === dateStr)
    let error
    if (existing) {
      ;({ error } = await supabase.from('duty_shifts')
        .update({ driver_name: name, status: 'assigned' }).eq('id', existing.id))
    } else {
      ;({ error } = await supabase.from('duty_shifts').insert({
        vehicle_id:  vehicle.id,
        driver_name: name,
        start_time:  `${dateStr}T07:00:00`,
        end_time:    `${dateStr}T19:00:00`,
        status:      'assigned',
      }))
    }
    setSaving(false)
    if (error) { toast('שגיאה בשיבוץ', { type: 'error' }); return }
    toast('הנהג שובץ בהצלחה', { type: 'success' })
    setAssigningId(null); setDriverText('')
    load()
  }

  async function handleUnassign(shiftId) {
    const { error } = await supabase.from('duty_shifts')
      .update({ driver_id: null, driver_name: null, status: 'open' }).eq('id', shiftId)
    if (!error) { toast('שיבוץ בוטל'); load() }
    else toast('שגיאה', { type: 'error' })
  }

  // Build calendar dots: for each day in month, create virtual entries per available vehicle
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calShifts = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = isoDate(year, month, d)
    const weekday = new Date(dateStr + 'T12:00:00').getDay()
    vehicles.forEach(v => {
      if ((v.available_days || []).includes(weekday)) {
        calShifts.push({ id: `${v.id}-${dateStr}`, start_time: dateStr + 'T00:00:00' })
      }
    })
  }

  // Count vehicles per day for badge
  const countMap = {}
  calShifts.forEach(s => {
    const d = s.start_time.slice(0, 10)
    countMap[d] = (countMap[d] || 0) + 1
  })

  // Vehicles available on the selected day (by weekday)
  const selectedWeekday = selected ? new Date(selected + 'T12:00:00').getDay() : -1
  const selectedVehicles = selected
    ? vehicles.filter(v => (v.available_days || []).includes(selectedWeekday))
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
          <div className={`w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full ${pulling ? 'animate-spin' : ''}`}
            style={{ opacity: pullY / 55, transform: `rotate(${pullY * 4}deg)` }} />
        </div>
      )}

      {/* All vehicles list (collapsed summary) */}
      {!selected && !loading && vehicles.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-end lg:shrink-0">
          {vehicles.map(v => (
            <span key={v.id} className="flex items-center gap-1.5 bg-white border border-blue-100 text-blue-700 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {v.name}
            </span>
          ))}
        </div>
      )}

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
            onSelect={d => { setSelected(d); setAssigningId(null) }}
            countMap={countMap}
          />
        </div>

        {selected && (
          <div className="min-w-0 mt-4 lg:mt-0 lg:w-[380px] lg:shrink-0 lg:h-full lg:flex lg:flex-col">
            <div className="hidden lg:block lg:h-11 lg:shrink-0" />
            <div className="flex flex-col gap-3 lg:flex-1 lg:min-h-0 lg:overflow-y-auto scrollbar-hide">

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
                {/* Header */}
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

                {selectedVehicles.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-3">אין רכבי כונן ביום זה</p>
                ) : (
                  selectedVehicles.map(v => {
                    const shift = monthShifts.find(s => s.vehicle_id === v.id && s.start_time.slice(0, 10) === selected)
                    const isAssigning = assigningId === v.id

                    return (
                      <div key={v.id} className="flex flex-col gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/30 p-3.5">
                        {/* Vehicle name */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-base shrink-0">🚑</div>
                          <p className="flex-1 font-bold text-gray-900 text-sm text-right">{v.name}</p>
                        </div>

                        {/* Driver status */}
                        {shift?.driver_name ? (
                          <div className="flex items-center justify-between gap-2 bg-emerald-50 rounded-xl px-3 py-2">
                            {isManager && (
                              <button onClick={() => handleUnassign(shift.id)}
                                className="text-[10px] text-gray-400 hover:text-red-500 font-medium transition-colors">
                                הסר
                              </button>
                            )}
                            <div className="flex items-center gap-1.5 mr-auto">
                              <span className="text-xs text-emerald-700 font-semibold">{shift.driver_name}</span>
                              <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2 bg-amber-50 rounded-xl px-3 py-2">
                            {isManager && !isAssigning && (
                              <button onClick={() => setAssigningId(v.id)}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                + שבץ נהג
                              </button>
                            )}
                            <span className="text-xs text-amber-700 font-medium">לא שובץ נהג</span>
                            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                            </svg>
                          </div>
                        )}

                        {/* Inline text input */}
                        {isManager && isAssigning && (
                          <div className="flex gap-2 items-center">
                            <button onClick={() => { setAssigningId(null); setDriverText('') }}
                              className="shrink-0 text-[10px] text-gray-400 hover:text-red-500 font-medium transition-colors">
                              ביטול
                            </button>
                            <button onClick={() => handleAssign(v, selected)} disabled={saving || !driverText.trim()}
                              className="shrink-0 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-blue-700 transition-all">
                              {saving ? '...' : 'שבץ'}
                            </button>
                            <input
                              autoFocus
                              value={driverText}
                              onChange={e => setDriverText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAssign(v, selected)}
                              placeholder="שם הנהג"
                              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-right"
                            />
                          </div>
                        )}

                        {/* Reassign link */}
                        {isManager && shift?.driver_name && !isAssigning && (
                          <button onClick={() => { setAssigningId(v.id); setDriverText(shift.driver_name) }}
                            className="text-[10px] text-blue-500 hover:text-blue-700 font-medium text-right transition-colors">
                            החלף נהג
                          </button>
                        )}

                        {v.notes && <p className="text-gray-400 text-xs text-right">{v.notes}</p>}
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
