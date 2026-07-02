import { forwardRef } from 'react'

const HE_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

function fmtDate(ts) {
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
function fmtH(ts) {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}
function dayName(ts) {
  return HE_DAYS[new Date(ts).getDay()]
}
function fmtRange(from, to) {
  const a = new Date(from + 'T12:00:00')
  const b = new Date(to   + 'T12:00:00')
  const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
  return `${fmt(a)} – ${fmt(b)}`
}

const RED   = '#E30613'
const TH = { padding: '8px 11px', background: RED, color: '#fff', border: '1px solid #c0000f', textAlign: 'right', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' }
const TDR = { padding: '7px 11px', border: '1px solid #e5e7eb', textAlign: 'right',  fontSize: '11px', color: '#1a1a1a', verticalAlign: 'top' }
const TDC = { ...TDR, textAlign: 'center' }

const ShiftsScheduleExport = forwardRef(({ shifts, volunteersMap, dateFrom, dateTo }, ref) => (
  <div
    ref={ref}
    dir="rtl"
    style={{ fontFamily: 'Arial, sans-serif', background: '#fff', padding: '28px 32px', width: 'max-content', minWidth: '820px' }}
  >
    {/* Header */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `3px solid ${RED}`, paddingBottom: '12px', marginBottom: '16px' }}>
      <div style={{ fontSize: '10px', color: '#aaa' }}>הופק: {new Date().toLocaleDateString('he-IL')}</div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111' }}>סידור משמרות — מד"א</div>
        <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>{fmtRange(dateFrom, dateTo)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg viewBox="0 0 48 48" width="28" height="28">
          <polygon points="24,2 4.95,35 43.05,35" fill={RED}/>
          <polygon points="24,46 4.95,13 43.05,13" fill={RED}/>
        </svg>
      </div>
    </div>

    {/* Table */}
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          {['יום','תאריך','כותרת משמרת','שעות','מיקום','מתנדבים מאושרים'].map(h => (
            <th key={h} style={TH}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {shifts.length === 0 ? (
          <tr>
            <td colSpan={6} style={{ ...TDC, padding: '24px', color: '#aaa' }}>אין משמרות בטווח זה</td>
          </tr>
        ) : shifts.map((s, i) => {
          const vols = volunteersMap[s.id] || []
          return (
            <tr key={s.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
              <td style={{ ...TDC, fontWeight: '600' }}>{dayName(s.start_time)}</td>
              <td style={TDC}>{fmtDate(s.start_time)}</td>
              <td style={{ ...TDR, fontWeight: '600' }}>{s.title}</td>
              <td style={{ ...TDC, whiteSpace: 'nowrap' }}>{fmtH(s.start_time)}–{fmtH(s.end_time)}</td>
              <td style={TDR}>{s.location || '—'}</td>
              <td style={{ ...TDR, maxWidth: '280px', lineHeight: '1.5' }}>
                {vols.length === 0
                  ? <span style={{ color: '#bbb', fontStyle: 'italic' }}>אין מאושרים</span>
                  : vols.map((v, vi) => (
                    <span key={vi}>
                      {v.name}
                      {vi < vols.length - 1 && <span style={{ color: '#ccc' }}> · </span>}
                    </span>
                  ))
                }
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>

    {/* Footer */}
    <div style={{ fontSize: '9px', color: '#ccc', textAlign: 'left', marginTop: '10px' }}>
      סה"כ {shifts.length} משמרות
    </div>
  </div>
))

ShiftsScheduleExport.displayName = 'ShiftsScheduleExport'
export default ShiftsScheduleExport
