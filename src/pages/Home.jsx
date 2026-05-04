import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function formatTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'עכשיו'
  if (diff < 3600000) return `לפני ${Math.floor(diff / 60000)} דק׳`
  if (diff < 86400000) return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })
}

function formatDate(ts) {
  const d = new Date(ts)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = today - msgDay
  if (diff === 0) return 'היום'
  if (diff === 86400000) return 'אתמול'
  return d.toLocaleDateString('he-IL', { weekday: 'long', month: 'long', day: 'numeric' })
}

function Avatar({ name, size = 9 }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  const colors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-pink-500']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center shrink-0 shadow-sm`}>
      <span className="text-white font-semibold text-xs">{initials}</span>
    </div>
  )
}

export default function Home() {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [profiles, setProfiles] = useState({})
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    loadMessages()

    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new])
        fetchProfile(payload.new.sender_id)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) {
      setMessages(data)
      const ids = [...new Set(data.map(m => m.sender_id).filter(Boolean))]
      if (ids.length) {
        const { data: pdata } = await supabase.from('profiles').select('id, full_name, role').in('id', ids)
        if (pdata) {
          const map = {}
          pdata.forEach(p => { map[p.id] = p })
          setProfiles(map)
        }
      }
    }
  }

  async function fetchProfile(id) {
    if (!id || profiles[id]) return
    const { data } = await supabase.from('profiles').select('id, full_name, role').eq('id', id).single()
    if (data) setProfiles(prev => ({ ...prev, [data.id]: data }))
  }

  async function send(e) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    const content = text.trim()
    setText('')
    await supabase.from('messages').insert({ sender_id: user.id, content, channel: 'general' })
    setSending(false)
  }

  const grouped = messages.reduce((acc, msg) => {
    const date = formatDate(msg.created_at)
    if (!acc[date]) acc[date] = []
    acc[date].push(msg)
    return acc
  }, {})

  return (
    // dir="ltr" on chat container so own=right, other=left stays consistent in RTL page
    <div className="flex flex-col" style={{ height: 'calc(100svh - 8rem)' }} dir="ltr">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide -mx-4 px-4 py-3 flex flex-col gap-1">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12" dir="rtl">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm text-center">אין הודעות עדיין.<br />התחל את השיחה!</p>
          </div>
        )}

        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] font-medium text-gray-400 px-2" dir="rtl">{date}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {msgs.map((msg, i) => {
              const isOwn = msg.sender_id === user.id
              const sender = profiles[msg.sender_id]
              const prevMsg = msgs[i - 1]
              const isSameUser = prevMsg?.sender_id === msg.sender_id
              return (
                <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''} ${isSameUser ? 'mt-0.5' : 'mt-3'}`}>
                  {!isOwn && !isSameUser && <Avatar name={sender?.full_name} />}
                  {!isOwn && isSameUser && <div className="w-9" />}
                  <div className={`max-w-[78%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    {!isOwn && !isSameUser && (
                      <span className="text-[11px] font-semibold text-gray-500 ml-1" dir="rtl">
                        {sender?.full_name || 'מתנדב'}
                        {sender?.role === 'admin' && <span className="mr-1 text-[10px] bg-[#E30613]/10 text-[#E30613] px-1.5 py-0.5 rounded-full font-medium">מנהל</span>}
                      </span>
                    )}
                    <div
                      dir="rtl"
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isOwn
                          ? 'bg-[#E30613] text-white rounded-tr-sm shadow-sm shadow-red-500/20'
                          : 'bg-white text-gray-900 rounded-tl-sm shadow-sm shadow-black/5 border border-gray-100'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {(!msgs[i + 1] || msgs[i + 1]?.sender_id !== msg.sender_id) && (
                      <span className="text-[10px] text-gray-400 mx-1">{formatTime(msg.created_at)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-gray-100" dir="rtl">
        <form onSubmit={send} className="flex gap-2 items-end">
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="w-11 h-11 bg-[#E30613] rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30 disabled:opacity-40 active:scale-95 transition-all shrink-0"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
          <div className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 flex items-center shadow-sm">
            <input
              dir="rtl"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="...כתוב הודעה"
              className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent text-right"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
            />
          </div>
        </form>
      </div>
    </div>
  )
}
