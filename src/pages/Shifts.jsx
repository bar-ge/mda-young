import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function formatDateTime(ts) {
  return new Date(ts).toLocaleString('he-IL', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function formatDuration(start, end) {
  const h = (new Date(end) - new Date(start)) / 3600000
  return Number.isInteger(h) ? `${h} שע׳` : `${h.toFixed(1)} שע׳`
}

const typeConfig = {
  regular: { label: null,    badge: null },
  event:   { label: 'אירוע', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  holiday: { label: 'סגור',  badge: 'bg-gray-100 text-gray-500 border-gray-200' },
}

const statusConfig = {
  open:      { label: 'פתוחה',   bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  assigned:  { label: 'מאוישת',  bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  confirmed: { label: 'מאושרת',  bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200' },
  completed: { label: 'הושלמה',  bg: 'bg-gray-100',   text: 'text-gray-500',    border: 'border-gray-200' },
  cancelled: { label: 'סגור',    bg: 'bg-gray-100',   text: 'text-gray-500',    border: 'border-gray-200' },
}

export default function Shifts() {
  const { user } = useAuth()
  const [shifts, setShifts] = useState([])
  const [blocked, setBlocked] = useState([])
  const [myAssignments, setMyAssignments] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
  const [acting, setActing] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const now = new Date().toISOString()
    const [{ data: sh }, { data: as }, { data: bl }] = await Promise.all([
      supabase.from('shifts').select('*').order('start_time'),
      supabase.from('shift_assignments').select('*').eq('user_id', user.id),
      supabase.from('blocked_dates').select('date, reason')
        .gte('date', new Date().toISOString().slice(0, 10))
        .order('date').limit(10),
    ])
    if (sh) setShifts(sh)
    if (as) {
      const map = {}
      as.forEach(a => { map[a.shift_id] = a })
      setMyAssignments(map)
    }
    if (bl) setBlocked(bl)
    setLoading(false)
  }

  async function applyForShift(shiftId) {
    setActing(shiftId)
    await supabase.from('shift_assignments').insert({ shift_id: shiftId, user_id: user.id, status: 'pending' })
    await load()
    setActing(null)
  }

  async function cancelAssignment(assignmentId, shiftId) {
    setActing(shiftId)
    await supabase.from('shift_assignments').delete().eq('id', assignmentId)
    await load()
    setActing(null)
  }

  // Filter out holiday/cancelled for open filter
  const now = new Date()
  const assignableShifts = shifts.filter(s => s.shift_type !== 'holiday' && s.status !== 'cancelled')
  const filtered = filter === 'all' ? assignableShifts : assignableShifts.filter(s => s.status === 'open')
  const upcoming = filtered.filter(s => new Date(s.start_time) > now)
  const past = filtered.filter(s => new Date(s.start_time) <= now)

  function ShiftCard({ shift }) {
    const assignment = myAssignments[shift.id]
    const isPast = new Date(shift.start_time) <= now
    const statusCfg = statusConfig[shift.status] || statusConfig.open
    const typeCfg = typeConfig[shift.shift_type] || typeConfig.regular

    return (
      <div className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-3 ${
        shift.shift_type === 'event' ? 'border-amber-100' : 'border-gray-100'
      }`}>
        <div className="flex items-start justify-between gap-2">
          {/* Status badge */}
          <div className="flex flex-col items-start gap-1.5 shrink-0">
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
              {statusCfg.label}
            </span>
            {typeCfg.label && (
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${typeCfg.badge}`}>
                {typeCfg.label}
              </span>
            )}
          </div>
          {/* Title */}
          <div className="flex-1 text-right">
            <h3 className="font-semibold text-gray-900 text-sm">{shift.title}</h3>
            {shift.description && (
              <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{shift.description}</p>
            )}
          </div>
          {shift.shift_type === 'event' && <span className="text-lg">⭐</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
            <span>{formatDateTime(shift.start_time)}</span>
            <svg className="w-3.5 h-3.5 text-[#E30613] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="flex items-center justify-end gap-3 text-xs text-gray-400">
            {shift.location && (
              <span className="flex items-center gap-1.5">
                {shift.location}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              {formatDuration(shift.start_time, shift.end_time)}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
          </div>
        </div>

        {!isPast && shift.status === 'open' && (
          assignment ? (
            <div className="flex items-center justify-between">
              {assignment.status === 'pending' && (
                <button onClick={() => cancelAssignment(assignment.id, shift.id)} disabled={acting === shift.id}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  ביטול
                </button>
              )}
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                assignment.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                assignment.status === 'declined'  ? 'bg-red-50 text-red-600' :
                'bg-amber-50 text-amber-700'
              }`}>
                {assignment.status === 'pending' ? '⏳ נרשמת' : assignment.status === 'confirmed' ? '✓ מאושר' : '✗ נדחה'}
              </span>
            </div>
          ) : (
            <button onClick={() => applyForShift(shift.id)} disabled={acting === shift.id}
              className="w-full py-2.5 bg-[#E30613] text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm shadow-red-500/20">
              {acting === shift.id ? '...נרשם' : 'הרשמה למשמרת'}
            </button>
          )
        )}
      </div>
    )
  }

  // Upcoming blocked dates (holiday notice)
  const todayStr = new Date().toISOString().slice(0, 10)
  const upcomingBlocked = blocked.filter(b => b.date >= todayStr).slice(0, 3)

  return (
    <div className="flex flex-col gap-4 pt-3">
      {/* Blocked date notices */}
      {upcomingBlocked.length > 0 && (
        <div className="flex flex-col gap-2">
          {upcomingBlocked.map(b => (
            <div key={b.date} className="flex items-center justify-end gap-2.5 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-600">
                  {new Date(b.date + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-[10px] text-gray-400">{b.reason || 'יום סגור'}</p>
              </div>
              <span className="text-xl">🔒</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 justify-end">
        {[['open', 'פתוחות'], ['all', 'הכל']].map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === f
                ? 'bg-[#E30613] text-white shadow-sm shadow-red-500/20'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">אין משמרות זמינות כרגע</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">קרובות</p>
              {upcoming.map(s => <ShiftCard key={s.id} shift={s} />)}
            </div>
          )}
          {past.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">עבר</p>
              {past.map(s => <ShiftCard key={s.id} shift={s} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
