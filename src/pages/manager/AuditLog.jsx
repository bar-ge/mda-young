import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const ACTION_LABELS = {
  shift_created:       { label: 'משמרת נוצרה',      icon: '➕', color: 'text-emerald-700 bg-emerald-50' },
  shift_deleted:       { label: 'משמרת נמחקה',      icon: '🗑️', color: 'text-red-600 bg-red-50'        },
  shift_updated:       { label: 'משמרת עודכנה',     icon: '✏️', color: 'text-sky-700 bg-sky-50'         },
  shift_status_toggled:{ label: 'סטטוס שונה',       icon: '🔄', color: 'text-amber-700 bg-amber-50'    },
  veteran_toggled:     { label: 'בוגר שונה',         icon: '🎖️', color: 'text-purple-700 bg-purple-50'  },
  volunteer_approved:  { label: 'מתנדב אושר',       icon: '✅', color: 'text-emerald-700 bg-emerald-50' },
  volunteer_declined:  { label: 'מתנדב נדחה',       icon: '❌', color: 'text-red-600 bg-red-50'        },
  bulk_approved:       { label: 'אישור המוני',       icon: '⚡', color: 'text-emerald-700 bg-emerald-50' },
  manual_assigned:     { label: 'שיבוץ ידני נוסף',  icon: '👤', color: 'text-sky-700 bg-sky-50'        },
  manual_removed:      { label: 'שיבוץ ידני הוסר',  icon: '✂️', color: 'text-gray-600 bg-gray-100'     },
  day_blocked:         { label: 'יום נחסם',          icon: '🔒', color: 'text-gray-600 bg-gray-100'     },
  day_unblocked:       { label: 'יום נפתח',          icon: '🔓', color: 'text-emerald-700 bg-emerald-50' },
}

function timeAgo(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60)   return 'עכשיו'
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`
  if (diff < 86400)return `לפני ${Math.floor(diff / 3600)} שעות`
  const dd = String(d.getDate()).padStart(2,'0')
  const mm = String(d.getMonth()+1).padStart(2,'0')
  const yy = String(d.getFullYear()).slice(-2)
  const hh = d.toLocaleTimeString('he-IL', { hour:'2-digit', minute:'2-digit' })
  return `${dd}/${mm}/${yy} · ${hh}`
}

export default function AuditLog() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const PAGE = 30

  useEffect(() => { load(0) }, [])

  async function load(p) {
    setLoading(true)
    const { data } = await supabase
      .from('audit_logs')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .range(p * PAGE, p * PAGE + PAGE - 1)

    if (data) {
      setLogs(prev => p === 0 ? data : [...prev, ...data])
      setHasMore(data.length === PAGE)
      setPage(p)
    }
    setLoading(false)
  }

  function loadMore() { load(page + 1) }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button onClick={() => load(0)} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40">
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          רענן
        </button>
        <span className="text-xs text-gray-400">יומן פעילות</span>
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3">
              <div className="skeleton w-8 h-8 rounded-xl shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="skeleton h-2.5 w-3/4 rounded" />
              </div>
              <div className="skeleton h-2.5 w-12 rounded" />
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <span className="text-4xl">📋</span>
          <p className="text-gray-400 text-sm">אין פעילות עדיין</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map(log => {
            const cfg = ACTION_LABELS[log.action] || { label: log.action, icon: '•', color: 'text-gray-500 bg-gray-100' }
            const detail = log.details || {}

            return (
              <div key={log.id} className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-4 py-3 flex items-start gap-3">
                <span className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-base ${cfg.color}`}>
                  {cfg.icon}
                </span>
                <div className="flex-1 text-right min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{cfg.label}</p>
                  {(detail.title || detail.name || detail.date || detail.count) && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {detail.title || detail.name || detail.date}
                      {detail.count && ` · ${detail.count} מתנדבים`}
                    </p>
                  )}
                  {log.profiles?.full_name && (
                    <p className="text-[10px] text-gray-300 mt-0.5">{log.profiles.full_name}</p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] text-gray-300 mt-0.5 whitespace-nowrap">{timeAgo(log.created_at)}</span>
              </div>
            )
          })}

          {hasMore && (
            <button onClick={loadMore} disabled={loading}
              className="py-3 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40">
              {loading ? 'טוען...' : 'טען עוד'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
