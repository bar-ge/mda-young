import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useCalendar } from '../contexts/CalendarContext'

const DAYS_HEADER = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

const typeStyle = {
  regular: { dot: 'bg-[#E30613]',  label: 'משמרת',  ring: 'ring-[#E30613]/30' },
  event:   { dot: 'bg-amber-400',  label: 'אירוע',  ring: 'ring-amber-400/30' },
  holiday: { dot: 'bg-gray-400',   label: 'סגור',   ring: 'ring-gray-300' },
}

function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function formatHour(ts) {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

export default function MonthCalendar({ jumpToDate }) {
  const { year, month, setYear, setMonth, prevMonth, nextMonth, refreshKey, invalidate } = useCalendar()
  const [shifts,   setShifts]   = useState([])
  const [blocked,  setBlocked]  = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { load() }, [year, month, refreshKey])

  useEffect(() => {
    if (!jumpToDate) return
    const d = new Date(jumpToDate + 'T12:00:00')
    const newYear  = d.getFullYear()
    const newMonth = d.getMonth()
    setYear(newYear)
    setMonth(newMonth)
    setSelected(jumpToDate)
    if (newYear === year && newMonth === month) invalidate()
  }, [jumpToDate])

  async function load() {
    setLoading(true)
    const from = isoDate(year, month, 1)
    const to   = isoDate(year, month + 1, 0) + 'T23:59:59'

    const [{ data: sh }, { data: bl }] = await Promise.all([
      supabase.from('shifts').select('id, title, start_time, end_time, status, shift_type, location')
        .gte('start_time', from).lte('start_time', to).order('start_time'),
      supabase.from('blocked_dates').select('date, reason')
        .gte('date', from.slice(0, 10)).lte('date', to.slice(0, 10)),
    ])
    if (sh) setShifts(sh)
    if (bl) setBlocked(bl)
    setLoading(false)
  }

  const today = new Date()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay()

  const shiftMap = {}
  shifts.forEach(s => {
    const d = s.start_time.slice(0, 10)
    if (!shiftMap[d]) shiftMap[d] = []
    shiftMap[d].push(s)
  })
  const blockedSet = new Set(blocked.map(b => b.date))
  const blockedMap = {}
  blocked.forEach(b => { blockedMap[b.date] = b.reason })

  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate())

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const selectedShifts  = selected ? (shiftMap[selected] || []) : []
  const selectedBlocked = selected ? blockedSet.has(selected) : false
  const selectedReason  = selected ? blockedMap[selected] : null
  const monthName = new Date(year, month, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => { nextMonth(); setSelected(null) }} className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-gray-900 text-sm">{monthName}</span>
        <button onClick={() => { prevMonth(); setSelected(null) }} className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-3 flex-wrap">
        {Object.entries(typeStyle).map(([type, s]) => (
          <span key={type} className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="text-xs">🔒</span>
          חסום
        </span>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS_HEADER.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold text-gray-400">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={`e${idx}`} className="min-h-[52px] border-b border-r border-gray-50 last:border-r-0" />
              const dateStr  = isoDate(year, month, day)
              const dayShifts = shiftMap[dateStr] || []
              const isBlocked = blockedSet.has(dateStr)
              const isToday   = dateStr === todayStr
              const isSel     = selected === dateStr

              return (
                <button
                  key={day}
                  onClick={() => setSelected(isSel ? null : dateStr)}
                  className={`min-h-[52px] flex flex-col items-center justify-start pt-1.5 pb-1 gap-1 border-b border-r border-gray-50 last:border-r-0 transition-colors ${
                    isBlocked ? 'bg-gray-50' : isSel ? 'bg-[#E30613]/5' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    isToday   ? 'bg-[#E30613] text-white' :
                    isSel     ? 'bg-[#E30613]/15 text-[#E30613]' :
                    isBlocked ? 'text-gray-400' :
                                'text-gray-700'
                  }`}>
                    {isBlocked ? '🔒' : day}
                  </span>
                  {dayShifts.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center px-0.5">
                      {dayShifts.slice(0, 3).map((s, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${typeStyle[s.shift_type]?.dot || 'bg-gray-400'}`} />
                      ))}
                      {dayShifts.length > 3 && (
                        <span className="text-[8px] text-gray-400 leading-none">+{dayShifts.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="font-semibold text-gray-900 text-sm text-right">
              {new Date(selected + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          {selectedBlocked && (
            <div className="flex items-center justify-end gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="text-sm text-gray-600 font-medium">{selectedReason || 'יום חסום'}</span>
              <span className="text-lg">🔒</span>
            </div>
          )}

          {selectedShifts.length === 0 && !selectedBlocked ? (
            <p className="text-gray-400 text-sm text-center py-2">אין משמרות ביום זה</p>
          ) : (
            selectedShifts.map(s => {
              const style = typeStyle[s.shift_type] || typeStyle.regular
              return (
                <div key={s.id} className={`flex items-start justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2.5 ring-1 ${style.ring}`}>
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                  <div className="flex-1 text-right">
                    <p className="font-semibold text-gray-900 text-sm">{s.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatHour(s.start_time)} – {formatHour(s.end_time)}
                      {s.location && ` · ${s.location}`}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    s.status === 'open'      ? 'bg-emerald-50 text-emerald-700' :
                    s.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                                               'bg-amber-50 text-amber-700'
                  }`}>{style.label}</span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
