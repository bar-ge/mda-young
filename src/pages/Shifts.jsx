import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function formatDateTime(ts) {
  return new Date(ts).toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(start, end) {
  const diff = (new Date(end) - new Date(start)) / 3600000
  return `${diff}h`
}

const statusColors = {
  open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  assigned: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-sky-50 text-sky-700 border-sky-200',
  completed: 'bg-gray-100 text-gray-500 border-gray-200',
  cancelled: 'bg-red-50 text-red-500 border-red-200',
}

export default function Shifts() {
  const { user, profile } = useAuth()
  const [shifts, setShifts] = useState([])
  const [myAssignments, setMyAssignments] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
  const [acting, setActing] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: sh }, { data: as }] = await Promise.all([
      supabase.from('shifts').select('*').order('start_time'),
      supabase.from('shift_assignments').select('*').eq('user_id', user.id),
    ])
    if (sh) setShifts(sh)
    if (as) {
      const map = {}
      as.forEach(a => { map[a.shift_id] = a })
      setMyAssignments(map)
    }
    setLoading(false)
  }

  async function applyForShift(shiftId) {
    setActing(shiftId)
    const { error } = await supabase.from('shift_assignments').insert({
      shift_id: shiftId,
      user_id: user.id,
      status: 'pending',
    })
    if (!error) await load()
    setActing(null)
  }

  async function cancelShift(assignmentId, shiftId) {
    setActing(shiftId)
    await supabase.from('shift_assignments').delete().eq('id', assignmentId)
    await load()
    setActing(null)
  }

  const filters = ['open', 'all']
  const filtered = filter === 'all'
    ? shifts
    : shifts.filter(s => s.status === filter)

  const upcoming = filtered.filter(s => new Date(s.start_time) > new Date())
  const past = filtered.filter(s => new Date(s.start_time) <= new Date())

  function ShiftCard({ shift }) {
    const assignment = myAssignments[shift.id]
    const isPast = new Date(shift.start_time) <= new Date()

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm">{shift.title}</h3>
            {shift.description && (
              <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{shift.description}</p>
            )}
          </div>
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full border ${statusColors[shift.status]}`}>
            {shift.status}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5 text-[#E30613]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{formatDateTime(shift.start_time)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formatDuration(shift.start_time, shift.end_time)}
            </span>
            {shift.location && (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {shift.location}
              </span>
            )}
          </div>
        </div>

        {!isPast && shift.status === 'open' && (
          <div>
            {assignment ? (
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                  assignment.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                  assignment.status === 'declined' ? 'bg-red-50 text-red-600' :
                  'bg-amber-50 text-amber-700'
                }`}>
                  {assignment.status === 'pending' ? '⏳ Applied' :
                   assignment.status === 'confirmed' ? '✓ Confirmed' : '✗ Declined'}
                </span>
                {assignment.status === 'pending' && (
                  <button
                    onClick={() => cancelShift(assignment.id, shift.id)}
                    disabled={acting === shift.id}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => applyForShift(shift.id)}
                disabled={acting === shift.id}
                className="w-full py-2.5 bg-[#E30613] text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm shadow-red-500/20"
              >
                {acting === shift.id ? 'Applying…' : 'Apply for Shift'}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pt-3">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === f
                ? 'bg-[#E30613] text-white shadow-sm shadow-red-500/20'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {f === 'open' ? 'Open Shifts' : 'All Shifts'}
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
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">No shifts available right now</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upcoming</p>
              {upcoming.map(s => <ShiftCard key={s.id} shift={s} />)}
            </div>
          )}
          {past.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Past</p>
              {past.map(s => <ShiftCard key={s.id} shift={s} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
