import { forwardRef } from 'react'

const HE_DAYS = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\'']

function fmtH(ts) {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}
function fmtDateShort(dateStr) {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}
function fmtDateFull(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}
function dayLabel(dateStr) {
  return HE_DAYS[new Date(dateStr + 'T12:00:00').getDay()]
}

const RED = '#E30613'

const TH_DATE = {
  padding: '7px 10px',
  background: RED,
  color: '#fff',
  border: '1px solid #c0000f',
  textAlign: 'center',
  fontSize: '11px',
  fontWeight: 'bold',
  minWidth: '90px',
  whiteSpace: 'nowrap',
  lineHeight: '1.4',
}
const TH_ROW = {
  padding: '8px 12px',
  background: RED,
  color: '#fff',
  border: '1px solid #c0000f',
  textAlign: 'right',
  fontSize: '11px',
  fontWeight: 'bold',
  minWidth: '130px',
  whiteSpace: 'nowrap',
}

const ShiftsScheduleExport = forwardRef(({ shifts, volunteersMap, dateFrom, dateTo }, ref) => {
  // All calendar dates in range
  const allDates = []
  const cur = new Date(dateFrom + 'T12:00:00')
  const endDate = new Date(dateTo + 'T12:00:00')
  while (cur <= endDate) {
    allDates.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }

  // Unique shift types ordered by earliest start hour
  const seenTitles = new Set()
  const shiftTypes = []
  const sorted = [...shifts].sort((a, b) => {
    const ha = new Date(a.start_time).getHours() * 60 + new Date(a.start_time).getMinutes()
    const hb = new Date(b.start_time).getHours() * 60 + new Date(b.start_time).getMinutes()
    return ha - hb
  })
  sorted.forEach(s => {
    if (!seenTitles.has(s.title)) {
      seenTitles.add(s.title)
      shiftTypes.push({
        title: s.title,
        time: `${fmtH(s.start_time)}–${fmtH(s.end_time)}`,
        location: s.location || '',
      })
    }
  })

  // Lookup: title → date → { volunteers, veteranOnly }
  const lookup = {}
  shifts.forEach(s => {
    const date = s.start_time.slice(0, 10)
    if (!lookup[s.title]) lookup[s.title] = {}
    lookup[s.title][date] = {
      volunteers: volunteersMap[s.id] || [],
      veteranOnly: s.veteran_only || false,
    }
  })

  return (
    <div
      ref={ref}
      dir="rtl"
      style={{
        fontFamily: 'Arial, sans-serif',
        background: '#fff',
        padding: '24px 28px',
        width: 'max-content',
        minWidth: '500px',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `3px solid ${RED}`,
        paddingBottom: '10px',
        marginBottom: '14px',
      }}>
        <div style={{ fontSize: '10px', color: '#bbb', textAlign: 'left' }}>
          הופק: {new Date().toLocaleDateString('he-IL')}
          <br />
          {shifts.length} משמרות · {shiftTypes.length} סוגים
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#111' }}>
            סידור משמרות — מד&quot;א
          </div>
          <div style={{ fontSize: '11px', color: '#555', marginTop: '3px' }}>
            {fmtDateFull(dateFrom)} – {fmtDateFull(dateTo)}
          </div>
        </div>
      </div>

      {shifts.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#bbb', fontSize: '13px' }}>
          אין משמרות בטווח זה
        </div>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: 'max-content' }}>
          <thead>
            <tr>
              <th style={TH_ROW}>סוג משמרת</th>
              {allDates.map(date => (
                <th key={date} style={TH_DATE}>
                  <div>{dayLabel(date)}</div>
                  <div style={{ fontWeight: 'normal', fontSize: '10px', marginTop: '1px' }}>
                    {fmtDateShort(date)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shiftTypes.map((type, rowIdx) => (
              <tr key={type.title}>
                {/* Row header — no veteran badge here */}
                <td style={{
                  padding: '8px 12px',
                  background: '#fff5f5',
                  border: '1px solid #e5e7eb',
                  textAlign: 'right',
                  verticalAlign: 'middle',
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#1a1a1a', whiteSpace: 'nowrap' }}>
                    {type.title}
                  </div>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '2px', whiteSpace: 'nowrap' }}>
                    {type.time}
                    {type.location && ` · ${type.location}`}
                  </div>
                </td>
                {/* Date cells */}
                {allDates.map(date => {
                  const cell = lookup[type.title]?.[date]
                  const hasShift = cell !== undefined
                  const vols = cell?.volunteers || []
                  const isVeteran = cell?.veteranOnly || false
                  const items = [
                    ...(isVeteran ? [{ name: 'בוגר', isTag: true }] : []),
                    ...vols.map(v => ({ name: v.name, isTag: false })),
                  ]
                  return (
                    <td key={date} style={{
                      padding: '7px 8px',
                      border: '1px solid #e5e7eb',
                      textAlign: 'center',
                      fontSize: '10px',
                      color: '#1a1a1a',
                      background: rowIdx % 2 === 0 ? '#f8fafc' : '#fff',
                      verticalAlign: 'top',
                      minWidth: '90px',
                      maxWidth: '160px',
                      lineHeight: '1.6',
                      wordBreak: 'break-word',
                    }}>
                      {!hasShift ? (
                        <span style={{ color: '#e5e7eb' }}>—</span>
                      ) : items.length === 0 ? (
                        <span style={{ color: '#ccc', fontStyle: 'italic', fontSize: '9px' }}>ריק</span>
                      ) : (
                        items.map((item, i) => (
                          <span key={i}>
                            <span style={item.isTag ? { color: '#7c3aed', fontWeight: 'bold' } : {}}>
                              {item.name}
                            </span>
                            {i < items.length - 1 && <span style={{ color: '#ccc' }}> · </span>}
                          </span>
                        ))
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
})

ShiftsScheduleExport.displayName = 'ShiftsScheduleExport'
export default ShiftsScheduleExport
