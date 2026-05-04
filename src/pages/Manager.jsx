import { useState } from 'react'
import Branches from './manager/Branches'
import Templates from './manager/Templates'
import CreateShift from './manager/CreateShift'
import BlockedDates from './manager/BlockedDates'

const tabs = [
  { id: 'shifts',    label: 'יצירת משמרת', icon: '➕' },
  { id: 'templates', label: 'תבניות',       icon: '📋' },
  { id: 'branches',  label: 'סניפים',       icon: '🏥' },
  { id: 'blocked',   label: 'חסימות',       icon: '🔒' },
]

export default function Manager() {
  const [tab, setTab] = useState('shifts')

  return (
    <div className="flex flex-col gap-4 pt-3">
      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
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

      {/* Content */}
      {tab === 'shifts'    && <CreateShift />}
      {tab === 'templates' && <Templates />}
      {tab === 'branches'  && <Branches />}
      {tab === 'blocked'   && <BlockedDates />}
    </div>
  )
}
