import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Branches() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', location: '' })
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('branches').select('*').order('created_at')
    if (data) setBranches(data)
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('branches').insert({ name: form.name.trim(), location: form.location.trim() || null })
    setForm({ name: '', location: '' })
    setShowForm(false)
    await load()
    setSaving(false)
  }

  async function toggleActive(branch) {
    setToggling(branch.id)
    await supabase.from('branches').update({ active: !branch.active }).eq('id', branch.id)
    await load()
    setToggling(null)
  }

  async function deleteBranch(id) {
    if (!confirm('למחוק את הסניף?')) return
    await supabase.from('branches').delete().eq('id', id)
    await load()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{branches.length} סניפים</span>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E30613] text-white text-xs font-semibold rounded-xl shadow-sm shadow-red-500/20 active:scale-95 transition-all"
        >
          <span className="text-base leading-none">+</span>
          סניף חדש
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
          <h3 className="font-semibold text-gray-900 text-sm text-right">הוספת סניף</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">שם הסניף *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder='למשל: תחנה מרכזית'
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-right">מיקום</label>
            <input
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder='כתובת או עיר'
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#E30613] text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {saving ? '...שומר' : 'הוספה'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl">
              ביטול
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <span className="text-4xl">🏥</span>
          <p className="text-gray-400 text-sm">אין סניפים עדיין</p>
        </div>
      ) : (
        branches.map(b => (
          <div key={b.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center justify-between gap-3 ${b.active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => deleteBranch(b.id)}
                className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center text-sm hover:bg-red-100 transition-colors"
              >×</button>
              <button
                onClick={() => toggleActive(b)}
                disabled={toggling === b.id}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                  b.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {b.active ? 'פעיל' : 'לא פעיל'}
              </button>
            </div>
            <div className="flex-1 text-right">
              <p className="font-semibold text-gray-900 text-sm">{b.name}</p>
              {b.location && <p className="text-xs text-gray-400 mt-0.5">{b.location}</p>}
            </div>
            <span className="text-2xl">🏥</span>
          </div>
        ))
      )}
    </div>
  )
}
