import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

let _id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message, { type = 'success', duration = 3500, action } = {}) => {
    const id = ++_id
    setToasts(prev => [...prev.slice(-4), { id, message, type, action }])
    if (duration > 0) {
      timers.current[id] = setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}

      {/* Toast stack — sits above bottom nav on mobile, bottom-right on desktop */}
      <div
        aria-live="polite"
        className="fixed bottom-24 inset-x-0 z-50 flex flex-col-reverse gap-2 px-4 pointer-events-none
                   lg:bottom-6 lg:left-auto lg:right-6 lg:inset-x-auto lg:w-80"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className={`animate-slide-up pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium text-white ${
              t.type === 'error'   ? 'bg-red-500 shadow-red-500/25' :
              t.type === 'warning' ? 'bg-amber-500 shadow-amber-500/25' :
              t.type === 'info'    ? 'bg-sky-500 shadow-sky-500/25' :
                                     'bg-gray-900 shadow-gray-900/20'
            }`}
          >
            <span className="flex-1 leading-snug">{message}</span>
            {t.action && (
              <button
                onClick={() => { t.action.fn(); dismiss(t.id) }}
                className="shrink-0 text-white font-bold text-xs border border-white/30 px-2.5 py-1 rounded-lg hover:bg-white/15 transition-colors"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="סגור"
              className="shrink-0 text-white/50 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
