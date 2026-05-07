import { useState, useRef } from 'react'
import Branches from './manager/Branches'
import Templates from './manager/Templates'
import CreateShift from './manager/CreateShift'
import BlockedDates from './manager/BlockedDates'
import Dispatcher from './manager/Dispatcher'
import ShiftsList from './manager/ShiftsList'
import AuditLog from './manager/AuditLog'
import DutyVehicles from './manager/DutyVehicles'
import MonthCalendar from '../components/MonthCalendar'
import { useCalendar } from '../contexts/CalendarContext'

const tabs = [
  { id: 'dispatcher', label: 'אישורים',     icon: '✓'  },
  { id: 'shifts',     label: 'יצירת משמרת', icon: '➕' },
  { id: 'list',       label: 'משמרות',       icon: '📅' },
  { id: 'events',     label: 'אירועים',      icon: '⭐' },
  { id: 'duty',       label: 'רכבי כונן',   icon: '🚑' },
  { id: 'templates',  label: 'תבניות',       icon: '📋' },
  { id: 'branches',   label: 'סניפים',       icon: '🏥' },
  { id: 'blocked',    label: 'חסימות',       icon: '🔒' },
  { id: 'audit',      label: 'יומן',         icon: '📜' },
]

export default function Manager() {
  const { setYear, setMonth, invalidate } = useCalendar()
  const [tab, setTab] = useState('shifts')
  const [jumpToDate, setJumpToDate] = useState(null)
  const formRef = useRef(null)

  function handleShiftCreated(dateStr) {
    const d = new Date(dateStr + 'T12:00:00')
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setJumpToDate(dateStr)
    invalidate()
  }

  return (
    <div className="pt-3 lg:pt-0">

      {/* ── Desktop: side-by-side ── */}
      <div className="lg:grid lg:grid-cols-[1fr,420px] lg:gap-6 lg:items-start">

        {/* Left col: calendar */}
        <div className="min-w-0">
          <MonthCalendar jumpToDate={jumpToDate} />
        </div>

        {/* Right col: tabs + content */}
        <div className="min-w-0 flex flex-col gap-4 mt-4 lg:mt-0">

          {/* Divider (mobile only) */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">פעולות</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id)
                  setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
                }}
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
          <div ref={formRef}>
            {tab === 'dispatcher' && <Dispatcher />}
            {tab === 'shifts'     && <CreateShift onShiftCreated={handleShiftCreated} />}
            {tab === 'list'       && <ShiftsList />}
            {tab === 'events'     && <ShiftsList typeFilter="event" />}
            {tab === 'duty'       && <DutyVehicles />}
            {tab === 'templates'  && <Templates />}
            {tab === 'branches'   && <Branches />}
            {tab === 'blocked'    && <BlockedDates />}
            {tab === 'audit'      && <AuditLog />}
          </div>

        </div>
      </div>
    </div>
  )
}
