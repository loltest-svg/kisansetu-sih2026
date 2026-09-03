/**
 * ============================================================
 * PRESENTATION-ONLY DEMO DATA — NOT BACKEND DATA
 * ============================================================
 *
 * Everything exported from this file is hand-written UI fixture data for
 * the Phase 2D Master Admin experience. There is no Supabase, no
 * database, no API route, no Realtime subscription, no real user/role
 * database behind any of it (see docs/PROJECT_STATE.md — Phase 2D is UI
 * only). Nothing here should ever be read as live centre status, real
 * congestion, real audit events, or real accounts.
 *
 * Shapes mirror docs/DATABASE.md's proposed entities
 * (`procurement_centres`, `centre_status`, `status_events`) plus the role
 * hierarchy from docs/PROJECT_STATE.md (Master Admin → Centre Admin →
 * Centre Operator → Farmer) so a real Supabase query result can later
 * replace these values without a component redesign — same approach as
 * lib/demo/operatorDashboard.ts (Phase 2B) and
 * lib/demo/farmerDashboard.ts (Phase 2C).
 */

export type CentreStatusValue = "OPEN" | "DELAYED" | "PAUSED" | "FULL" | "CLOSED";

/**
 * Derived, presentation-only classification — never a fifth backend
 * state, never automatically detected (docs/BUSINESS_LOGIC.md: no
 * physical-equipment monitoring in this MVP). `getAttentionState` below
 * computes this from a centre's operator-reported `status` plus its
 * capacity/queue numbers, purely so the Master Admin overview can sort
 * "needs a look" from "fine" — it is UI classification logic, not the
 * Smart Allocation Engine and not a real congestion calculation.
 */
export type AttentionState =
  | "NORMAL"
  | "NEAR_CAPACITY"
  | "CONGESTED"
  | "DELAYED"
  | "PAUSED"
  | "FULL"
  | "CLOSED";

export type CentreSummary = {
  id: string;
  name: string;
  location: string;
  status: CentreStatusValue;
  farmersWaiting: number;
  todaysCapacityQuintal: number;
  bookedQuintal: number;
  processingRatePerHour: number;
  estimatedDelayMinutes: number;
  /** Presentation label only — the real user/role database is a later
   * backend-phase concern (docs/PROJECT_STATE.md role-hierarchy note). */
  assignedCentreAdmin: string;
  operatorCount: number;
};

export type ActivityType =
  | "CENTRE_STATUS_CHANGED"
  | "CENTRE_ADMIN_CREATED"
  | "OPERATOR_ACCOUNT_CREATED"
  | "BOOKING_PROCESSED"
  | "QUEUE_STATE_CHANGED"
  | "DELAY_REPORTED"
  | "CENTRE_PAUSED"
  | "CENTRE_RESUMED";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  message: string;
  centreName: string;
  /** Role label + first name only — never a full personal record, per
   * docs/SECURITY.md's minimal-personal-data principle applied here too. */
  actor: string;
  timeLabel: string;
};

export const demoCentres: CentreSummary[] = [
  {
    id: "c1",
    name: "XYZ Procurement Centre",
    location: "Jaipur, Rajasthan",
    status: "OPEN",
    farmersWaiting: 18,
    todaysCapacityQuintal: 100,
    // Deliberately below the 75% "Near Capacity" threshold — one of the
    // six demo centres needs to read as healthy/NORMAL, or the
    // "Centres requiring attention" panel below would just show every
    // centre and stop being a useful filter.
    bookedQuintal: 55,
    processingRatePerHour: 8,
    estimatedDelayMinutes: 10,
    assignedCentreAdmin: "Priya Sharma (Centre Admin)",
    operatorCount: 3,
  },
  {
    id: "c2",
    name: "ABC Procurement Centre",
    location: "Kota, Rajasthan",
    status: "OPEN",
    farmersWaiting: 41,
    todaysCapacityQuintal: 120,
    bookedQuintal: 114,
    processingRatePerHour: 6,
    estimatedDelayMinutes: 35,
    assignedCentreAdmin: "Anil Verma (Centre Admin)",
    operatorCount: 2,
  },
  {
    id: "c3",
    name: "PQR Procurement Centre",
    location: "Ajmer, Rajasthan",
    status: "DELAYED",
    farmersWaiting: 27,
    todaysCapacityQuintal: 90,
    bookedQuintal: 60,
    processingRatePerHour: 4,
    estimatedDelayMinutes: 50,
    assignedCentreAdmin: "Sunita Rathore (Centre Admin)",
    operatorCount: 2,
  },
  {
    id: "c4",
    name: "LMN Procurement Centre",
    location: "Udaipur, Rajasthan",
    status: "PAUSED",
    farmersWaiting: 9,
    todaysCapacityQuintal: 80,
    bookedQuintal: 30,
    processingRatePerHour: 0,
    estimatedDelayMinutes: 0,
    assignedCentreAdmin: "Devendra Singh (Centre Admin)",
    operatorCount: 1,
  },
  {
    id: "c5",
    name: "DEF Procurement Centre",
    location: "Bikaner, Rajasthan",
    status: "FULL",
    farmersWaiting: 55,
    todaysCapacityQuintal: 70,
    bookedQuintal: 70,
    processingRatePerHour: 5,
    estimatedDelayMinutes: 60,
    assignedCentreAdmin: "Manisha Joshi (Centre Admin)",
    operatorCount: 3,
  },
  {
    id: "c6",
    name: "GHI Procurement Centre",
    location: "Jodhpur, Rajasthan",
    status: "CLOSED",
    farmersWaiting: 0,
    todaysCapacityQuintal: 60,
    bookedQuintal: 0,
    processingRatePerHour: 0,
    estimatedDelayMinutes: 0,
    assignedCentreAdmin: "Ramesh Choudhary (Centre Admin)",
    operatorCount: 0,
  },
];

export function utilizationPercent(centre: CentreSummary): number {
  if (centre.todaysCapacityQuintal === 0) return 0;
  return Math.round(
    (centre.bookedQuintal / centre.todaysCapacityQuintal) * 100
  );
}

/**
 * Presentation-only classification, not a live calculation — see the
 * `AttentionState` doc comment above. `status` always wins over capacity
 * heuristics (an operator-reported DELAYED/PAUSED/FULL/CLOSED centre is
 * never re-labelled "Congested" just because its utilisation is also
 * high); "Near Capacity"/"Congested" only apply to an otherwise-OPEN
 * centre.
 */
export function getAttentionState(centre: CentreSummary): AttentionState {
  if (centre.status !== "OPEN") return centre.status;
  const util = utilizationPercent(centre);
  if (util >= 90) return "CONGESTED";
  if (util >= 75) return "NEAR_CAPACITY";
  return "NORMAL";
}

export const ATTENTION_LABEL: Record<AttentionState, string> = {
  NORMAL: "Normal",
  NEAR_CAPACITY: "Near capacity",
  CONGESTED: "Congested",
  DELAYED: "Delayed",
  PAUSED: "Paused",
  FULL: "Full",
  CLOSED: "Closed",
};

export const ATTENTION_TAG_CLASS: Record<AttentionState, string> = {
  NORMAL: "ux4g-tag-filled-success",
  NEAR_CAPACITY: "ux4g-tag-tonal-neutral",
  CONGESTED: "ux4g-tag-outline-warning",
  DELAYED: "ux4g-tag-filled-warning",
  PAUSED: "ux4g-tag-tonal-neutral",
  FULL: "ux4g-tag-outline-error",
  CLOSED: "ux4g-tag-filled-error",
};

export const demoActivity: ActivityItem[] = [
  {
    id: "a1",
    type: "DELAY_REPORTED",
    message: "Delay reported — weighing machine under maintenance.",
    centreName: "PQR Procurement Centre",
    actor: "Sunita Rathore (Centre Admin)",
    timeLabel: "10:15 AM",
  },
  {
    id: "a2",
    type: "CENTRE_PAUSED",
    message: "Centre paused.",
    centreName: "LMN Procurement Centre",
    actor: "Devendra Singh (Centre Admin)",
    timeLabel: "09:52 AM",
  },
  {
    id: "a3",
    type: "CENTRE_STATUS_CHANGED",
    message: "Today's capacity increased from 90 to 100 Quintal.",
    centreName: "XYZ Procurement Centre",
    actor: "Priya Sharma (Centre Admin)",
    timeLabel: "09:40 AM",
  },
  {
    id: "a4",
    type: "OPERATOR_ACCOUNT_CREATED",
    message: "New operator account created.",
    centreName: "ABC Procurement Centre",
    actor: "Anil Verma (Centre Admin)",
    timeLabel: "09:10 AM",
  },
  {
    id: "a5",
    type: "BOOKING_PROCESSED",
    message: "Booking WHT-098 completed.",
    centreName: "XYZ Procurement Centre",
    actor: "Operator (XYZ Procurement Centre)",
    timeLabel: "08:55 AM",
  },
  {
    id: "a6",
    type: "QUEUE_STATE_CHANGED",
    message: "Queue reached 55 farmers waiting.",
    centreName: "DEF Procurement Centre",
    actor: "System (queue length threshold)",
    timeLabel: "08:30 AM",
  },
  {
    id: "a7",
    type: "CENTRE_ADMIN_CREATED",
    message: "Centre Admin account created.",
    centreName: "GHI Procurement Centre",
    actor: "Master Admin",
    timeLabel: "Yesterday, 05:10 PM",
  },
  {
    id: "a8",
    type: "CENTRE_RESUMED",
    message: "Centre resumed after maintenance.",
    centreName: "GHI Procurement Centre",
    actor: "Ramesh Choudhary (Centre Admin)",
    timeLabel: "Yesterday, 09:00 AM",
  },
];

/** System-wide aggregates — derived from `demoCentres`, not separately
 * hardcoded, so they can never silently drift out of sync with the
 * per-centre list (same "don't duplicate what's computable" rule
 * docs/DATABASE.md sets for the real schema). */
export const systemOverview = {
  get totalCentres() {
    return demoCentres.length;
  },
  get centresOpen() {
    return demoCentres.filter((c) => c.status === "OPEN").length;
  },
  get farmersWaitingTotal() {
    return demoCentres.reduce((sum, c) => sum + c.farmersWaiting, 0);
  },
  get totalCapacityQuintal() {
    return demoCentres.reduce((sum, c) => sum + c.todaysCapacityQuintal, 0);
  },
  get totalBookedQuintal() {
    return demoCentres.reduce((sum, c) => sum + c.bookedQuintal, 0);
  },
  get centresRequiringAttention() {
    return demoCentres.filter((c) => getAttentionState(c) !== "NORMAL").length;
  },
  get centreAdminCount() {
    return new Set(demoCentres.map((c) => c.assignedCentreAdmin)).size;
  },
  get operatorCount() {
    return demoCentres.reduce((sum, c) => sum + c.operatorCount, 0);
  },
};
