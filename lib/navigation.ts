/**
 * Role navigation structures — UI/routing data only.
 *
 * No authentication or authorization exists yet (Phase 2A). These arrays
 * are what a role's shell links to; nothing here grants access. See
 * docs/SECURITY.md — Supabase RLS is the real access boundary, whenever
 * it's added, not this file.
 *
 * Role hierarchy note (per project decision): the `admin` tree below is
 * the future **Master Admin** / system-wide interface. A future **Centre
 * Admin** role is expected to reuse the *operator* tree's operational
 * pages (Live Queue, Farmer Processing, Bookings, Capacity & Slots, Centre
 * Status) with a wider permission set, not a separate nav structure — so
 * `operatorNav` is written as role-agnostic "centre operations" items
 * rather than anything operator-specific, deliberately. Multiple operators
 * (or a Centre Admin) may work the same centre concurrently; nothing here
 * or elsewhere assumes a user is tied to one physical PC.
 */

export type NavItem = {
  label: string;
  href: string;
};

export const farmerNav: NavItem[] = [
  { label: "Dashboard", href: "/farmer" },
  { label: "New Booking", href: "/farmer/new-booking" },
  { label: "My Bookings", href: "/farmer/bookings" },
  { label: "Live Queue", href: "/farmer/queue" },
  { label: "Centre Status", href: "/farmer/status" },
];

/** Centre-operations navigation — shared shape for Operator today and a
 * future Centre Admin, per the role-hierarchy decision above. */
export const operatorNav: NavItem[] = [
  { label: "Dashboard", href: "/operator" },
  { label: "Live Queue", href: "/operator/queue" },
  { label: "Farmer Processing", href: "/operator/processing" },
  { label: "Bookings", href: "/operator/bookings" },
  { label: "Capacity & Slots", href: "/operator/capacity" },
  { label: "Centre Status", href: "/operator/status" },
];

/** System-wide (Master Admin) navigation — visibility only, per
 * docs/PROJECT.md's "admin stays minimal" decision. */
export const adminNav: NavItem[] = [
  { label: "Overview", href: "/admin" },
  { label: "Centres", href: "/admin/centres" },
  { label: "Capacity & Congestion", href: "/admin/capacity" },
  { label: "System Activity", href: "/admin/activity" },
];
