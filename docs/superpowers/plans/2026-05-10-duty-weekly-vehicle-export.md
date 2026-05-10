# Duty Weekly Vehicle Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a week picker and an export feature on `/duty` (“כוננים”) that exports a week-by-day vehicle grid as **CSV**, **Excel (.xlsx)**, or **PDF**.

**Architecture:** Fetch `duty_vehicles` (active) and `duty_shifts` (selected week), compute a 7-day matrix (`TAKEN`/`OPEN`/`N/A`), and export via format-specific generators (CSV string, Excel workbook, PDF table). Keep the core computation pure and unit-tested.

**Tech Stack:** React (Vite), Supabase JS client, Vitest, `exceljs`, `jspdf` + `jspdf-autotable`.

---

## File map (create/modify)

**Modify**
- `src/pages/Duty.jsx`: add week UI + export controls; week-scoped query; wire export

**Create**
- `src/utils/week.js`: week start/end helpers (Sunday-based)
- `src/utils/dutyWeeklyExport.js`: pure matrix computation + exporters (CSV)
- `src/utils/dutyWeeklyExport.excel.js`: Excel exporter (ExcelJS)
- `src/utils/dutyWeeklyExport.pdf.js`: PDF exporter (jsPDF + AutoTable)
- `src/__tests__/utils/dutyWeeklyExport.test.js`: unit tests for matrix computation

**Modify**
- `package.json`: add export dependencies
- `package-lock.json`: updated lockfile

---

## Task 1: Add week utilities (Sunday-based)

**Files:**
- Create: `src/utils/week.js`
- Test: `src/__tests__/utils/dutyWeeklyExport.test.js` (initial scaffold)

- [ ] **Step 1: Write failing tests for week helpers**

Create `src/__tests__/utils/dutyWeeklyExport.test.js` with:

```js
import { describe, it, expect } from 'vitest'
import { weekStartSunday, addDays, formatDM } from '../../utils/week'

describe('week utils', () => {
  it('weekStartSunday snaps to Sunday', () => {
    // 2026-05-13 is Wednesday; week start should be 2026-05-10 (Sunday)
    expect(weekStartSunday('2026-05-13')).toBe('2026-05-10')
  })

  it('addDays returns ISO date', () => {
    expect(addDays('2026-05-10', 6)).toBe('2026-05-16')
  })

  it('formatDM returns dd/mm', () => {
    expect(formatDM('2026-05-10')).toBe('10/05')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run:
`npm test -- --run src/__tests__/utils/dutyWeeklyExport.test.js`

Expected: FAIL because `src/utils/week.js` doesn’t exist.

- [ ] **Step 3: Implement `src/utils/week.js`**

```js
export function toIsoDate(d) {
  const dt = typeof d === 'string' ? new Date(d + 'T12:00:00') : new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function weekStartSunday(dateStr) {
  const dt = new Date(dateStr + 'T12:00:00')
  const dow = dt.getDay() // 0=Sun..6=Sat
  dt.setDate(dt.getDate() - dow)
  return toIsoDate(dt)
}

export function addDays(dateStr, days) {
  const dt = new Date(dateStr + 'T12:00:00')
  dt.setDate(dt.getDate() + days)
  return toIsoDate(dt)
}

export function formatDM(dateStr) {
  const dt = new Date(dateStr + 'T12:00:00')
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
`npm test -- --run src/__tests__/utils/dutyWeeklyExport.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/week.js src/__tests__/utils/dutyWeeklyExport.test.js
git commit -m "feat(duty): add Sunday-based week helpers"
```

---

## Task 2: Matrix computation (pure + tested)

**Files:**
- Create: `src/utils/dutyWeeklyExport.js`
- Modify: `src/__tests__/utils/dutyWeeklyExport.test.js`

- [ ] **Step 1: Add failing tests for matrix computation**

Append to `src/__tests__/utils/dutyWeeklyExport.test.js`:

```js
import { buildWeeklyVehicleGrid } from '../../utils/dutyWeeklyExport'

describe('buildWeeklyVehicleGrid', () => {
  it('computes TAKEN/OPEN/N/A per vehicle/day', () => {
    const vehicles = [
      { id: 'v1', name: 'A', available_days: [0,1,2,3,4,5,6] },
      { id: 'v2', name: 'B', available_days: [1] }, // Monday only
    ]
    const weekStart = '2026-05-10' // Sunday
    const shifts = [
      { vehicle_id: 'v1', start_time: '2026-05-12T07:00:00', status: 'assigned', driver_name: 'Dana' }, // Tue TAKEN
      { vehicle_id: 'v2', start_time: '2026-05-11T07:00:00', status: 'open', driver_name: null },     // Mon OPEN (available)
    ]

    const grid = buildWeeklyVehicleGrid({ vehicles, shifts, weekStart })

    // v1 Tue should be TAKEN
    expect(grid.rows.find(r => r.vehicleId === 'v1').cells[2].status).toBe('TAKEN')
    // v2 Sun should be N/A
    expect(grid.rows.find(r => r.vehicleId === 'v2').cells[0].status).toBe('N/A')
    // v2 Mon should be OPEN
    expect(grid.rows.find(r => r.vehicleId === 'v2').cells[1].status).toBe('OPEN')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`npm test -- --run src/__tests__/utils/dutyWeeklyExport.test.js`

Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/utils/dutyWeeklyExport.js`**

```js
import { addDays } from './week'

export function buildWeeklyVehicleGrid({ vehicles, shifts, weekStart }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // index shifts by vehicleId+date, with TAKEN precedence if any has driver_name
  const shiftIndex = new Map()
  for (const s of shifts || []) {
    if (!s?.vehicle_id || !s?.start_time) continue
    const date = String(s.start_time).slice(0, 10)
    const key = `${s.vehicle_id}:${date}`
    const hasDriver = !!(s.driver_name && String(s.driver_name).trim())
    const prev = shiftIndex.get(key)
    if (!prev) shiftIndex.set(key, { hasDriver })
    else shiftIndex.set(key, { hasDriver: prev.hasDriver || hasDriver })
  }

  const rows = (vehicles || [])
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'he'))
    .map(v => {
      const cells = days.map(dateStr => {
        const dow = new Date(dateStr + 'T12:00:00').getDay()
        const available = (v.available_days || []).includes(dow)
        if (!available) return { date: dateStr, status: 'N/A' }

        const key = `${v.id}:${dateStr}`
        const idx = shiftIndex.get(key)
        if (idx?.hasDriver) return { date: dateStr, status: 'TAKEN' }
        return { date: dateStr, status: 'OPEN' }
      })
      return { vehicleId: v.id, vehicleName: v.name, cells }
    })

  return { weekStart, days, rows }
}

export function gridToCsv(grid) {
  const headers = ['רכב', ...grid.days]
  const esc = (x) => {
    const s = String(x ?? '')
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  const lines = []
  lines.push(headers.map(esc).join(','))
  for (const r of grid.rows) {
    const row = [r.vehicleName, ...r.cells.map(c => c.status)]
    lines.push(row.map(esc).join(','))
  }
  return lines.join('\n')
}
```

- [ ] **Step 4: Run tests**

Run:
`npm test -- --run src/__tests__/utils/dutyWeeklyExport.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/dutyWeeklyExport.js src/__tests__/utils/dutyWeeklyExport.test.js
git commit -m "feat(duty): compute weekly vehicle grid for export"
```

---

## Task 3: Add Excel/PDF export dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add dependencies**

Run:
`npm install exceljs jspdf jspdf-autotable`

- [ ] **Step 2: Verify build still passes**

Run:
`npm run build`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add excel and pdf export deps"
```

---

## Task 4: Implement Excel exporter

**Files:**
- Create: `src/utils/dutyWeeklyExport.excel.js`
- Test: (manual only)

- [ ] **Step 1: Implement exporter**

```js
import ExcelJS from 'exceljs'
import { formatDM } from './week'

export async function exportGridXlsx({ grid, filenameBase }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Duty')

  const headers = ['רכב', ...grid.days.map(d => formatDM(d))]
  ws.addRow(headers)

  const fills = {
    'TAKEN': { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }, // light green
    'OPEN':  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } }, // light amber
    'N/A':   { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }, // light gray
  }

  for (const r of grid.rows) {
    const row = ws.addRow([r.vehicleName, ...r.cells.map(c => c.status)])
    row.eachCell((cell, col) => {
      if (col === 1) {
        cell.font = { bold: true }
      } else {
        cell.fill = fills[cell.value] || undefined
      }
      cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'right' : 'center' }
    })
  }

  ws.getRow(1).font = { bold: true }
  ws.columns.forEach((c, i) => { c.width = i === 0 ? 20 : 12 })

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${filenameBase}.xlsx`
  a.click()
  URL.revokeObjectURL(a.href)
}
```

- [ ] **Step 2: Manual verification**
  - Run `npm run dev`
  - On `/duty`, trigger Excel export
  - Open file and confirm headers + colors

- [ ] **Step 3: Commit**

```bash
git add src/utils/dutyWeeklyExport.excel.js
git commit -m "feat(duty): export weekly vehicle grid to xlsx"
```

---

## Task 5: Implement PDF exporter

**Files:**
- Create: `src/utils/dutyWeeklyExport.pdf.js`

- [ ] **Step 1: Implement exporter**

```js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDM } from './week'

export function exportGridPdf({ grid, filenameBase, title }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

  doc.setFontSize(14)
  doc.text(title, doc.internal.pageSize.getWidth() - 40, 40, { align: 'right' })

  const head = [['רכב', ...grid.days.map(d => formatDM(d))]]
  const body = grid.rows.map(r => [r.vehicleName, ...r.cells.map(c => c.status)])

  autoTable(doc, {
    head,
    body,
    startY: 60,
    styles: { halign: 'center', fontSize: 9 },
    headStyles: { fillColor: [227, 6, 19], textColor: 255 },
    columnStyles: { 0: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.section !== 'body') return
      const v = data.cell.raw
      if (v === 'TAKEN') data.cell.styles.fillColor = [220, 252, 231]
      if (v === 'OPEN')  data.cell.styles.fillColor = [255, 247, 237]
      if (v === 'N/A')   data.cell.styles.fillColor = [243, 244, 246]
    },
  })

  doc.save(`${filenameBase}.pdf`)
}
```

- [ ] **Step 2: Manual verification**
  - Export PDF
  - Confirm it is landscape and readable when printed

- [ ] **Step 3: Commit**

```bash
git add src/utils/dutyWeeklyExport.pdf.js
git commit -m "feat(duty): export weekly vehicle grid to pdf"
```

---

## Task 6: Wire UI in `/duty` (week picker + format selector + export button)

**Files:**
- Modify: `src/pages/Duty.jsx`

- [ ] **Step 1: Add UI state + week computation**
  - `selectedWeekStart` (ISO date)
  - `exportFormat` (`csv|xlsx|pdf`)
  - `exporting` boolean

- [ ] **Step 2: Add Supabase query for week shifts**
  - Query `duty_shifts` for weekStart..weekEnd (end inclusive), `status != cancelled`
  - Fields: `vehicle_id, start_time, status, driver_name`

- [ ] **Step 3: Build grid and export**
  - Build grid from fetched `vehicles` and week shifts
  - Filename base: `duty-vehicles-week-${weekStart}`
  - For CSV:
    - build CSV string
    - download as Blob `text/csv;charset=utf-8`
  - For XLSX/PDF:
    - call exporters

- [ ] **Step 4: Run local checks**
  - `npm run lint`
  - `npm test -- --run`
  - `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/pages/Duty.jsx
git commit -m "feat(duty): add week export (csv/xlsx/pdf) on /duty"
```

---

## Plan self-review checklist
- Spec coverage:
  - Week picker + Sunday-based week: Task 1 + Task 6
  - 3 export formats: Tasks 2/4/5
  - Status rules: Task 2 tests + implementation
- No placeholders: all steps include exact files/commands/code.

