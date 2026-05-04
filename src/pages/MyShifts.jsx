import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function formatDateTime(ts) {
  return new Date(ts).toLocaleString('he-IL', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const statusConfig = {
  pending:   { label: 'ממתין לאישור', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  confirmed: { label: 'מאושר',        bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  declined:  { label: 'נדחה',         bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-400' },
}

export default function MyShifts() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('upcoming')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('shift_assignments')
      .select('*, shifts(*)')
      .eq('user_id', user.id)
      .order('assigned_at', { ascending: false })
    if (data) setAssignments(data)
    setLoading(false)
  }

  const now = new Date()
  const upcoming = assignments.filter(a => a.shifts && new Date(a.shifts.start_time) > now)
  const past = assignments.filter(a => a.shifts && new Date(a.shifts.start_time) <= now)
  const shown = tab === 'upcoming' ? upcoming : past

  const confirmedCount = upcoming.filter(a => a.status === 'confirmed').length
  const pendingCount = upcoming.filter(a => a.status === 'pending').length

  return (
    <div className="flex flex-col gap-4 pt-3">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1 items-end">
          <span className="text-2xl font-bold text-amber-500">{pendingCount}</span>
          <span className="text-xs text-gray-500 font-medium">ממתין לאישור</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1 items-end">
          <span className="text-2xl font-bold text-emerald-600">{confirmedCount}</span>
          <span className="text-xs text-gray-500 font-medium">משמרות מאושרות</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 justify-end">
        {[['upcoming', `קרובות (${upcoming.length})`], ['past', `עבר (${past.length})`]].map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              tab === t
                ? 'bg-[#E30613] text-white shadow-sm shadow-red-500/20'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">
            {tab === 'upcoming' ? 'אין משמרות קרובות.\nלך להירשם למשמרות!' : 'אין משמרות קודמות.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map(a => {
            const shift = a.shifts
            if (!shift) return null
            const cfg = statusConfig[a.status] || statusConfig.pending
            const isPast = new Date(shift.start_time) <= now

            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <span className={`shrink-0 flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-gray-900 text-sm">{shift.title}</h3>
                    {shift.description && (
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{shift.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
                    <span>{formatDateTime(shift.start_time)}</span>
                    <svg className="w-3.5 h-3.5 text-[#E30613]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  {shift.location && (
                    <div className="flex items-center justify-end gap-2 text-xs text-gray-400">
                      <span>{shift.location}</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                  )}
                </div>

                {!isPast && a.status === 'confirmed' && (
                  <div className="flex items-center gap-2 bg-emerald-50 rounded-xl p-3 justify-end">
                    <span className="text-xs text-emerald-700 font-medium">אתה מאושר למשמרת זו</span>
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
