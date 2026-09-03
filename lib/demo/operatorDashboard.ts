/**
 * ============================================================
 * PRESENTATION-ONLY DEMO DATA — NOT BACKEND DATA
 * ============================================================
 *
 * Everything exported from this file is hand-written UI fixture data for
 * the Phase 2B Operator Dashboard. There is no Supabase, no database, no
 * API route, no Realtime subscription behind any of it (see
 * docs/PROJECT_STATE.md — Phase 2B is UI only). Nothing here should ever
 * be read as "live" — it exists so the dashboard has something concrete to
 * render while the real data layer doesn't exist yet.
 *
 * When the real backend lands, a page/component should be able to swap
 * `initial*`/`demo*` values here for a Supabase query result of the same
 * shape without a redesign — that's why these are typed and shaped like
 * docs/DATABASE.md's proposed entities (`queue_entries`, `bookings`,
 * `centre_status`, `procurement_records`), not like arbitrary UI props.
 */

export type CentreStatusValue = "OPEN" | "DELAYED" | "PAUSED" | "FULL" | "CLOSED";

export type QueueItemStatus = "PROCESSING" | "WAITING" | "COMPLETED";

export type QueueItem = {
  id: string;
  token: string;
  farmerName: string;
  /** Masked per docs/SECURITY.md — full number is never shown in the
   * operator queue view even though the (future) backing record has it. */
  maskedPhone: string;
  status: QueueItemStatus;
  /** Minutes, or null when not meaningful (currently processing/done). */
  etaMinutes: number | null;
  /** Only meaningful once PROCESSING — matches procurement_records'
   * expected_quantity field shape in docs/DATABASE.md. */
  crop?: string;
  quantityQuintal?: number;
};

export type ProcessingStageKey =
  | "REGISTRATION"
  | "SLOT_BOOKING"
  | "CHECK_IN"
  | "QUALITY_CHECK"
  | "WEIGHMENT"
  | "PROCUREMENT"
  | "PAYMENT";

export type ProcessingStage = { key: ProcessingStageKey; label: string };

export type BookingItem = {
  id: string;
  token: string;
  farmerName: string;
  slotTimeLabel: string;
  crop: string;
  quantityQuintal: number;
};

export type AlertSeverity = "info" | "warning" | "error";

export type AlertItem = {
  id: string;
  severity: AlertSeverity;
  message: string;
  timeLabel: string;
};

export const demoCentre = {
  name: "XYZ Procurement Centre",
  location: "Jaipur, Rajasthan",
};

export const initialCentreStatus: CentreStatusValue = "OPEN";

export const demoMetrics = {
  farmersWaiting: 5,
  todaysCapacityQuintal: 100,
  bookedQuintal: 76,
  processingRatePerHour: 8,
  estimatedDelayMinutes: 10,
};

/** `remaining` is derived, not stored — same rule docs/DATABASE.md sets
 * for the real schema (avoid duplicating what's computable). */
export const demoCapacity = {
  get remainingQuintal() {
    return demoMetrics.todaysCapacityQuintal - demoMetrics.bookedQuintal;
  },
  get utilizationPercent() {
    return Math.round(
      (demoMetrics.bookedQuintal / demoMetrics.todaysCapacityQuintal) * 100
    );
  },
};

export const processingStages: ProcessingStage[] = [
  { key: "REGISTRATION", label: "Registration" },
  { key: "SLOT_BOOKING", label: "Slot Booking" },
  { key: "CHECK_IN", label: "Check-in" },
  { key: "QUALITY_CHECK", label: "Quality Check" },
  { key: "WEIGHMENT", label: "Weighment" },
  { key: "PROCUREMENT", label: "Procurement" },
  { key: "PAYMENT", label: "Payment" },
];

/** Index into `processingStages` for the item currently PROCESSING in
 * `initialQueue`. Demo value only — chosen to look plausible, not
 * computed from anything. */
export const initialProcessingStageIndex = 3; // "Quality Check"

export const initialQueue: QueueItem[] = [
  {
    id: "q1",
    token: "WHT-142",
    farmerName: "Ramesh Kumar",
    maskedPhone: "98XXXXXX21",
    status: "PROCESSING",
    etaMinutes: null,
    crop: "Wheat",
    quantityQuintal: 25,
  },
  {
    id: "q2",
    token: "WHT-143",
    farmerName: "Suresh Yadav",
    maskedPhone: "98XXXXXX47",
    status: "WAITING",
    etaMinutes: 18,
  },
  {
    id: "q3",
    token: "WHT-144",
    farmerName: "Mohan Singh",
    maskedPhone: "98XXXXXX63",
    status: "WAITING",
    etaMinutes: 25,
  },
  {
    id: "q4",
    token: "WHT-145",
    farmerName: "Dinesh Meena",
    maskedPhone: "98XXXXXX11",
    status: "WAITING",
    etaMinutes: 33,
  },
];

export const demoUpcomingBookings: BookingItem[] = [
  {
    id: "b1",
    token: "WHT-146",
    farmerName: "Mahendra Patel",
    slotTimeLabel: "12:00 PM",
    crop: "Wheat",
    quantityQuintal: 22,
  },
  {
    id: "b2",
    token: "WHT-147",
    farmerName: "Ganga Devi",
    slotTimeLabel: "12:30 PM",
    crop: "Wheat",
    quantityQuintal: 18,
  },
  {
    id: "b3",
    token: "WHT-148",
    farmerName: "Rajendra Prasad",
    slotTimeLabel: "01:00 PM",
    crop: "Mustard",
    quantityQuintal: 15,
  },
];

export const demoAlerts: AlertItem[] = [
  {
    id: "a1",
    severity: "warning",
    message:
      "Processing rate reduced to 6 farmers/hr due to machine maintenance.",
    timeLabel: "10:15 AM",
  },
  {
    id: "a2",
    severity: "info",
    message: "Today's capacity increased from 90 to 100 quintal.",
    timeLabel: "09:40 AM",
  },
];

export const demoDailySummary = {
  avgWaitMinutes: 28,
  peakQueueCount: 32,
  peakQueueTimeLabel: "11:30 AM",
  centreUptimeLabel: "7h 45m",
};
