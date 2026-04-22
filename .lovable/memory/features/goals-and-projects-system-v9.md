---
name: Goals and Projects system v9
description: Consolidated tab hosting Personal Calendar (week grid), Goals (daily/weekly/monthly), and Projects (masonry cards with drag-and-drop tasks).
type: feature
---
The `/goals` route is the single home for personal planning. It contains three collapsible sections:

1. **Personal Calendar** (top) — `<WeekCalendar />` from `src/components/WeekCalendar.tsx`. Weekly hourly grid (6 AM – 11 PM) with all-day strip, category filter sidebar, hover popups (Radix `HoverCard`) showing title/category/time/recurrence/description. Events support `none | daily | weekly | monthly` recurrence; daily caps at 366 occurrences.
2. **Goals** — Daily / Weekly / Monthly tabs with Active / Completed sub-tabs. Sidebar-style card. The legacy in-Goals month calendar with task pills was removed in this version.
3. **Projects** — CSS columns masonry (`columns-1 md:columns-2 xl:columns-3` + `break-inside-avoid`), free-height cards, full task lists. Tasks are draggable within and between projects via `@dnd-kit` (PointerSensor distance 6). `project_tasks.display_order` persists ordering. Task descriptions show in a hover popup. Each card has a "Hide done / Show done" toggle. Project intent: long-running plans you advance step by step.

The standalone `/calendar` route is a redirect to `/goals`. The `Calendar` nav link was removed from `Layout.tsx`. `src/pages/Calendar.tsx` was deleted.
