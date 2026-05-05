import { useState, useRef } from 'react'
import Branches from './manager/Branches'
import Templates from './manager/Templates'
import CreateShift from './manager/CreateShift'
import BlockedDates from './manager/BlockedDates'
import MonthCalendar from '../components/MonthCalendar'
import { useCalendar } from '../contexts/CalendarContext'

const tabs = [
  { id: 'shifts',    label: 'יצירת משמרת', icon: '➕' },
  { id: 'templates', label: 'תבניות',       icon: '📋' },
  { id: 'branches',  label: 'סניפים',       icon: '🏥' },
  { id: 'blocked',   label: 'חסימות',       icon: '🔒' },
]

export default function Manager() {
  const { setYear, setMonth, invalidate } = useCalendar()
  const [tab, setTab] = useState('shifts')
  const [jumpToDate, setJumpToDate] = useState(null)
  const calendarRef = useRef(null)

  function handleShiftCreated(dateStr) {
    const d = new Date(dateStr + 'T12:00:00')
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setJumpToDate(dateStr)
    invalidate()
    setTimeout(() => {
      calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 300)
  }

  return (
    <div className="flex flex-col gap-5 pt-3">
      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === t.id
                ? 'bg-[#E30613] text-white shadow-sm shadow-red-500/20'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'shifts'    && <CreateShift onShiftCreated={handleShiftCreated} />}
      {tab === 'templates' && <Templates />}
      {tab === 'branches'  && <Branches />}
      {tab === 'blocked'   && <BlockedDates />}

      {/* Calendar — always visible at bottom */}
      <div className="flex flex-col gap-2" ref={calendarRef}>
        <div className="flex items-center justify-between">
          <span className="w-8" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">לוח משמרות</p>
          <span className="w-8" />
        </div>
        <MonthCalendar jumpToDate={jumpToDate} />
      </div>
    </div>
  )
}
