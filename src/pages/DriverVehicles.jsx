import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function weekStartSunday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}
function formatDM(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
}

const DAYS_HE = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳']

export default function DriverVehicles() {
  const { profile } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [shifts,   setShifts]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [weekStart, setWeekStart] = useState(() =>
    weekStartSunday(new Date().toISOString().slice(0, 10))
  )

  const myName  = profile?.full_name || ''
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const todayStr = new Date().toISOString().slice(0, 10)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const to = addDays(weekStart, 6) + 'T23:59:59'
      const [{ data: veh }, { data: sh }] = await Promise.all([
        supabase.from('duty_vehicles').select('id,name,type,status,notes,available_days').eq('status', 'active').order('name'),
        supabase.from('duty_shifts')
          .select('vehicle_id, start_time, driver_name, status')
          .gte('start_time', weekStart)
          .lte('start_time', to)
          .neq('status', 'cancelled'),
      ])
      if (veh) setVehicles(veh)
      if (sh)  setShifts(sh)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { load() }, [load])

  const myShifts = shifts.filter(s => s.driver_name === myName)

  return (
    <div className="flex flex-col gap-4 pt-3 lg:pt-0" dir="rtl">

      {/* Week picker */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-4 py-3 flex items-center justify-between">
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
            {formatDM(weekStart)} — {formatDM(addDays(weekStart, 6))}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">לוח כוננות שבועי</p>
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

      {/* My shifts this week */}
      {myShifts.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
          <p className="text-xs font-bold text-emerald-700 mb-2">המשמרות שלי השבוע</p>
          <div className="flex flex-wrap gap-1.5">
            {myShifts.map((s, i) => {
              const dow = new Date(s.start_time + 'T12:00:00').getDay()
              const veh = vehicles.find(v => v.id === s.vehicle_id)
              return (
                <span key={i} className="text-[10px] bg-white border border-emerald-200 text-emerald-700 font-semibold rounded-lg px-2 py-1">
                  {DAYS_HE[dow]} {formatDM(s.start_time.slice(0, 10))} · {veh?.name || ''}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Vehicle list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">אין רכבים פעילים</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {vehicles.map(v => {
            const availableDays = weekDays.filter(d => {
              const dow = new Date(d + 'T12:00:00').getDay()
              return (v.available_days || []).includes(dow)
            })
            if (!availableDays.length) return null

            return (
              <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E30613]/10 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-[#E30613]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                  </div>
                  <p className="font-bold text-gray-900 text-sm flex-1">{v.name}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {availableDays.map(d => {
                    const dow   = new Date(d + 'T12:00:00').getDay()
                    const shift = shifts.find(s => s.vehicle_id === v.id && s.start_time.slice(0, 10) === d)
                    const isToday   = d === todayStr
                    const isMine    = shift?.driver_name === myName
                    const hasDriver = !!shift?.driver_name

                    return (
                      <div key={d} className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[56px] ${
                        isMine    ? 'bg-emerald-50 ring-1 ring-emerald-200' :
                        hasDriver ? 'bg-sky-50' :
                        'bg-gray-50'
                      }`}>
                        <span className={`text-[9px] font-bold ${isToday ? 'text-[#E30613]' : 'text-gray-400'}`}>
                          {DAYS_HE[dow]}
                        </span>
                        <span className={`text-[10px] font-medium ${isToday ? 'text-[#E30613]' : 'text-gray-500'}`}>
                          {formatDM(d)}
                        </span>
                        <span className={`text-[9px] font-semibold mt-0.5 truncate max-w-[52px] ${
                          isMine    ? 'text-emerald-700' :
                          hasDriver ? 'text-sky-600'    :
                          'text-gray-300'
                        }`}>
                          {isMine    ? myName.split(' ')[0]          :
                           hasDriver ? shift.driver_name.split(' ')[0] :
                           '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {v.notes && <p className="text-[10px] text-gray-400 mt-2.5">{v.notes}</p>}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pb-2">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <span className="w-2.5 h-2.5 rounded bg-emerald-50 ring-1 ring-emerald-200 inline-block" />
          המשמרה שלי
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <span className="w-2.5 h-2.5 rounded bg-sky-50 inline-block" />
          שובץ נהג אחר
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <span className="w-2.5 h-2.5 rounded bg-gray-50 inline-block" />
          פנוי
        </span>
      </div>
    </div>
  )
}
