# Demo Story (SIH final demo)

`PLANNED` — this is the target narrative to build toward, not a description
of a working system yet. Status labels per step: `FUNCTIONAL` (must actually
work live), `SIMULATED` (shown but backed by mock/status-only data), or
`OPTIONAL` (nice-to-have, cut first if time-constrained).

| # | Step | Status |
|---|---|---|
| 1 | Farmer logs in | FUNCTIONAL |
| 2 | Farmer enters crop + quantity | FUNCTIONAL |
| 3 | System evaluates eligible centres | FUNCTIONAL |
| 4 | System recommends a centre/slot and explains why | FUNCTIONAL |
| 5 | Farmer books the recommended (or an alternative) slot | FUNCTIONAL |
| 6 | Operator sees the new booking on their dashboard | FUNCTIONAL |
| 7 | Farmer checks in | FUNCTIONAL |
| 8 | Queue updates (position, ETA) | FUNCTIONAL |
| 9 | Operator calls next farmer | FUNCTIONAL |
| 10 | Farmer's queue/ETA view updates live | FUNCTIONAL (Realtime) |
| 11 | Operator reports a centre delay | FUNCTIONAL |
| 12 | Farmer sees changed centre status/ETA reflecting the delay | FUNCTIONAL (Realtime) |
| 13 | Procurement progresses through stages (check-in → quality check → weighment → procurement) | FUNCTIONAL (state transitions), quality-check *content* itself is operator-entered, not automated |
| 14 | Payment status is shown | SIMULATED — status-only, explicitly not a real transaction, and demo narration should say so |
| 15 | Farmer receives a notification at a key step (e.g. booking confirmed, called next) | SIMULATED — mock SMS adapter, shown as a logged/displayed notification, not an actual SMS |
| 16 | Admin views centre/system overview | FUNCTIONAL (read-only) |

## Framing notes for the demo

- Step 14 and step 15 must be narrated as simulated/prototype-only during the
  demo — never presented as if a real payment or SMS occurred. This mirrors
  `docs/PROJECT.md`'s SIMULATED features list; the demo script must not
  contradict the documentation.
- Steps 8, 10, 12 depend on Supabase Realtime actually working end-to-end —
  flagged as a technical risk in Phase 0 reconnaissance; rehearse this path
  early, not on demo day.
- No step in this story requires ML, blockchain, or any excluded technology
  (`docs/PROJECT.md` §Explicitly excluded) — if a future addition to this
  script would require one, that's a signal the script has drifted out of
  MVP scope.
