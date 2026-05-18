import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useCalendar } from '../../contexts/CalendarContext'
import { isoDate } from '../../components/CalendarGrid'
import EventExportTable from '../../components/EventExportTable'
import EditEventPanel from './EditEventPanel'

function formatDate(ts) {
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
}
function formatHour(ts) {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

// --- week helpers ---
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function weekStartSunday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}
function fmtDM(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

const MONTH_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

const statusCfg = {
  open:      { label: 'פתוחה',  bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  assigned:  { label: 'מאוישת', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  confirmed: { label: 'מאושרת', bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500'     },
  completed: { label: 'הושלמה', bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400'    },
  cancelled: { label: 'סגורה',  bg: 'bg-gray-100',   text: 'text-gray-400',    dot: 'bg-gray-300'    },
}
const typeDot = {
  regular: 'bg-[#E30613]',
  event:   'bg-amber-400',
  holiday: 'bg-gray-400',
}

export default function ShiftsList({ typeFilter = null }) {
  const { year, month, refreshKey } = useCalendar()
  const [shifts,        setShifts]        = useState([])
  const [countMap,      setCountMap]      = useState({})
  const [loading,       setLoading]       = useState(true)
  const [filter,        setFilter]        = useState('all')
  const [expandedId,    setExpandedId]    = useState(null)
  const [volunteersMap, setVolunteersMap] = useState({})
  const [loadingVols,   setLoadingVols]   = useState(null)
  const [editingShift,  setEditingShift]  = useState(null)

  // export panel state (events only)
  const [showExport,     setShowExport]     = useState(false)
  const [exportMode,     setExportMode]     = useState('month')  // 'month' | 'week'
  const [exportYear,     setExportYear]     = useState(year)
  const [exportMonth,    setExportMonth]    = useState(month)
  const [exportWeekStart,setExportWeekStart]= useState(() => weekStartSunday(new Date().toISOString().slice(0,10)))
  const [exportEvents,       setExportEvents]       = useState([])
  const [exportStatusFilter, setExportStatusFilter] = useState('all') // 'all' | 'active' | 'inactive'
  const [exportLoading,      setExportLoading]      = useState(false)
  const [exporting,          setExporting]          = useState(false)
  const [printing,           setPrinting]           = useState(false)
  const exportRef = useRef(null)

  const PAGE_SIZE = 20
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => { load() }, [year, month, refreshKey])
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [filter, shifts])

  // sync export year/month when calendar changes
  useEffect(() => { setExportYear(year); setExportMonth(month) }, [year, month])

  // load export events whenever panel params change
  useEffect(() => {
    if (!showExport) return
    loadExportEvents()
  }, [showExport, exportMode, exportYear, exportMonth, exportWeekStart])

  async function load() {
    setLoading(true)
    setExpandedId(null)
    const from    = isoDate(year, month, 1)
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to      = isoDate(year, month, lastDay) + 'T23:59:59'

    try {
      const { data: sh } = await supabase
        .from('shifts').select('*')
        .gte('start_time', from).lte('start_time', to)
        .order('start_time')

      if (sh) {
        setShifts(sh)
        const ids = sh.map(s => s.id)
        if (ids.length) {
          const { data: ca } = await supabase
            .from('shift_assignments').select('shift_id')
            .eq('status', 'confirmed').in('shift_id', ids)
          const cmap = {}
          ca?.forEach(a => { cmap[a.shift_id] = (cmap[a.shift_id] || 0) + 1 })
          setCountMap(cmap)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadExportEvents() {
    setExportLoading(true)
    let from, to
    if (exportMode === 'month') {
      from = isoDate(exportYear, exportMonth, 1)
      const last = new Date(exportYear, exportMonth + 1, 0).getDate()
      to   = isoDate(exportYear, exportMonth, last) + 'T23:59:59'
    } else {
      from = exportWeekStart
      to   = addDays(exportWeekStart, 6) + 'T23:59:59'
    }
    const { data } = await supabase
      .from('shifts').select('*')
      .eq('shift_type', 'event')
      .gte('start_time', from).lte('start_time', to)
      .order('start_time')
    setExportEvents(data || [])
    setExportLoading(false)
  }

  async function handlePrint() {
    if (!exportRef.current) return
    setPrinting(true)
    try {
      const html = exportRef.current.outerHTML
      const win = window.open('', '_blank', 'width=1200,height=800')
      win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>אירועים – ${exportTitle}</title><style>body{margin:24px;font-family:Arial,sans-serif}</style></head><body>${html}</body></html>`)
      win.document.close()
      win.focus()
      win.print()
      win.close()
    } finally {
      setPrinting(false)
    }
  }

  async function handleExport() {
    if (!exportRef.current) return
    setExporting(true)
    try {
      const { toPng } = await import('html-to-image')
      const url = await toPng(exportRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' })
      const a = document.createElement('a')
      a.href = url
      a.download = `אירועים-${exportTitle}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  async function toggleExpand(shiftId) {
    if (expandedId === shiftId) { setExpandedId(null); return }
    setExpandedId(shiftId)
    if (volunteersMap[shiftId]) return

    setLoadingVols(shiftId)
    const { data: asgn } = await supabase
      .from('shift_assignments')
      .select('id, user_id, manual_name, status')
      .eq('shift_id', shiftId).eq('status', 'confirmed')

    if (asgn) {
      const userIds = asgn.filter(a => a.user_id).map(a => a.user_id)
      let profileMap = {}
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('profiles').select('id, full_name, phone').in('id', userIds)
        profs?.forEach(p => { profileMap[p.id] = p })
      }
      const volunteers = asgn.map(a => ({
        id: a.id,
        name: a.manual_name || profileMap[a.user_id]?.full_name || 'לא ידוע',
        phone: profileMap[a.user_id]?.phone || null,
        isManual: !!a.manual_name,
      }))
      setVolunteersMap(prev => ({ ...prev, [shiftId]: volunteers }))
    }
    setLoadingVols(null)
  }

  const monthName = new Date(year, month, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
  const now = new Date()

  function effectiveStatus(s) {
    const past = new Date(s.end_time || s.start_time) < now
    return past && s.status === 'open' ? 'cancelled' : s.status
  }

  const filtered = shifts.filter(s => {
    if (typeFilter && s.shift_type !== typeFilter) return false
    const eff = effectiveStatus(s)
    if (filter === 'open')   return eff !== 'cancelled'
    if (filter === 'closed') return eff === 'cancelled'
    return true
  })

  // filter export events by active/inactive
  const filteredExportEvents = exportEvents.filter(ev => {
    if (exportStatusFilter === 'all') return true
    const isPast = new Date(ev.end_time || ev.start_time) < now
    return exportStatusFilter === 'inactive' ? isPast : !isPast
  })

  // export title
  const exportTitle = exportMode === 'month'
    ? `${MONTH_HE[exportMonth]} ${exportYear}`
    : `${fmtDM(exportWeekStart)} – ${fmtDM(addDays(exportWeekStart, 6))}`

  return (
    <>
    <div className="flex flex-col gap-3">

      {/* ── Export panel (events only) ── */}
      {typeFilter === 'event' && (
        <>
          <button
            onClick={() => setShowExport(v => !v)}
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-sm font-bold transition-all ${
              showExport
                ? 'bg-gray-100 text-gray-600 border border-gray-200'
                : 'bg-[#E30613] text-white shadow-sm shadow-red-500/25'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            {showExport ? 'סגור ייצוא' : 'ייצוא אירועים לתמונה'}
          </button>

          {showExport && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-4">

              {/* Mode toggle */}
              <div className="flex gap-2">
                {[['month','חודש'],['week','שבוע']].map(([m,l]) => (
                  <button key={m} onClick={() => setExportMode(m)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      exportMode === m
                        ? 'bg-[#E30613] text-white shadow-sm shadow-red-500/20'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                    {l}
                  </button>
                ))}
              </div>

              {/* Date range navigator */}
              {exportMode === 'month' ? (
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => {
                    if (exportMonth === 0) { setExportMonth(11); setExportYear(y => y - 1) }
                    else setExportMonth(m => m - 1)
                  }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </button>
                  <span className="text-sm font-bold text-gray-800">{MONTH_HE[exportMonth]} {exportYear}</span>
                  <button onClick={() => {
                    if (exportMonth === 11) { setExportMonth(0); setExportYear(y => y + 1) }
                    else setExportMonth(m => m + 1)
                  }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => setExportWeekStart(w => addDays(w, -7))}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </button>
                  <span className="text-xs font-bold text-gray-800 text-center">
                    {fmtDM(exportWeekStart)} – {fmtDM(addDays(exportWeekStart, 6))}
                  </span>
                  <button onClick={() => setExportWeekStart(w => addDays(w, 7))}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  </button>
                </div>
              )}

              {/* Active / Inactive filter */}
              <div className="flex gap-2">
                {[
                  ['all',      'הכל'],
                  ['active',   'פעילים'],
                  ['inactive', 'לא פעילים'],
                ].map(([val, label]) => (
                  <button key={val} onClick={() => setExportStatusFilter(val)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      exportStatusFilter === val
                        ? 'bg-[#E30613] text-white shadow-sm shadow-red-500/20'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                    {label}
                    {val !== 'all' && !exportLoading && (
                      <span className="mr-1 opacity-70">
                        ({exportEvents.filter(ev => {
                          const isPast = new Date(ev.end_time || ev.start_time) < now
                          return val === 'inactive' ? isPast : !isPast
                        }).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-gray-100 overflow-auto max-h-64">
                {exportLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="text-[8px] origin-top-left" style={{ transform: 'scale(0.6)', width: '166.7%' }}>
                    <EventExportTable events={filteredExportEvents} title={exportTitle} />
                  </div>
                )}
              </div>

              {/* Export buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  disabled={exporting || exportLoading}
                  className="flex-1 py-3 bg-[#E30613] text-white font-bold rounded-xl shadow-sm shadow-red-500/20 disabled:opacity-40 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> מייצא...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>PNG</>
                  )}
                </button>
                <button
                  onClick={handlePrint}
                  disabled={printing || exportLoading}
                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl disabled:opacity-40 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
                >
                  {printing ? (
                    <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> מדפיס...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/></svg>הדפסה</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Hidden full-size export table (used by html-to-image) */}
          <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
            <EventExportTable ref={exportRef} events={filteredExportEvents} title={exportTitle} />
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{filtered.length} {typeFilter === 'event' ? 'אירועים' : 'משמרות'}</span>
        <span className="text-xs font-semibold text-gray-500">{monthName}</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[['all', 'הכל'], ['open', 'פתוחות'], ['closed', 'סגורות']].map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === f
                ? 'bg-[#E30613] text-white shadow-md shadow-red-500/25'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <span className="text-4xl">📅</span>
          <p className="text-gray-400 text-sm">{typeFilter === 'event' ? 'אין אירועים בחודש זה' : 'אין משמרות בחודש זה'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.slice(0, visibleCount).map(shift => {
            const eff       = effectiveStatus(shift)
            const cfg       = statusCfg[eff] || statusCfg.open
            const confirmed = countMap[shift.id] || 0
            const isFull    = shift.max_volunteers > 0 && confirmed >= shift.max_volunteers
            const isExpanded = expandedId === shift.id
            const vols      = volunteersMap[shift.id]

            return (
              <div key={shift.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                eff === 'cancelled' ? 'border-gray-100 opacity-60' : 'border-gray-100'
              }`}>
                <button
                  onClick={() => toggleExpand(shift.id)}
                  className="w-full px-4 py-3 flex flex-col gap-1.5 text-right active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      {shift.max_volunteers > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isFull
                            ? 'bg-red-50 text-red-600 border-red-100'
                            : confirmed > 0
                            ? 'bg-sky-50 text-sky-700 border-sky-100'
                            : 'bg-gray-50 text-gray-400 border-gray-100'
                        }`}>
                          {confirmed}/{shift.max_volunteers}
                        </span>
                      )}
                      {shift.veteran_only && <span className="text-xs">🎖️</span>}
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${eff === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {shift.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${typeDot[shift.shift_type] || 'bg-gray-400'}`} />
                      {shift.location && <span className="text-[10px] text-gray-400">{shift.location}</span>}
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDate(shift.start_time)} · {formatHour(shift.start_time)}–{formatHour(shift.end_time)}
                    </p>
                  </div>

                  {/* Event resource summary */}
                  {shift.shift_type === 'event' && (
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {shift.event_nature && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">{shift.event_nature}</span>
                      )}
                      {shift.expected_crowd > 0 && (
                        <span className="text-[10px] text-gray-500">👥 {shift.expected_crowd.toLocaleString()}</span>
                      )}
                      {(() => {
                        const total = (shift.motorcycle_count || 0) * 1 + (shift.white_amb_count || 0) * 2 + (shift.er_team_count || 0) * 3
                        return total > 0 ? (
                          <span className="text-[10px] font-bold text-[#E30613] bg-[#E30613]/8 px-2 py-0.5 rounded-full">
                            {total} מתנדבים
                          </span>
                        ) : null
                      })()}
                    </div>
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3" dir="rtl">
                    {/* Edit button (events only) */}
                    {typeFilter === 'event' && (
                      <button
                        onClick={() => setEditingShift(shift)}
                        className="w-full mb-3 flex items-center justify-center gap-2 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:border-[#E30613] hover:text-[#E30613] transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                        </svg>
                        עריכת אירוע
                      </button>
                    )}
                    {/* Event resource counts */}
                    {shift.shift_type === 'event' && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">כוח אדם וציוד</span>
                          {(() => {
                            const total = (shift.motorcycle_count || 0) * 1 + (shift.white_amb_count || 0) * 2 + (shift.er_team_count || 0) * 3
                            return total > 0 ? (
                              <span className="text-xs font-bold text-[#E30613]">סה״כ: {total} מתנדבים</span>
                            ) : null
                          })()}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            ['אופנוע', shift.motorcycle_count],
                            ['אס"ן',   shift.asn_count],
                            ['לבן',    shift.white_amb_count],
                            ["אמב' 4X4", shift.amb_4x4_count],
                            ['ALS באהל', shift.als_tent_count],
                            ['ע"ר',    shift.er_team_count],
                            ['חפ"ק',   shift.hq_rep_count],
                            ['מפקד',   shift.commander_count],
                            ['חובש',   shift.emt_count],
                            ['ס. מנהל',shift.ops_manager_count],
                            ['טרקטורון',shift.atv_count],
                            ['פרמדיק', shift.paramedic_count],
                            ['תאר"ן',  shift.taran],
                          ].filter(([, v]) => v > 0).map(([label, val]) => (
                            <span key={label} className="text-[10px] bg-white border border-gray-200 rounded-lg px-2 py-1 font-medium text-gray-700">
                              {label}: <span className="text-[#E30613] font-bold">{val}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Volunteers */}
                    {loadingVols === shift.id ? (
                      <div className="flex justify-center py-3">
                        <div className="w-4 h-4 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : !vols || vols.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">אין מתנדבים מאושרים</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">מתנדבים מאושרים</p>
                        {vols.map(v => (
                          <div key={v.id} className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100">
                            <div className="flex items-center gap-2">
                              {v.phone && (
                                <a href={`tel:${v.phone}`} onClick={e => e.stopPropagation()}
                                  className="text-[10px] text-sky-600 font-medium">
                                  {v.phone}
                                </a>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                v.isManual ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {v.isManual ? 'ידני' : 'אפליקציה'}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-800">{v.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {visibleCount < filtered.length && (
            <button
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              className="w-full py-2.5 text-sm font-semibold text-gray-500 bg-white border border-gray-200 rounded-2xl active:bg-gray-50 transition-all"
            >
              הצג עוד ({filtered.length - visibleCount} נוספים)
            </button>
          )}
        </div>
      )}
    </div>

    {/* Edit panel */}
    {editingShift && (
      <EditEventPanel
        shift={editingShift}
        onClose={() => setEditingShift(null)}
        onSaved={() => { setEditingShift(null); load() }}
      />
    )}
    </>
  )
}
