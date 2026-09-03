/**
 * ============================================================
 * PRESENTATION-ONLY DEMO DATA — NOT BACKEND DATA
 * ============================================================
 *
 * Everything exported from this file is hand-written UI fixture data for
 * the Phase 2C Farmer experience. There is no Supabase, no database, no
 * API route, no Realtime subscription, no real booking, no real payment
 * and no real SMS behind any of it (see docs/PROJECT_STATE.md — Phase 2C
 * is UI only). Nothing here should ever be read as "live."
 *
 * Shapes mirror docs/DATABASE.md's proposed entities (`bookings`,
 * `queue_entries`, `centre_status`, `procurement_records`,
 * `payment_status`, `notifications`) so a real Supabase query result can
 * later replace these values without a component redesign — same
 * approach as lib/demo/operatorDashboard.ts (Phase 2B).
 */

export type CentreStatusValue = "OPEN" | "DELAYED" | "PAUSED" | "FULL" | "CLOSED";

export type BookingStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED";

export type ProcurementStageKey =
  | "REGISTRATION"
  | "SLOT_BOOKING"
  | "CHECK_IN"
  | "QUALITY_CHECK"
  | "WEIGHMENT"
  | "PROCUREMENT"
  | "PAYMENT";

export type ProcurementStage = { key: ProcurementStageKey; label: string };

export type PaymentStatusValue = "PENDING" | "PROCESSED";

export type NotificationItem = {
  id: string;
  message: string;
  timeLabel: string;
};

export type BookingHistoryItem = {
  id: string;
  token: string;
  centreName: string;
  dateLabel: string;
  timeLabel: string;
  status: BookingStatus;
  crop: string;
  quantityQuintal: number;
};

/** The procurement journey, shown to the farmer as context — same 7-step
 * shape as the Operator dashboard's WorkflowStepper input
 * (components/shared/WorkflowStepper.tsx), kept as a small local copy
 * rather than a cross-role import (docs/BUSINESS_LOGIC.md is the single
 * source of truth for what the stages *mean*; this is just the same list
 * repeated for the farmer-side demo data). */
export const procurementStages: ProcurementStage[] = [
  { key: "REGISTRATION", label: "Registration" },
  { key: "SLOT_BOOKING", label: "Slot Booking" },
  { key: "CHECK_IN", label: "Check-in" },
  { key: "QUALITY_CHECK", label: "Quality Check" },
  { key: "WEIGHMENT", label: "Weighment" },
  { key: "PROCUREMENT", label: "Procurement" },
  { key: "PAYMENT", label: "Payment" },
];

export const demoFarmer = {
  firstName: "Ramesh",
};

/** The farmer's next (only, for this demo) upcoming appointment. */
export const demoNextStep = {
  centreName: "XYZ Procurement Centre",
  centreLocation: "Jaipur, Rajasthan",
  dateLabel: "12 Sept 2025",
  timeLabel: "11:30 AM",
  token: "WHT-142",
  status: "CONFIRMED" as BookingStatus,
  farmersAhead: 18,
  estimatedWaitMinutes: 45,
};

export const demoCentreStatus = {
  status: "OPEN" as CentreStatusValue,
  queueCount: 18,
  processingRatePerHour: 8,
  estimatedDelayMinutes: 10,
};

/** For /farmer/queue — deliberately separate from demoNextStep even
 * though it describes the same booking, because a live queue view needs
 * a couple of fields (position, a "last updated" label) the dashboard
 * summary doesn't. */
export const demoQueueStatus = {
  token: "WHT-142",
  position: 19,
  farmersAhead: 18,
  estimatedWaitMinutes: 45,
  processingRatePerHour: 8,
  currentlyProcessingToken: "WHT-124",
};

/** Nominal stage index into `procurementStages` for the farmer's active
 * booking. Demo value only, chosen to look plausible. */
export const demoCurrentStageIndex = 1; // "Slot Booking" done, awaiting Check-in

export const demoPaymentStatus: PaymentStatusValue = "PENDING";

export const demoNotifications: NotificationItem[] = [
  {
    id: "n1",
    message: "Your turn is approaching — 18 farmers ahead.",
    timeLabel: "2 min ago",
  },
  {
    id: "n2",
    message: "Centre delay updated — new ETA 12:10 PM.",
    timeLabel: "10 min ago",
  },
];

export const demoBookingHistory: BookingHistoryItem[] = [
  {
    id: "bh1",
    token: "WHT-142",
    centreName: "XYZ Procurement Centre",
    dateLabel: "12 Sept 2025",
    timeLabel: "11:30 AM",
    status: "CONFIRMED",
    crop: "Wheat",
    quantityQuintal: 25,
  },
  {
    id: "bh2",
    token: "WHT-098",
    centreName: "XYZ Procurement Centre",
    dateLabel: "28 Aug 2025",
    timeLabel: "10:00 AM",
    status: "COMPLETED",
    crop: "Mustard",
    quantityQuintal: 12,
  },
  {
    id: "bh3",
    token: "WHT-071",
    centreName: "ABC Procurement Centre",
    dateLabel: "14 Aug 2025",
    timeLabel: "09:00 AM",
    status: "CANCELLED",
    crop: "Wheat",
    quantityQuintal: 18,
  },
];

export const demoCentreDetails = {
  name: "XYZ Procurement Centre",
  location: "Jaipur, Rajasthan",
  status: "OPEN" as CentreStatusValue,
  todaysCapacityQuintal: 100,
  bookedQuintal: 76,
  processingRatePerHour: 8,
  estimatedDelayMinutes: 10,
  availableSlotsLabel: "24 slots available today",
  guidanceNote:
    "Bring your Aadhaar card and land records. Arrive within 15 minutes of your slot time.",
};

/** Static option lists for the New Booking form — presentation only, not
 * fetched from anywhere. A real implementation would source these (and
 * the recommendation itself) from the Smart Allocation Engine
 * (docs/BUSINESS_LOGIC.md), which is explicitly not built in this phase. */
export const demoCentreOptions = [
  "XYZ Procurement Centre — Jaipur",
  "ABC Procurement Centre — Kota",
  "PQR Procurement Centre — Ajmer",
];

export const demoCropOptions = ["Wheat", "Mustard", "Gram", "Barley", "Other"];

export const demoSlotOptions = [
  "09:00 AM – 10:00 AM",
  "10:00 AM – 11:00 AM",
  "11:00 AM – 12:00 PM",
  "12:00 PM – 01:00 PM",
  "02:00 PM – 03:00 PM",
];
