import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'

const DAY_LABELS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳']
const DAY_FULL   = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת']

const INPUT  = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-right"
const SELECT = INPUT + " appearance-none"

function formatHour(ts) {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(ts) {
  const d = new Date(ts + (ts.includes('T') ? '' : 'T12:00:00'))
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function DayPicker({ value, onChange }) {
  function toggle(day) {
    onChange(value.includes(day) ? value.filter(d => d !== day) : [...value, day])
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-gray-400 text-right">ימי זמינות</span>
      <div className="flex gap-1.5 justify-end">
        {DAY_LABELS.map((label, i) => (
          <button key={i} type="button" onClick={() => toggle(i)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
              value.includes(i)
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DutyVehicles() {
  const { toast } = useToast()

  const [section, setSection] = useState('vehicles')
  const [vehicles,  setVehicles]  = useState([])
  const [shifts,    setShifts]    = useState([])
  const [drivers,   setDrivers]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)

  // Vehicle form
  const [vName,      setVName]      = useState('')
  const [vNotes,     setVNotes]     = useState('')
  const [vDays,      setVDays]      = useState([])
  const [editVehicle, setEditVehicle] = useState(null)

  // Shift form
  const [sVehicle, setSVehicle] = useState('')
  const [sDate,    setSDate]    = useState('')
  const [sStart,   setSStart]   = useState('07:00')
  const [sEnd,     setSEnd]     = useState('19:00')
  const [sNotes,   setSNotes]   = useState('')

  // Assign form
  const [aShift,  setAShift]  = useState('')
  const [aDriver, setADriver] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: veh }, { data: sh }, { data: drv }] = await Promise.all([
      supabase.from('duty_vehicles').select('*').eq('status', 'active').order('name'),
      supabase.from('duty_shifts')
        .select('*, duty_vehicles(name), driver:profiles!duty_shifts_driver_id_fkey(id,full_name)')
        .gte('start_time', new Date().toISOString().slice(0, 10))
        .neq('status', 'cancelled')
        .order('start_time'),
      supabase.from('profiles').select('id,full_name').order('full_name'),
    ])
    if (veh) setVehicles(veh)
    if (sh)  setShifts(sh)
    if (drv) setDrivers(drv)
    setLoading(false)
  }

  /* ── Vehicles ── */
  async function saveVehicle(e) {
    e.preventDefault()
    if (!vName.trim()) return
    setSaving(true)
    const payload = { name: vName.trim(), notes: vNotes.trim() || null, available_days: vDays }
    const { error } = editVehicle
      ? await supabase.from('duty_vehicles').update(payload).eq('id', editVehicle.id)
      : await supabase.from('duty_vehicles').insert(payload)
    setSaving(false)
    if (error) { toast('שגיאה בשמירה', { type: 'error' }); return }
    toast(editVehicle ? 'הרכב עודכן' : 'הרכב נוסף', { type: 'success' })
    resetVehicleForm()
    loadAll()
  }

  function resetVehicleForm() {
    setVName(''); setVNotes(''); setVDays([]); setEditVehicle(null)
  }

  async function deactivateVehicle(id, name) {
    const { error } = await supabase.from('duty_vehicles').update({ status: 'inactive' }).eq('id', id)
    if (!error) { toast(`"${name}" הוסר`, { type: 'success' }); loadAll() }
    else toast('שגיאה', { type: 'error' })
  }

  function startEdit(v) {
    setEditVehicle(v)
    setVName(v.name)
    setVNotes(v.notes || '')
    setVDays(v.available_days || [])
    setSection('vehicles')
  }

  /* ── Shifts ── */
  async function saveShift(e) {
    e.preventDefault()
    if (!sVehicle || !sDate) return
    setSaving(true)
    const { error } = await supabase.from('duty_shifts').insert({
      vehicle_id: sVehicle,
      start_time: `${sDate}T${sStart}:00`,
      end_time:   `${sDate}T${sEnd}:00`,
      notes:      sNotes.trim() || null,
    })
    setSaving(false)
    if (error) { toast('שגיאה בהוספת כוננות', { type: 'error' }); return }
    toast('כוננות נוספה', { type: 'success' })
    setSVehicle(''); setSDate(''); setSStart('07:00'); setSEnd('19:00'); setSNotes('')
    loadAll()
  }

  async function cancelShift(id) {
    const { error } = await supabase.from('duty_shifts').update({ status: 'cancelled' }).eq('id', id)
    if (!error) { toast('כוננות בוטלה'); loadAll() }
    else toast('שגיאה', { type: 'error' })
  }

  /* ── Assign driver ── */
  async function assignDriver(e) {
    e.preventDefault()
    if (!aShift || !aDriver) return
    setSaving(true)
    const { error } = await supabase.from('duty_shifts')
      .update({ driver_id: aDriver, status: 'assigned' }).eq('id', aShift)
    setSaving(false)
    if (error) { toast('שגיאה בשיבוץ', { type: 'error' }); return }
    toast('הנהג שובץ בהצלחה', { type: 'success' })
    setAShift(''); setADriver('')
    loadAll()
  }

  async function unassignDriver(shiftId) {
    const { error } = await supabase.from('duty_shifts')
      .update({ driver_id: null, status: 'open' }).eq('id', shiftId)
    if (!error) { toast('שיבוץ בוטל'); loadAll() }
    else toast('שגיאה', { type: 'error' })
  }

  const sectionTabs = [
    { id: 'vehicles', label: 'רכבים',     icon: '🚑' },
    { id: 'hours',    label: 'שעות',      icon: '🕐' },
    { id: 'assign',   label: 'שיבוץ נהג', icon: '👤' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {sectionTabs.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              section === t.id
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* ── VEHICLES ── */}
          {section === 'vehicles' && (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-bold text-gray-700 text-right mb-3">
                  {editVehicle ? 'עריכת רכב' : 'הוספת רכב חדש'}
                </p>
                <form onSubmit={saveVehicle} className="flex flex-col gap-3">
                  <input value={vName} onChange={e => setVName(e.target.value)}
                    placeholder="שם הרכב *" required className={INPUT} />
                  <input value={vNotes} onChange={e => setVNotes(e.target.value)}
                    placeholder="הערות" className={INPUT} />
                  <DayPicker value={vDays} onChange={setVDays} />
                  <div className="flex gap-2 pt-1">
                    {editVehicle && (
                      <button type="button" onClick={resetVehicleForm}
                        className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-all">
                        ביטול
                      </button>
                    )}
                    <button type="submit" disabled={saving}
                      className="flex-1 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm shadow-blue-500/25 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50">
                      {saving ? '...' : (editVehicle ? 'שמור שינויים' : '+ הוסף רכב')}
                    </button>
                  </div>
                </form>
              </div>

              <div className="flex flex-col gap-2">
                {vehicles.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">אין רכבים פעילים</p>
                )}
                {vehicles.map(v => (
                  <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex items-start gap-3">
                    <div className="flex gap-2 shrink-0 pt-0.5">
                      <button onClick={() => startEdit(v)} className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">עריכה</button>
                      <button onClick={() => deactivateVehicle(v.id, v.name)} className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors">הסר</button>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="font-bold text-gray-900 text-sm">{v.name}</p>
                      {v.notes && <p className="text-xs text-gray-400 mt-0.5">{v.notes}</p>}
                      {(v.available_days || []).length > 0 && (
                        <div className="flex gap-1 justify-end mt-1.5 flex-wrap">
                          {(v.available_days).sort().map(d => (
                            <span key={d} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600">
                              {DAY_FULL[d]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-lg shrink-0">🚑</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── HOURS ── */}
          {section === 'hours' && (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-bold text-gray-700 text-right mb-3">הוספת כוננות ספציפית</p>
                <form onSubmit={saveShift} className="flex flex-col gap-2.5">
                  <select value={sVehicle} onChange={e => setSVehicle(e.target.value)} required className={SELECT}>
                    <option value="">בחר רכב *</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <input type="date" value={sDate} onChange={e => setSDate(e.target.value)} required className={INPUT} />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400 font-semibold text-right">שעת סיום</label>
                      <input type="time" value={sEnd} onChange={e => setSEnd(e.target.value)} className={INPUT} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400 font-semibold text-right">שעת התחלה</label>
                      <input type="time" value={sStart} onChange={e => setSStart(e.target.value)} className={INPUT} />
                    </div>
                  </div>
                  <input value={sNotes} onChange={e => setSNotes(e.target.value)} placeholder="הערות" className={INPUT} />
                  <button type="submit" disabled={saving || !sVehicle || !sDate}
                    className="py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm shadow-blue-500/25 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50">
                    {saving ? '...' : '+ הוסף כוננות'}
                  </button>
                </form>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-gray-400 text-right">כוננויות קרובות</p>
                {shifts.length === 0 && <p className="text-gray-400 text-sm text-center py-4">אין כוננויות קרובות</p>}
                {shifts.map(s => (
                  <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-3">
                    <button onClick={() => cancelShift(s.id)} className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors shrink-0">ביטול</button>
                    <div className="flex-1 text-right">
                      <p className="font-bold text-gray-900 text-sm">{s.duty_vehicles?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.start_time)} · {formatHour(s.start_time)}–{formatHour(s.end_time)}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                      s.status === 'assigned' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {s.status === 'assigned' ? 'משובץ' : 'פתוח'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ASSIGN DRIVER ── */}
          {section === 'assign' && (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-bold text-gray-700 text-right mb-3">שיבוץ נהג לכוננות</p>
                <form onSubmit={assignDriver} className="flex flex-col gap-2.5">
                  <select value={aShift} onChange={e => setAShift(e.target.value)} required className={SELECT}>
                    <option value="">בחר כוננות *</option>
                    {shifts.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.duty_vehicles?.name} · {formatDate(s.start_time)} {formatHour(s.start_time)}
                      </option>
                    ))}
                  </select>
                  <select value={aDriver} onChange={e => setADriver(e.target.value)} required className={SELECT}>
                    <option value="">בחר נהג *</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                  <button type="submit" disabled={saving || !aShift || !aDriver}
                    className="py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm shadow-blue-500/25 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50">
                    {saving ? '...' : 'שבץ נהג'}
                  </button>
                </form>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-gray-400 text-right">שיבוצים קרובים</p>
                {shifts.length === 0 && <p className="text-gray-400 text-sm text-center py-4">אין כוננויות</p>}
                {shifts.map(s => (
                  <div key={s.id} className={`bg-white rounded-2xl border shadow-sm p-3.5 flex items-center gap-3 ${
                    s.driver ? 'border-emerald-100' : 'border-gray-100'
                  }`}>
                    {s.driver && (
                      <button onClick={() => unassignDriver(s.id)} className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors shrink-0">הסר</button>
                    )}
                    <div className="flex-1 text-right">
                      <p className="font-bold text-gray-900 text-sm">{s.duty_vehicles?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.start_time)} · {formatHour(s.start_time)}–{formatHour(s.end_time)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {s.driver ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-emerald-700">{s.driver.full_name}</span>
                          <span className="text-[10px] text-emerald-500">משובץ</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-full">ללא נהג</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
