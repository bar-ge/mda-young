# Spec: Weekly vehicle availability export (Duty / "כוננים")

## Goal
Add an export feature to the volunteer **"כוננים"** page (`/duty`) that lets users export a **week-by-day grid** of vehicles showing whether each vehicle is **available / open / taken** for each day of a selected week. The user can select the week and export as **CSV**, **Excel (.xlsx)**, or **PDF (printable)**.

## Scope
- Add week selection UI to `src/pages/Duty.jsx`
- Add export controls (format selector + export button)
- Implement 3 export formats:
  - CSV matrix
  - Excel `.xlsx` matrix with colors
  - PDF printable landscape table

Non-goals:
- Changing scheduling/assignment flows
- Adding new Supabase tables or schema
- Adding role restrictions (feature is available to volunteers; manager-only actions remain unchanged)

## UX / UI
Location: top area of `/duty` page (near the legend).

Controls:
- **Week selector**
  - Date input labeled **"בחר שבוע"**
  - Buttons: **"שבוע קודם"** and **"שבוע הבא"**
  - Caption: **"שבוע: DD/MM/YYYY–DD/MM/YYYY"**
  - Week definition: **Sunday → Saturday** (Israel convention)
  - Picking any date snaps to its week start (Sunday)
- **Export controls**
  - Format dropdown labeled **"פורמט ייצוא"**:
    - `CSV (אקסל)`
    - `Excel (.xlsx)`
    - `PDF (להדפסה)`
  - Primary button **"ייצא"** which downloads the file in selected format

## Data model & queries
Existing tables referenced by current implementation:
- `duty_vehicles`: active vehicles, includes `available_days` array (weekday numbers)
- `duty_shifts`: shift assignments, includes `vehicle_id`, `start_time`, `status`, `driver_name`

Data needed for export:
- All active vehicles:
  - `duty_vehicles` where `status = 'active'`, sorted by `name`
- All shifts for the selected week:
  - `duty_shifts` where:
    - `start_time` between weekStart (inclusive) and weekEnd (inclusive)
    - `status != 'cancelled'`
  - Selected fields: `vehicle_id`, `start_time`, `status`, `driver_name`

## Status rules (cell computation)
For each vehicle and each day in the selected week:
- Determine weekday \(0..6\) from date.
- If `weekday` is **not** in `vehicle.available_days` → **N/A**
- Else vehicle is considered available that day:
  - Find shift row where `vehicle_id` matches and `start_time` date equals the day (YYYY-MM-DD)
  - If `driver_name` is non-empty → **TAKEN**
  - Else → **OPEN**

Notes:
- "TAKEN" matches existing UI semantics (green dot = assigned driver).
- If multiple shifts exist for a vehicle+date (unexpected), treat as TAKEN if any has a driver.

## Export formats
All formats share the same matrix:
- Rows: vehicles (name)
- Columns: 7 days (Sun–Sat), header includes day label + date

### CSV
Filename: `duty-vehicles-week-YYYY-MM-DD.csv` (weekStart date)
Header example:
`רכב, א׳ 11/05, ב׳ 12/05, ...`
Cell values:
- `TAKEN`, `OPEN`, `N/A`
(Optional later: Hebrew labels; keep consistent across formats.)

### Excel (.xlsx)
Filename: `duty-vehicles-week-YYYY-MM-DD.xlsx`
Same matrix + formatting:
- Header row bold
- Cell fill colors:
  - TAKEN: green
  - OPEN: amber
  - N/A: gray
Landscape-like layout (column widths adjusted for readability).

### PDF (printable)
Filename: `duty-vehicles-week-YYYY-MM-DD.pdf`
Printable table:
- A4 Landscape
- Title includes week range in Hebrew
- Same color scheme as Excel for quick scanning

## Error handling
- If export query fails: toast error `"שגיאה בייצוא"`
- While exporting: disable export button and show loading state
- If no vehicles: export produces a file with only headers (or a single row noting no data)

## Testing plan (lightweight)
- Unit: pure function that computes cell status given:
  - available_days
  - shifts array for week
  - date
- Manual:
  - Select week across month boundary
  - Export each format and open the file
  - Confirm TAKEN/OPEN/N/A match UI dots for the same days

