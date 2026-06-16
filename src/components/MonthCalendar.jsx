import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCalendar } from '../contexts/CalendarContext'
import { useToast } from '../contexts/ToastContext'

async function logAudit(userId, action, entityId, details = {}) {
  await supabase.from('audit_logs').insert({ user_id: userId, action, entity_type: 'shift', entity_id: entityId, details })
}

const DAYS_HEADER = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

const typeStyle = {
  regular: { dot: 'bg-[#E30613]',  label: 'משמרת', ring: 'ring-[#E30613]/30' },
  event:   { dot: 'bg-amber-400',  label: 'אירוע', ring: 'ring-amber-400/30' },
  holiday: { dot: 'bg-gray-400',   label: 'סגור',  ring: 'ring-gray-300'     },
}

function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function formatHour(ts) {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}
function toLocalDT(ts) {
  const d = new Date(ts)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function MonthCalendar({ jumpToDate }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const deleteTimers = useRef({})
  const { year, month, setYear, setMonth, prevMonth, nextMonth, refreshKey, invalidate } = useCalendar()
  const [shifts,           setShifts]           = useState([])
  const [blocked,          setBlocked]          = useState([])
  const [selected,         setSelected]         = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [manualMap,        setManualMap]        = useState({})
  const [confirmedMap,     setConfirmedMap]     = useState({})
  const [deleting,         setDeleting]         = useState(null)
  const [closing,          setClosing]          = useState(false)
  const [toggling,         setToggling]         = useState(null)
  const [togVet,           setTogVet]           = useState(null)
  const [removing,         setRemoving]         = useState(null)
  const [editingId,        setEditingId]        = useState(null)
  const [editForm,         setEditForm]         = useState({})
  const [saving,           setSaving]           = useState(false)
  const [addingToShift,    setAddingToShift]    = useState(null)
  const [addMode,          setAddMode]          = useState('system')
  const [addText,          setAddText]          = useState('')
  const [addUserId,        setAddUserId]        = useState('')
  const [addingAssign,     setAddingAssign]     = useState(false)
  const [allProfiles,      setAllProfiles]      = useState([])

  useEffect(() => { load() }, [year, month, refreshKey])
  useEffect(() => { loadProfiles() }, [])

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
    try {
      const from    = isoDate(year, month, 1)
      const lastDay = new Date(year, month + 1, 0).getDate()
      const to      = isoDate(year, month, lastDay) + 'T23:59:59'

      const [{ data: sh }, { data: bl }] = await Promise.all([
        supabase.from('shifts')
          .select('id, title, start_time, end_time, status, shift_type, location, veteran_only, max_volunteers')
          .gte('start_time', from).lte('start_time', to).order('start_time'),
        supabase.from('blocked_dates').select('date, reason')
          .gte('date', from.slice(0, 10)).lte('date', to.slice(0, 10)),
      ])

      if (sh) setShifts(sh)
      if (bl) setBlocked(bl)

      const shiftIds = sh?.map(s => s.id) || []
      if (shiftIds.length) {
        const [{ data: ma }, { data: ca }] = await Promise.all([
          supabase.from('shift_assignments')
            .select('id, shift_id, manual_name')
            .not('manual_name', 'is', null)
            .in('shift_id', shiftIds),
          supabase.from('shift_assignments')
            .select('id, shift_id, user_id')
            .eq('status', 'confirmed')
            .is('manual_name', null)
            .in('shift_id', shiftIds),
        ])

        if (ma) {
          const mmap = {}
          ma.forEach(a => {
            if (!mmap[a.shift_id]) mmap[a.shift_id] = []
            mmap[a.shift_id].push(a)
          })
          setManualMap(mmap)
        }

        if (ca && ca.length) {
          const userIds = [...new Set(ca.map(a => a.user_id).filter(Boolean))]
          const { data: profiles } = userIds.length
            ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
            : { data: [] }
          const pm = {}
          profiles?.forEach(p => { pm[p.id] = p })

          const cmap = {}
          ca.forEach(a => {
            if (!cmap[a.shift_id]) cmap[a.shift_id] = []
            cmap[a.shift_id].push({ id: a.id, name: pm[a.user_id]?.full_name || 'מתנדב' })
          })
          setConfirmedMap(cmap)
        } else {
          setConfirmedMap({})
        }
      } else {
        setManualMap({})
        setConfirmedMap({})
      }
    } finally {
      setLoading(false)
    }
  }

  function deleteShift(shiftId) {
    const shift = shifts.find(s => s.id === shiftId)
    if (!shift) return
    setShifts(prev => prev.filter(s => s.id !== shiftId))
    if (selected === shiftId) setSelected(null)

    const tid = toast(`"${shift.title}" נמחקה`, {
      duration: 5000,
      action: {
        label: 'ביטול',
        fn: () => {
          clearTimeout(deleteTimers.current[shiftId])
          delete deleteTimers.current[shiftId]
          setShifts(prev => [...prev, shift].sort((a, b) => a.start_time.localeCompare(b.start_time)))
        },
      },
    })

    deleteTimers.current[shiftId] = setTimeout(async () => {
      delete deleteTimers.current[shiftId]
      await supabase.from('shift_assignments').delete().eq('shift_id', shiftId)
      await supabase.from('shifts').delete().eq('id', shiftId)
      logAudit(user?.id, 'shift_deleted', shiftId, { title: shift.title })
      invalidate()
    }, 5000)
  }

  async function removeAssignment(assignmentId, shiftId, isManual) {
    setRemoving(assignmentId)
    const { error } = await supabase.from('shift_assignments').delete().eq('id', assignmentId)
    if (!error) {
      if (isManual) {
        setManualMap(prev => ({ ...prev, [shiftId]: (prev[shiftId] || []).filter(a => a.id !== assignmentId) }))
      } else {
        setConfirmedMap(prev => ({ ...prev, [shiftId]: (prev[shiftId] || []).filter(a => a.id !== assignmentId) }))
      }
      invalidate()
    }
    setRemoving(null)
  }

  async function toggleShiftStatus(shift) {
    const newStatus = shift.status === 'cancelled' ? 'open' : 'cancelled'
    setToggling(shift.id)
    const { error } = await supabase.from('shifts').update({ status: newStatus }).eq('id', shift.id)
    if (!error) {
      setShifts(prev => prev.map(s => s.id === shift.id ? { ...s, status: newStatus } : s))
      toast(newStatus === 'cancelled' ? 'המשמרת נסגרה' : 'המשמרת נפתחה')
      logAudit(user?.id, 'shift_status_toggled', shift.id, { title: shift.title, status: newStatus })
      invalidate()
    }
    setToggling(null)
  }

  async function toggleVeteran(shift) {
    const newVal = !shift.veteran_only
    const newStatus = newVal ? 'cancelled' : 'open'
    setTogVet(shift.id)
    const { error } = await supabase.from('shifts').update({ veteran_only: newVal, status: newStatus }).eq('id', shift.id)
    if (!error) {
      setShifts(prev => prev.map(s => s.id === shift.id ? { ...s, veteran_only: newVal, status: newStatus } : s))
      toast(newVal ? 'סומן כבוגרים בלבד — המשמרת נסגרה' : 'בוגרים בוטל — המשמרת נפתחה')
      logAudit(user?.id, 'veteran_toggled', shift.id, { title: shift.title, veteran_only: newVal })
    }
    setTogVet(null)
  }

  async function closeDay(dateStr) {
    setClosing(true)
    const { error } = await supabase.from('blocked_dates').upsert({ date: dateStr, created_by: user?.id })
    if (!error) {
      setBlocked(prev => [...prev.filter(b => b.date !== dateStr), { date: dateStr, reason: null }])
      toast('היום נחסם')
      logAudit(user?.id, 'day_blocked', null, { date: dateStr })
      invalidate()
    }
    setClosing(false)
  }

  async function openDay(dateStr) {
    setClosing(true)
    const { error } = await supabase.from('blocked_dates').delete().eq('date', dateStr)
    if (!error) {
      setBlocked(prev => prev.filter(b => b.date !== dateStr))
      toast('חסימת היום בוטלה')
      logAudit(user?.id, 'day_unblocked', null, { date: dateStr })
      invalidate()
    }
    setClosing(false)
  }

  async function loadProfiles() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .order('full_name')
    if (data) setAllProfiles(data)
  }

  function openAddForm(shiftId) {
    setAddingToShift(shiftId)
    setAddMode('system')
    setAddText('')
    setAddUserId('')
  }

  async function addAssignment(shiftId) {
    if (addMode === 'manual' && !addText.trim()) return
    if (addMode === 'system' && !addUserId) return
    setAddingAssign(true)

    const payload = addMode === 'manual'
      ? { shift_id: shiftId, manual_name: addText.trim(), status: 'confirmed' }
      : { shift_id: shiftId, user_id: addUserId, status: 'confirmed' }

    const { data, error } = await supabase.from('shift_assignments').insert(payload).select().single()

    if (!error && data) {
      if (addMode === 'manual') {
        setManualMap(prev => ({
          ...prev,
          [shiftId]: [...(prev[shiftId] || []), { id: data.id, manual_name: data.manual_name }],
        }))
        toast(`${addText.trim()} שובץ`)
        logAudit(user?.id, 'manual_assigned', shiftId, { name: addText.trim() })
      } else {
        const profile = allProfiles.find(p => p.id === addUserId)
        setConfirmedMap(prev => ({
          ...prev,
          [shiftId]: [...(prev[shiftId] || []), { id: data.id, name: profile?.full_name || 'מתנדב' }],
        }))
        toast(`${profile?.full_name || 'מתנדב'} שובץ`)
        logAudit(user?.id, 'manual_assigned', shiftId, { name: profile?.full_name })
      }
      invalidate()
    } else if (error) {
      toast('שגיאה בשיבוץ', { type: 'error' })
    }
    setAddingToShift(null)
    setAddingAssign(false)
  }

  function startEdit(s) {
    setEditingId(s.id)
    setEditForm({
      title:          s.title || '',
      description:    s.description || '',
      location:       s.location || '',
      start_time:     toLocalDT(s.start_time),
      end_time:       toLocalDT(s.end_time),
      max_volunteers: s.max_volunteers ?? 1,
      veteran_only:   s.veteran_only || false,
    })
  }

  async function saveEdit(shiftId) {
    if (!editForm.title.trim()) return
    setSaving(true)
    const payload = {
      title:          editForm.title.trim(),
      description:    editForm.description.trim() || null,
      location:       editForm.location.trim() || null,
      start_time:     new Date(editForm.start_time).toISOString(),
      end_time:       new Date(editForm.end_time).toISOString(),
      max_volunteers: parseInt(editForm.max_volunteers) || 1,
      veteran_only:   editForm.veteran_only,
    }
    const { data, error } = await supabase
      .from('shifts').update(payload).eq('id', shiftId).select().single()
    if (!error && data) {
      setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, ...data } : s))
      toast('המשמרת עודכנה')
      logAudit(user?.id, 'shift_updated', shiftId, { title: data.title })
    }
    setEditingId(null)
    invalidate()
    setSaving(false)
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
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="text-xs">🎖️</span>
          בוגר
        </span>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS_HEADER.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold text-gray-400">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-[52px] flex flex-col items-center justify-start pt-1.5 pb-1 gap-1 border-b border-r border-gray-50 last:border-r-0">
                {i >= 7 && <div className="skeleton w-6 h-6 rounded-full" />}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={`e${idx}`} className="min-h-[52px] border-b border-r border-gray-50 last:border-r-0" />
              const dateStr   = isoDate(year, month, day)
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-3">

          {/* Day header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {/* Close / open day button */}
              {selectedBlocked ? (
                <button
                  onClick={() => openDay(selected)}
                  disabled={closing}
                  className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition-colors disabled:opacity-40"
                >
                  {closing ? '...' : 'בטל חסימה ✓'}
                </button>
              ) : (
                <button
                  onClick={() => closeDay(selected)}
                  disabled={closing}
                  className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                >
                  {closing ? '...' : '🔒 סגור יום'}
                </button>
              )}
            </div>
            <span className="font-semibold text-gray-900 text-sm text-right">
              {(() => { const d = new Date(selected + 'T12:00:00'); return `${d.toLocaleDateString('he-IL',{weekday:'long'})} · ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}` })()}
            </span>
          </div>

          {/* Blocked reason */}
          {selectedBlocked && (
            <div className="flex items-center justify-end gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="text-sm text-gray-600 font-medium">{selectedReason || 'יום חסום'}</span>
              <span className="text-lg">🔒</span>
            </div>
          )}

          {/* Shifts list */}
          {selectedShifts.length === 0 && !selectedBlocked ? (
            <p className="text-gray-400 text-sm text-center py-2">אין משמרות ביום זה</p>
          ) : (
            selectedShifts.map(s => {
              const style    = typeStyle[s.shift_type] || typeStyle.regular
              const isClosed = s.status === 'cancelled'
              const manuals  = manualMap[s.id] || []
              const isEditing = editingId === s.id

              return (
                <div key={s.id} className={`flex flex-col gap-2 rounded-xl px-3 py-2.5 ring-1 ${isClosed && !isEditing ? 'bg-gray-50 ring-gray-200 opacity-70' : `bg-gray-50 ${style.ring}`}`}>

                  {isEditing ? (
                    /* ── Inline edit form ── */
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">ביטול</button>
                        <span className="text-xs font-bold text-gray-700">עריכת משמרת</span>
                      </div>

                      {/* Title */}
                      <input
                        value={editForm.title}
                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="כותרת *"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/25 focus:border-[#E30613]"
                      />

                      {/* Location */}
                      <input
                        value={editForm.location}
                        onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                        placeholder="מיקום (אופציונלי)"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/25 focus:border-[#E30613]"
                      />

                      {/* Times */}
                      {s.shift_type !== 'holiday' && (
                        <div className="flex flex-col gap-2">
                          {[
                            { label: 'התחלה', key: 'start_time' },
                            { label: 'סיום',  key: 'end_time'   },
                          ].map(({ label, key }) => (
                            <div key={key}>
                              <label className="block text-[10px] text-gray-400 mb-1 text-right">{label}</label>
                              <div className="grid grid-cols-2 gap-1.5">
                                <input type="date" lang="he-IL"
                                  value={editForm[key]?.slice(0, 10) || ''}
                                  onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value + 'T' + (f[key]?.slice(11) || '00:00') }))}
                                  className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/25 focus:border-[#E30613]" />
                                <div dir="ltr" className="flex items-center gap-0.5 rounded-lg border border-gray-200 px-1 bg-white focus-within:ring-2 focus-within:ring-[#E30613]/25 focus-within:border-[#E30613]">
                                  <select aria-label="שעה" value={editForm[key]?.slice(11, 13) || '00'}
                                    onChange={e => setEditForm(f => ({ ...f, [key]: (f[key]?.slice(0, 11) || '') + e.target.value + ':' + (f[key]?.slice(14) || '00') }))}
                                    className="flex-1 py-1.5 text-xs bg-transparent focus:outline-none text-center appearance-none">
                                    {Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=>(
                                      <option key={h} value={h}>{h}</option>
                                    ))}
                                  </select>
                                  <span className="text-gray-400 text-xs font-bold select-none">:</span>
                                  <select aria-label="דקות" value={editForm[key]?.slice(14, 16) || '00'}
                                    onChange={e => setEditForm(f => ({ ...f, [key]: (f[key]?.slice(0, 14) || '') + e.target.value }))}
                                    className="flex-1 py-1.5 text-xs bg-transparent focus:outline-none text-center appearance-none">
                                    {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m=>(
                                      <option key={m} value={m}>{m}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Max volunteers */}
                      <div className="flex items-center justify-between gap-2">
                        <input type="number" min="1" max="999" value={editForm.max_volunteers}
                          onChange={e => setEditForm(f => ({ ...f, max_volunteers: e.target.value }))}
                          className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/25 focus:border-[#E30613]" />
                        <span className="text-xs text-gray-500">מקסימום מתנדבים</span>
                      </div>

                      {/* Veteran toggle */}
                      <label className="flex items-center justify-end gap-2 cursor-pointer">
                        <span className="text-xs text-gray-600">בוגרים בלבד 🎖️</span>
                        <button type="button"
                          onClick={() => setEditForm(f => ({ ...f, veteran_only: !f.veteran_only }))}
                          className={`w-9 h-5 rounded-full transition-colors ${editForm.veteran_only ? 'bg-purple-500' : 'bg-gray-200'} relative`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${editForm.veteran_only ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </label>

                      {/* Save */}
                      <button
                        onClick={() => saveEdit(s.id)}
                        disabled={saving || !editForm.title.trim()}
                        className="w-full py-2 rounded-lg bg-[#E30613] text-white text-xs font-bold disabled:opacity-40 active:scale-[0.98] transition-all shadow-sm shadow-red-500/20"
                      >
                        {saving ? '...שומר' : 'שמירת שינויים'}
                      </button>
                    </div>
                  ) : (
                    /* ── Normal view ── */
                    <>
                      {/* Top row: delete | edit | title+time | status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => deleteShift(s.id)}
                            disabled={deleting === s.id}
                            className="w-9 h-9 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-40"
                          >
                            {deleting === s.id ? (
                              <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => startEdit(s)}
                            className="w-9 h-9 rounded-lg bg-sky-50 text-sky-500 flex items-center justify-center hover:bg-sky-100 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                            </svg>
                          </button>
                        </div>
                        <div className="flex-1 text-right">
                          <p className={`font-semibold text-sm ${isClosed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{s.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatHour(s.start_time)} – {formatHour(s.end_time)}
                            {s.location && ` · ${s.location}`}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isClosed            ? 'bg-gray-100 text-gray-400' :
                          s.status === 'open' ? 'bg-emerald-50 text-emerald-700' :
                                                'bg-amber-50 text-amber-700'
                        }`}>{isClosed ? 'סגורה' : style.label}</span>
                      </div>

                      {/* Assigned volunteers */}
                      {((confirmedMap[s.id] || []).length > 0 || manuals.length > 0) && (
                        <div className="flex flex-col gap-1">
                          {(confirmedMap[s.id] || []).map(a => (
                            <div key={a.id} className="flex items-center justify-between gap-2 bg-emerald-50 rounded-lg px-2.5 py-1.5">
                              <button onClick={() => removeAssignment(a.id, s.id, false)} disabled={removing === a.id}
                                className="shrink-0 w-5 h-5 rounded bg-white text-red-400 flex items-center justify-center text-xs hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 shadow-sm">
                                {removing === a.id ? '·' : '×'}
                              </button>
                              <span className="text-xs font-medium text-emerald-800 text-right flex-1">✓ {a.name}</span>
                            </div>
                          ))}
                          {manuals.map(a => (
                            <div key={a.id} className="flex items-center justify-between gap-2 bg-sky-50 rounded-lg px-2.5 py-1.5">
                              <button onClick={() => removeAssignment(a.id, s.id, true)} disabled={removing === a.id}
                                className="shrink-0 w-5 h-5 rounded bg-white text-red-400 flex items-center justify-center text-xs hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 shadow-sm">
                                {removing === a.id ? '·' : '×'}
                              </button>
                              <span className="text-xs font-medium text-sky-800 text-right flex-1">👤 {a.manual_name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Bottom row: veteran badge | actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {s.veteran_only && (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                              🎖️ בוגר בלבד
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleVeteran(s)} disabled={togVet === s.id}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all disabled:opacity-40 ${
                              s.veteran_only
                                ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'
                                : 'bg-white text-gray-400 border-gray-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200'
                            }`}>
                            {togVet === s.id ? '...' : '🎖️ בוגר'}
                          </button>
                          <button onClick={() => toggleShiftStatus(s)} disabled={toggling === s.id}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all disabled:opacity-40 ${
                              isClosed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                            }`}>
                            {toggling === s.id ? '...' : isClosed ? 'פתח משמרת' : 'סגור משמרת'}
                          </button>
                        </div>
                      </div>

                      {/* ── Add volunteer ── */}
                      {addingToShift === s.id ? (
                        <div className="flex flex-col gap-2 pt-1 border-t border-gray-200 mt-1">
                          {/* Mode toggle */}
                          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                            {[['system', 'מהמערכת'], ['manual', 'ידני']].map(([m, lbl]) => (
                              <button key={m} type="button"
                                onClick={() => { setAddMode(m); setAddText(''); setAddUserId('') }}
                                className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${
                                  addMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                                }`}>
                                {lbl}
                              </button>
                            ))}
                          </div>

                          {addMode === 'system' ? (
                            <select
                              value={addUserId}
                              onChange={e => setAddUserId(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-right bg-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/25 focus:border-[#E30613]"
                            >
                              <option value="">בחר מתנדב...</option>
                              {allProfiles.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.full_name}{p.phone ? ` · ${p.phone}` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={addText}
                              onChange={e => setAddText(e.target.value)}
                              placeholder="שם המתנדב"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-right bg-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/25 focus:border-[#E30613]"
                            />
                          )}

                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setAddingToShift(null)}
                              className="flex-1 py-1.5 text-[10px] font-bold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                              ביטול
                            </button>
                            <button
                              onClick={() => addAssignment(s.id)}
                              disabled={addingAssign || (addMode === 'manual' ? !addText.trim() : !addUserId)}
                              className="flex-1 py-1.5 text-[10px] font-bold rounded-lg bg-[#E30613] text-white disabled:opacity-40 active:scale-[0.98] transition-all shadow-sm shadow-red-500/20"
                            >
                              {addingAssign ? '...' : 'הוסף ✓'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openAddForm(s.id)}
                          className="w-full py-1.5 text-[10px] font-bold rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-[#E30613]/40 hover:text-[#E30613] hover:bg-[#E30613]/3 transition-all"
                        >
                          + הוסף מתנדב
                        </button>
                      )}
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
