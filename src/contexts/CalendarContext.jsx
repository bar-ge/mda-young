import { createContext, useContext, useState } from 'react'

const CalendarContext = createContext(null)

export function CalendarProvider({ children }) {
  const today = new Date()
  const [year,       setYear]       = useState(today.getFullYear())
  const [month,      setMonth]      = useState(today.getMonth())
  const [refreshKey, setRefreshKey] = useState(0)

  function invalidate() { setRefreshKey(k => k + 1) }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  return (
    <CalendarContext.Provider value={{ year, month, setYear, setMonth, prevMonth, nextMonth, refreshKey, invalidate }}>
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() { return useContext(CalendarContext) }
