import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useCalendar } from '../../contexts/CalendarContext'
import { isoDate } from '../../components/CalendarGrid'

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })
}
function formatHour(ts) {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

const statusCfg = {
  pending:   { label: 'ממתין', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  confirmed: { label: 'מאושר', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  declined:  { label: 'נדחה',  bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-400'     },
}

function initials(name) {
  return name?.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
}

/* ─── Approvals sub-view ─── */
function Approvals({ invalidate }) {
  const [assignments, setAssignments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('pending')
  const [acting,      setActing]      = useState(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let q = supabase
      .from('shift_assignments')
      .select('*, shifts(*)')
      .is('manual_name', null)          // exclude manual assignments
      .order('assigned_at', { ascending: false })

    if (filter === 'pending') q = q.eq('status', 'pending')
    else                      q = q.in('status', ['confirmed', 'declined'])

    const { data: rows } = await q
    if (!rows?.length) {
      setAssignments([])
      if (filter !== 'pending') await refreshPendingCount()
      setLoading(false)
      return
    }

    const userIds = [...new Set(rows.map(a => a.user_id).filter(Boolean))]
    const { data: profiles } = await supabase
      .from('profiles').select('id, full_name, phone').in('id', userIds)

    const pm = {}
    profiles?.forEach(p => { pm[p.id] = p })
    setAssignments(rows.map(a => ({ ...a, profile: pm[a.user_id] })))

    if (filter === 'pending') setPendingCount(rows.length)
    else                      await refreshPendingCount()
    setLoading(false)
  }

  async function refreshPendingCount() {
    const { count } = await supabase
      .from('shift_assignments')
      .select('id', { count: 'exact', head: true })
      .is('manual_name', null)
      .eq('status', 'pending')
    setPendingCount(count || 0)
  }

  async function decide(id, status) {
    setActing(id)
    await supabase.from('shift_assignments').update({ status }).eq('id', id)
    setAssignments(prev =>
      filter === 'pending'
        ? prev.filter(a => a.id !== id)
        : prev.map(a => a.id === id ? { ...a, status } : a)
    )
    if (filter === 'pending') setPendingCount(c => Math.max(0, c - 1))
    invalidate()
    setActing(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{assignments.length} רישומים</span>
        <div className="flex gap-2">
          <button onClick={() => setFilter('decided')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'decided' ? 'bg-[#E30613] text-white shadow-md shadow-red-500/25' : 'bg-white text-gray-500 border border-gray-200'}`}>
            טופלו
          </button>
          <button onClick={() => setFilter('pending')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'pending' ? 'bg-[#E30613] text-white shadow-md shadow-red-500/25' : 'bg-white text-gray-500 border border-gray-200'}`}>
            ממתינים
            {pendingCount > 0 && (
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${filter === 'pending' ? 'bg-white text-[#E30613]' : 'bg-[#E30613] text-white'}`}>
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <span className="text-4xl">{filter === 'pending' ? '🎉' : '📋'}</span>
          <p className="text-gray-400 text-sm">{filter === 'pending' ? 'אין רישומים ממתינים לאישור' : 'אין רישומים שטופלו'}</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {assignments.map(a => {
            const shift   = a.shifts
            const profile = a.profile
            const cfg     = statusCfg[a.status] || statusCfg.pending
            const isPending = a.status === 'pending'

            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
                <div className="flex items-center justify-end gap-3">
                  <div className="text-right">
                    <p className="font-bold text-gray-900 text-sm">{profile?.full_name || 'מתנדב'}</p>
                    {profile?.phone && <a href={`tel:${profile.phone}`} className="text-xs text-[#E30613] font-medium">{profile.phone}</a>}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E30613] to-[#9b000b] flex items-center justify-center shrink-0 shadow-sm shadow-red-500/20">
                    <span className="text-white font-bold text-xs">{initials(profile?.full_name)}</span>
                  </div>
                </div>
                <div className="h-px bg-gray-100" />
                {shift ? (
                  <div className="flex items-start justify-between gap-2">
                    <span className={`shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                    </span>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-sm">{shift.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(shift.start_time)} · {formatHour(shift.start_time)}–{formatHour(shift.end_time)}
                        {shift.location && ` · ${shift.location}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-right">המשמרת נמחקה</p>
                )}
                {isPending ? (
                  <div className="flex gap-2 pt-0.5">
                    <button onClick={() => decide(a.id, 'declined')} disabled={acting === a.id}
                      className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-all disabled:opacity-40 active:scale-95">
                      דחייה ✗
                    </button>
                    <button onClick={() => decide(a.id, 'confirmed')} disabled={acting === a.id}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all disabled:opacity-40 shadow-sm shadow-emerald-500/25 active:scale-95">
                      {acting === a.id ? '...' : 'אישור ✓'}
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <button onClick={() => decide(a.id, 'pending')} disabled={acting === a.id}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                      החזר לממתין
                    </button>
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

/* ─── Manual assignment sub-view ─── */
function ManualAssignment({ invalidate }) {
  const { year, month } = useCalendar()
  const [shifts,        setShifts]        = useState([])
  const [manualMap,     setManualMap]     = useState({})
  const [confirmedMap,  setConfirmedMap]  = useState({})
  const [loading,       setLoading]       = useState(true)
  const [expanded,      setExpanded]      = useState(null)
  const [nameInput,     setNameInput]     = useState({})
  const [adding,        setAdding]        = useState(null)
  const [removing,      setRemoving]      = useState(null)
  const inputRefs = useRef({})

  useEffect(() => { load() }, [year, month])

  async function load() {
    setLoading(true)
    const from    = isoDate(year, month, 1)
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to      = isoDate(year, month, lastDay) + 'T23:59:59'

    const { data: sh } = await supabase.from('shifts')
      .select('id, title, start_time, end_time, location, status, shift_type, veteran_only, max_volunteers')
      .gte('start_time', from).lte('start_time', to)
      .neq('shift_type', 'holiday')
      .neq('status', 'cancelled')
      .order('start_time')

    const shiftIds = sh?.map(s => s.id) || []

    const [{ data: ma }, { data: confirmed }] = shiftIds.length ? await Promise.all([
      supabase.from('shift_assignments').select('*').not('manual_name', 'is', null).in('shift_id', shiftIds),
      supabase.from('shift_assignments').select('shift_id').eq('status', 'confirmed').in('shift_id', shiftIds),
    ]) : [{ data: [] }, { data: [] }]

    if (sh) setShifts(sh)

    if (ma) {
      const map = {}
      ma.forEach(a => {
        if (!map[a.shift_id]) map[a.shift_id] = []
        map[a.shift_id].push(a)
      })
      setManualMap(map)
    }

    if (confirmed) {
      const cmap = {}
      confirmed.forEach(a => { cmap[a.shift_id] = (cmap[a.shift_id] || 0) + 1 })
      setConfirmedMap(cmap)
    }

    setLoading(false)
  }

  async function addManual(shiftId) {
    const name  = (nameInput[shiftId] || '').trim()
    if (!name) return
    const shift = shifts.find(s => s.id === shiftId)
    if (shift && (confirmedMap[shiftId] || 0) >= shift.max_volunteers) return
    setAdding(shiftId)
    const { data } = await supabase
      .from('shift_assignments')
      .insert({ shift_id: shiftId, user_id: null, manual_name: name, status: 'confirmed' })
      .select()
      .single()
    if (data) {
      setManualMap(prev => ({ ...prev, [shiftId]: [...(prev[shiftId] || []), data] }))
      setConfirmedMap(prev => ({ ...prev, [shiftId]: (prev[shiftId] || 0) + 1 }))
    }
    setNameInput(prev => ({ ...prev, [shiftId]: '' }))
    invalidate()
    setAdding(null)
    inputRefs.current[shiftId]?.focus()
  }

  async function removeManual(assignmentId, shiftId) {
    setRemoving(assignmentId)
    await supabase.from('shift_assignments').delete().eq('id', assignmentId)
    setManualMap(prev => ({ ...prev, [shiftId]: (prev[shiftId] || []).filter(a => a.id !== assignmentId) }))
    setConfirmedMap(prev => ({ ...prev, [shiftId]: Math.max(0, (prev[shiftId] || 0) - 1) }))
    invalidate()
    setRemoving(null)
  }

  const monthName = new Date(year, month, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{shifts.length} משמרות</span>
        <span className="text-xs font-semibold text-gray-500">{monthName}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : shifts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <span className="text-4xl">📅</span>
          <p className="text-gray-400 text-sm">אין משמרות בחודש זה</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {shifts.map(shift => {
            const manuals        = manualMap[shift.id] || []
            const isOpen         = expanded === shift.id
            const totalConfirmed = confirmedMap[shift.id] || 0
            const isFull         = totalConfirmed >= shift.max_volunteers

            return (
              <div key={shift.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Shift header — click to expand */}
                <button
                  onClick={() => setExpanded(isOpen ? null : shift.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Capacity badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isFull
                        ? 'bg-red-50 text-red-600 border-red-100'
                        : totalConfirmed > 0
                        ? 'bg-sky-50 text-sky-700 border-sky-100'
                        : 'bg-gray-50 text-gray-400 border-gray-100'
                    }`}>
                      {totalConfirmed}/{shift.max_volunteers}
                    </span>
                    {isFull && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">מלא</span>
                    )}
                    {shift.veteran_only && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">🎖️</span>
                    )}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="font-semibold text-gray-900 text-sm">{shift.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(shift.start_time)} · {formatHour(shift.start_time)}–{formatHour(shift.end_time)}
                      {shift.location && ` · ${shift.location}`}
                    </p>
                  </div>
                </button>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 flex flex-col gap-3">
                    {/* Existing manual assignments */}
                    {manuals.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {manuals.map(a => (
                          <div key={a.id} className="flex items-center justify-between gap-2 bg-sky-50 rounded-xl px-3 py-2">
                            <button
                              onClick={() => removeManual(a.id, shift.id)}
                              disabled={removing === a.id}
                              className="shrink-0 w-5 h-5 rounded-md bg-white text-red-400 flex items-center justify-center text-xs hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 shadow-sm"
                            >
                              {removing === a.id ? '·' : '×'}
                            </button>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                              <span className="text-sm font-medium text-gray-800 text-right">{a.manual_name}</span>
                              <div className="w-7 h-7 rounded-full bg-sky-200 flex items-center justify-center shrink-0">
                                <span className="text-sky-700 font-bold text-xs">{initials(a.manual_name)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new */}
                    {isFull ? (
                      <div className="flex items-center justify-center gap-2 py-2 bg-red-50 rounded-xl">
                        <span className="text-xs font-bold text-red-500">המשמרת מלאה ({shift.max_volunteers}/{shift.max_volunteers})</span>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => addManual(shift.id)}
                          disabled={adding === shift.id || !(nameInput[shift.id] || '').trim()}
                          className="shrink-0 px-3.5 py-2 bg-[#E30613] text-white text-xs font-bold rounded-xl disabled:opacity-40 transition-all active:scale-95 shadow-sm shadow-red-500/20"
                        >
                          {adding === shift.id ? '...' : 'שבץ'}
                        </button>
                        <input
                          ref={el => { inputRefs.current[shift.id] = el }}
                          type="text"
                          value={nameInput[shift.id] || ''}
                          onChange={e => setNameInput(prev => ({ ...prev, [shift.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addManual(shift.id)}
                          placeholder={`שם המתנדב (נותרו ${shift.max_volunteers - totalConfirmed} מקומות)`}
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-right bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/25 focus:border-[#E30613] transition-all"
                        />
                      </div>
                    )}
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

/* ─── Main Dispatcher component ─── */
export default function Dispatcher() {
  const { invalidate } = useCalendar()
  const [view, setView] = useState('approvals')

  return (
    <div className="flex flex-col gap-3">
      {/* View toggle */}
      <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
        {[['approvals', 'אישורים'], ['manual', 'שיבוץ ידני']].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
              view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'approvals' ? (
        <Approvals invalidate={invalidate} />
      ) : (
        <ManualAssignment invalidate={invalidate} />
      )}
    </div>
  )
}
