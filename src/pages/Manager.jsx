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

const TabIcon = ({ id }) => {
  const icons = {
    dispatcher: <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />,
    shifts:     <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />,
    list:       <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    events:     <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />,
    duty:       <><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
    templates:  <><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></>,
    branches:   <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    blocked:    <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
    audit:      <><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></>,
  }
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      {icons[id]}
    </svg>
  )
}

const tabs = [
  { id: 'dispatcher', label: 'אישורים'     },
  { id: 'shifts',     label: 'יצירת משמרת' },
  { id: 'list',       label: 'משמרות'       },
  { id: 'events',     label: 'אירועים'      },
  { id: 'duty',       label: 'רכבי כונן'   },
  { id: 'templates',  label: 'תבניות'       },
  { id: 'branches',   label: 'סניפים'       },
  { id: 'blocked',    label: 'חסימות'       },
  { id: 'audit',      label: 'יומן'         },
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
                <TabIcon id={t.id} />
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
