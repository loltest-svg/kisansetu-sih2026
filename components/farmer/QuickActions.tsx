import Link from "next/link";

const ACTIONS = [
  { label: "Book Slot", href: "/farmer/bookings/new", icon: "event" },
  { label: "My Centre", href: "/farmer/centre", icon: "info" },
  { label: "My Queue", href: "/farmer/queue", icon: "queue" },
  { label: "My Bookings", href: "/farmer/bookings", icon: "receipt_long" },
] as const;

/**
 * Four shortcut tiles, matching the reference image's quick-action grid.
 * Built from Card (`ux4g-card-outline`) + the same verified Material icon
 * glyphs already used in `lib/navigation.ts`'s BottomNav (Phase 2A) — no
 * new icon names introduced.
 */
export default function QuickActions() {
  return (
    <div>
      <h2 className="ux4g-heading-s-strong">Quick actions</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 ux4g-gap-m">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="ux4g-card ux4g-card-outline ux4g-card-vertical ux4g-d-flex ux4g-flex-col ux4g-ai-center ux4g-gap-2xs"
          >
            <i className="ux4g-icon-outlined" aria-hidden="true">
              {action.icon}
            </i>
            <span className="ux4g-label-l-default">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
