

## Restructure: merge Calendar into Goals tab, add daily recurrence, free-form project cards, drag tasks, hover popups

### 1. Navigation — merge into one tab
- Remove standalone "Calendar" item from `Layout.tsx` nav.
- Rename "Goals & Projects" → **"Goals & Projects"** (same), but the page now hosts: Calendar (top) + Projects (below). Goals card (monthly/weekly/daily mini-goals) stays in the sidebar.
- Keep `/calendar` route as a redirect to `/goals` for safety.

### 2. Goals page — new layout
```text
┌────────────────────────────────────────────────────────────┐
│ Header: month nav + "New event" + "New project"            │
├──────────────────┬─────────────────────────────────────────┤
│  Sidebar         │  PERSONAL CALENDAR (week grid)          │
│  - Mini month    │  (the current Calendar.tsx week view)   │
│  - Categories    │                                         │
│  - Goals card    ├─────────────────────────────────────────┤
│    (Active /     │  PROJECTS (masonry / free-height cards) │
│     Completed)   │                                         │
└──────────────────┴─────────────────────────────────────────┘
```
- The old in-Goals month calendar (with task pills) is **removed** — Calendar replaces it.
- Goals sidebar card keeps Daily / Weekly / Monthly tabs (already there).

### 3. Personal Calendar — add **Daily** recurrence
- `eventQueries.ts`: extend `EventRecurrence` to `'none' | 'daily' | 'weekly' | 'monthly'`.
- Generation loop: for `daily`, `d.setDate(d.getDate() + i)`.
- Dialog recurrence select gets a **Daily** option.
- No DB change needed (column is `text`).

### 4. Hover popup on calendar events
- Wrap each event block (timed + all-day) in `HoverCard` showing: title, category, time range, full description, recurrence badge.
- Keep click → edit dialog behavior.

### 5. Projects — free-height cards + drag tasks
- Replace fixed-grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` with **CSS columns masonry** (`columns-1 md:columns-2 xl:columns-3` + `break-inside-avoid`) so each card sizes to its task list.
- Project card shows **all** tasks (no truncation), with a small "Hide done" toggle per card.
- Add **drag & drop** for tasks within and between projects using `@dnd-kit/core` + `@dnd-kit/sortable` (already present in project for habits).
  - New column on `project_tasks`: `display_order INTEGER DEFAULT 0`.
  - On drop: reorder locally + persist new `display_order` (and new `project_id` if moved across projects).
- Repurpose Projects intent in copy: "Long-running plans you advance step by step (gardening, hobbies, study tracks)".

### 6. Database migration
```sql
ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
```
(Recurrence stays text — daily just adds a new allowed value.)

### Files touched
- `src/components/Layout.tsx` — remove Calendar nav item.
- `src/App.tsx` — redirect `/calendar` → `/goals`.
- `src/pages/Goals.tsx` — embed week calendar above projects, swap project grid for masonry, add DnD, remove old month-calendar block.
- `src/pages/Calendar.tsx` — extract `WeekCalendar` component (or import the page body) for reuse inside Goals; keep file but export the week view component.
- `src/lib/eventQueries.ts` — add `'daily'` recurrence.
- `src/lib/projectQueries.ts` — add `reorderTasks(updates: {id, project_id, display_order}[])`, include `display_order` in fetch ordering.
- New migration for `project_tasks.display_order`.

### Notes / trade-offs
- Masonry via CSS `columns` keeps it simple (no extra lib) and lets cards be any height; downside is tab-order reads top-to-bottom per column.
- Daily recurrence with high counts (e.g. 365) inserts many rows — capped at 366 in the dialog input.
- Hover popups use existing `HoverCard` (Radix) — no new dependency.

