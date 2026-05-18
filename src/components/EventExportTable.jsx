import { forwardRef } from 'react'

export const RESOURCE_COLS = [
  { key: 'motorcycle_count',  label: 'אופנוע'     },
  { key: 'asn_count',         label: 'אס"ן'        },
  { key: 'white_amb_count',   label: 'לבן'         },
  { key: 'amb_4x4_count',     label: "אמב' 4X4"   },
  { key: 'als_tent_count',    label: 'ALS באהל'   },
  { key: 'er_team_count',     label: 'ע"ר'         },
  { key: 'hq_rep_count',      label: 'חפ"ק'        },
  { key: 'commander_count',   label: 'מפקד'        },
  { key: 'emt_count',         label: 'חובש'        },
  { key: 'ops_manager_count', label: 'ס. מנהל'    },
  { key: 'atv_count',         label: 'טרקטורון'   },
  { key: 'paramedic_count',   label: 'פרמדיק'     },
  { key: 'taran',             label: 'תאר"ן'       },
]

function fmt(ts) {
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
function fmtH(ts) {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

const TH = {
  padding: '5px 8px', border: '1px solid #2d5480',
  textAlign: 'center', fontWeight: 'bold', fontSize: '10px',
  whiteSpace: 'nowrap', color: '#fff',
}
const TD  = { padding: '5px 7px', border: '1px solid #dde3ea', textAlign: 'center', fontSize: '10px', color: '#222' }
const TDR = { ...TD, textAlign: 'right' }

const EventExportTable = forwardRef(({ events, title }, ref) => (
  <div
    ref={ref}
    dir="rtl"
    style={{ fontFamily: 'Arial, sans-serif', background: '#fff', padding: '24px', width: 'max-content', minWidth: '960px' }}
  >
    <div style={{ textAlign: 'center', marginBottom: '14px' }}>
      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#111', marginBottom: '2px' }}>
        טבלת אבטוחים — מד"א
      </div>
      <div style={{ fontSize: '13px', color: '#444' }}>{title}</div>
    </div>

    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr style={{ background: '#1e3a5f' }}>
          {['תאריך','משעה','עד שעה','מיקום','אופי האירוע','צפי קהל',
            ...RESOURCE_COLS.map(c => c.label),
            'סה״כ מתנדבים',
          ].map(h => <th key={h} style={TH}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {events.length === 0 ? (
          <tr>
            <td colSpan={19} style={{ ...TD, padding: '16px', color: '#999' }}>
              אין אירועים בטווח זה
            </td>
          </tr>
        ) : events.map((ev, i) => (
          <tr key={ev.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
            <td style={TD}>{fmt(ev.start_time)}</td>
            <td style={TD}>{fmtH(ev.start_time)}</td>
            <td style={TD}>{fmtH(ev.end_time)}</td>
            <td style={TDR}>{ev.location    || '—'}</td>
            <td style={TDR}>{ev.event_nature || '—'}</td>
            <td style={TD}>{ev.expected_crowd || ''}</td>
            {RESOURCE_COLS.map(c => (
              <td key={c.key} style={TD}>{ev[c.key] || ''}</td>
            ))}
            <td style={{ ...TD, fontWeight: 'bold', color: '#E30613' }}>
              {(ev.motorcycle_count || 0) * 1 + (ev.white_amb_count || 0) * 2 + (ev.er_team_count || 0) * 3 || ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <div style={{ fontSize: '9px', color: '#bbb', textAlign: 'left', marginTop: '8px' }}>
      הופק: {new Date().toLocaleDateString('he-IL')}
    </div>
  </div>
))

EventExportTable.displayName = 'EventExportTable'
export default EventExportTable
