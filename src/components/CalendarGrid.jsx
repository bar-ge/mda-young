const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

export function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function CalendarGrid({
  year, month, onPrev, onNext,
  shifts = [], blocked = [],
  dotFn,
  loading,
  selected, onSelect,
}) {
  const today = new Date()
  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate())
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay()

  const shiftMap = {}
  shifts.forEach(s => {
    const d = s.start_time.slice(0, 10)
    if (!shiftMap[d]) shiftMap[d] = []
    shiftMap[d].push(s)
  })
  const blockedSet = new Set(blocked.map(b => b.date))

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const monthName = new Date(year, month, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={onNext} disabled={loading} className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-bold text-gray-900 text-sm">{monthName}</span>
        <button onClick={onPrev} disabled={loading} className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS.map(d => (
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
              if (!day) return <div key={`e${idx}`} className="min-h-[46px] border-b border-r border-gray-50 last:border-r-0" />
              const dateStr  = isoDate(year, month, day)
              const dayShifts = shiftMap[dateStr] || []
              const isBlocked = blockedSet.has(dateStr)
              const isToday   = dateStr === todayStr
              const isSel     = selected === dateStr

              return (
                <button
                  key={day}
                  onClick={() => onSelect(isSel ? null : dateStr)}
                  className={`min-h-[46px] flex flex-col items-center justify-start pt-1 pb-0.5 gap-0.5 border-b border-r border-gray-50 last:border-r-0 transition-colors ${
                    isSel ? 'bg-[#E30613]/5' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isToday ? 'bg-[#E30613] text-white' :
                    isSel   ? 'bg-[#E30613]/15 text-[#E30613]' :
                              'text-gray-700'
                  }`}>
                    {isBlocked ? '🔒' : day}
                  </span>
                  {dayShifts.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center px-0.5">
                      {dayShifts.slice(0, 3).map((s, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${dotFn(s)}`} />
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
    </div>
  )
}
