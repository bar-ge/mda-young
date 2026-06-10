import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCalendar } from '../contexts/CalendarContext'
import { useToast } from '../contexts/ToastContext'
import CalendarGrid, { isoDate } from '../components/CalendarGrid'

function vehicleDot(s) { return s.hasDriver ? 'bg-emerald-500' : 'bg-amber-400' }

// --- week helpers ---
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function weekStartSunday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - d.getDay())
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function formatDM(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
}
function formatDMY(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
const DAYS_HE = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳']

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

  // week export state
  const [weekMode,    setWeekMode]    = useState(false)
  const [weekStart,   setWeekStart]   = useState(() => weekStartSunday(new Date().toISOString().slice(0,10)))
  const [weekShifts,  setWeekShifts]  = useState([])
  const [weekLoading, setWeekLoading] = useState(false)
  const [exporting,   setExporting]   = useState(false)
  const weekGridRef = useRef(null)

  const isManager = profile?.role === 'admin' || profile?.role === 'dispatcher'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const from    = isoDate(year, month, 1)
      const lastDay = new Date(year, month + 1, 0).getDate()
      const to      = isoDate(year, month, lastDay) + 'T23:59:59'

      const [{ data: veh }, { data: sh }] = await Promise.all([
        supabase.from('duty_vehicles').select('id,name,type,status,notes,available_days').eq('status', 'active').order('name'),
        supabase.from('duty_shifts')
          .select('id, vehicle_id, status, start_time, end_time, driver_name')
          .gte('start_time', from).lte('start_time', to)
          .neq('status', 'cancelled'),
      ])
      if (veh) setVehicles(veh)
      if (sh)  setMonthShifts(sh)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  const loadWeekShifts = useCallback(async () => {
    setWeekLoading(true)
    try {
      const to = addDays(weekStart, 6) + 'T23:59:59'
      const { data: sh } = await supabase.from('duty_shifts')
        .select('vehicle_id, start_time, driver_name, status')
        .gte('start_time', weekStart)
        .lte('start_time', to)
        .neq('status', 'cancelled')
      if (sh) setWeekShifts(sh)
    } finally {
      setWeekLoading(false)
    }
  }, [weekStart])

  useEffect(() => { load() }, [load, refreshKey])
  useEffect(() => { if (weekMode) loadWeekShifts() }, [weekMode, loadWeekShifts, vehicles.length])

  async function exportPng() {
    if (!weekGridRef.current) return
    setExporting(true)
    try {
      const { toPng } = await import('html-to-image')
      const url = await toPng(weekGridRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: { borderRadius: '0' },
      })
      const a = document.createElement('a')
      a.href = url
      a.download = `כוננות-${formatDM(weekStart)}-${formatDM(addDays(weekStart,6))}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast('לוח הכוננות יוצא בהצלחה')
    } catch (err) {
      toast('שגיאה בייצוא', { type: 'error' })
    } finally {
      setExporting(false)
    }
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
    toast('הנהג שובץ בהצלחה')
    setAssigningId(null); setDriverText('')
    load()
  }

  async function handleUnassign(shiftId) {
    const { error } = await supabase.from('duty_shifts')
      .update({ driver_name: null, status: 'open' }).eq('id', shiftId)
    if (!error) { toast('שיבוץ בוטל'); load() }
    else toast('שגיאה', { type: 'error' })
  }

  // Build calendar dots
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calShifts = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = isoDate(year, month, d)
    const weekday = new Date(dateStr + 'T12:00:00').getDay()
    vehicles.forEach(v => {
      if ((v.available_days || []).includes(weekday)) {
        const shift = monthShifts.find(s => s.vehicle_id === v.id && s.start_time.slice(0, 10) === dateStr)
        calShifts.push({ id: `${v.id}-${dateStr}`, start_time: dateStr + 'T00:00:00', hasDriver: !!shift?.driver_name })
      }
    })
  }

  const countMap = {}
  calShifts.forEach(s => {
    const d = s.start_time.slice(0, 10)
    countMap[d] = (countMap[d] || 0) + 1
  })

  const selectedWeekday = selected ? new Date(selected + 'T12:00:00').getDay() : -1
  const selectedVehicles = selected
    ? vehicles.filter(v => (v.available_days || []).includes(selectedWeekday))
    : []

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const todayStr = new Date().toISOString().slice(0, 10)

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

      {/* Top bar: legend + week export toggle */}
      <div className="flex items-center justify-between lg:shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            ממתין לשיבוץ
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            שובץ נהג
          </span>
        </div>
        <button
          onClick={() => { setWeekMode(m => !m); setSelected(null) }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            weekMode
              ? 'bg-[#E30613] text-white shadow-sm shadow-red-500/25'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          תצוגה שבועית
        </button>
      </div>

      {/* ── Week export mode ── */}
      {weekMode ? (
        <div className="flex flex-col gap-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto scrollbar-hide">

          {/* Week picker */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-4 py-3 flex items-center justify-between lg:shrink-0">
            <button
              onClick={() => setWeekStart(s => addDays(s, 7))}
              className="p-2 -m-1 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="שבוע הבא"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="text-center">
              <p className="font-bold text-gray-900 text-sm">
                {formatDM(weekStart)} — {formatDMY(addDays(weekStart, 6))}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">בחר שבוע לייצוא</p>
            </div>
            <button
              onClick={() => setWeekStart(s => addDays(s, -7))}
              className="p-2 -m-1 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="שבוע קודם"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          {/* Weekly grid — captured as PNG */}
          <div
            ref={weekGridRef}
            className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden"
          >
            {/* Branded header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#E30613] flex items-center justify-center shadow-sm shadow-red-500/30">
                  <svg viewBox="0 0 20 20" fill="white" className="w-3.5 h-3.5">
                    <polygon points="10,1 2.2,14.5 17.8,14.5"/>
                    <polygon points="10,19 2.2,5.5 17.8,5.5"/>
                  </svg>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">מד״א</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 text-sm">לוח כוננות שבועי</p>
                <p className="text-[10px] text-gray-400">{formatDM(weekStart)} — {formatDMY(addDays(weekStart, 6))}</p>
              </div>
            </div>

            {weekLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : vehicles.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">אין רכבים פעילים</p>
            ) : (
              <div className="overflow-x-auto">
                <table dir="rtl" className="w-full text-xs border-collapse" style={{ minWidth: 480 }}>
                  <thead>
                    <tr className="bg-gray-50/80">
                      <th className="px-3 py-2.5 text-right font-bold text-gray-700 border-b border-gray-100 w-24">רכב</th>
                      {weekDays.map((d, i) => {
                        const isToday = d === todayStr
                        return (
                          <th key={d} className={`px-1.5 py-2.5 text-center font-bold border-b border-gray-100 ${isToday ? 'text-[#E30613]' : 'text-gray-600'}`}>
                            <span className="block text-[11px]">{DAYS_HE[i]}</span>
                            <span className={`block text-[10px] mt-0.5 font-medium ${isToday ? 'text-[#E30613]/70' : 'text-gray-400'}`}>{formatDM(d)}</span>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v, vi) => (
                      <tr key={v.id} className={vi % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                        <td className="px-3 py-2.5 font-bold text-gray-900 border-b border-gray-50 text-right text-[11px]">{v.name}</td>
                        {weekDays.map(d => {
                          const dow = new Date(d + 'T12:00:00').getDay()
                          const available = (v.available_days || []).includes(dow)
                          if (!available) {
                            return (
                              <td key={d} className="px-1 py-2.5 text-center border-b border-gray-50">
                                <span className="text-gray-300 text-[11px]">—</span>
                              </td>
                            )
                          }
                          const shift = weekShifts.find(s => s.vehicle_id === v.id && s.start_time.slice(0, 10) === d)
                          if (shift?.driver_name) {
                            return (
                              <td key={d} className="px-1 py-2 text-center border-b border-gray-50">
                                <span className="inline-flex items-center justify-center bg-emerald-50 text-emerald-700 font-semibold rounded-lg px-1.5 py-1 text-[10px] leading-tight w-full max-w-[64px]">
                                  {shift.driver_name}
                                </span>
                              </td>
                            )
                          }
                          return (
                            <td key={d} className="px-1 py-2 text-center border-b border-gray-50">
                              <span className="inline-flex items-center justify-center bg-amber-50 text-amber-600 font-medium rounded-lg px-1.5 py-1 text-[10px] leading-tight w-full max-w-[64px]">
                                פנוי
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* In-grid legend for the PNG */}
                <div className="flex items-center justify-end gap-4 px-4 py-2 border-t border-gray-50">
                  <span className="flex items-center gap-1 text-[9px] text-gray-300">
                    <span className="inline-block w-2 h-2 rounded" style={{background:'#f3f4f6',border:'1px solid #e5e7eb'}} />
                    לא זמין
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-gray-400">
                    <span className="inline-block w-2 h-2 rounded bg-amber-50 border border-amber-200" />
                    פנוי
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-gray-400">
                    <span className="inline-block w-2 h-2 rounded bg-emerald-50 border border-emerald-200" />
                    שובץ נהג
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Export button — managers only */}
          {isManager && (
            <button
              onClick={exportPng}
              disabled={exporting || weekLoading || vehicles.length === 0}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#E30613] text-white font-bold rounded-2xl shadow-sm shadow-red-500/25 disabled:opacity-50 active:scale-[0.98] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] lg:shrink-0"
            >
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  מייצא...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  שמור כתמונה (PNG)
                </>
              )}
            </button>
          )}
        </div>

      ) : (
        /* ── Calendar mode ── */
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

                  {selectedVehicles.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-3">אין רכבי כונן ביום זה</p>
                  ) : (
                    selectedVehicles.map(v => {
                      const shift = monthShifts.find(s => s.vehicle_id === v.id && s.start_time.slice(0, 10) === selected)
                      const isAssigning = assigningId === v.id

                      return (
                        <div key={v.id} className="flex flex-col gap-2.5 rounded-2xl border border-gray-100 bg-gray-50/40 p-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="w-8 h-8 rounded-xl bg-[#E30613]/10 flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4 text-[#E30613]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                              </svg>
                            </div>
                            <p className="flex-1 font-bold text-gray-900 text-sm text-right">{v.name}</p>
                          </div>

                          {shift?.driver_name ? (
                            <div className="flex items-center justify-between gap-2 bg-emerald-50 rounded-xl px-3 py-2">
                              {isManager && (
                                <button onClick={() => handleUnassign(shift.id)}
                                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[11px] text-gray-400 hover:text-red-500 font-medium transition-colors">
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
                                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[11px] font-bold text-[#E30613] hover:text-[#B8000F] transition-colors">
                                  + שבץ נהג
                                </button>
                              )}
                              <span className="text-xs text-amber-700 font-medium">לא שובץ נהג</span>
                              <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                              </svg>
                            </div>
                          )}

                          {isManager && isAssigning && (
                            <div className="flex gap-2 items-center">
                              <button onClick={() => { setAssigningId(null); setDriverText('') }}
                                className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-[11px] text-gray-400 hover:text-red-500 font-medium transition-colors">
                                ביטול
                              </button>
                              <button onClick={() => handleAssign(v, selected)} disabled={saving || !driverText.trim()}
                                className="shrink-0 px-3 py-2 bg-[#E30613] text-white text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-[#B8000F] transition-all">
                                {saving ? '...' : 'שבץ'}
                              </button>
                              <input
                                autoFocus
                                value={driverText}
                                onChange={e => setDriverText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAssign(v, selected)}
                                placeholder="שם הנהג"
                                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all text-right"
                              />
                            </div>
                          )}

                          {isManager && shift?.driver_name && !isAssigning && (
                            <button onClick={() => { setAssigningId(v.id); setDriverText(shift.driver_name) }}
                              className="min-h-[44px] flex items-center justify-end text-[11px] text-[#E30613] hover:text-[#B8000F] font-medium transition-colors">
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
      )}
    </div>
  )
}
