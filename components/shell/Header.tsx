import Link from "next/link";
import { DRAWER_ID } from "@/components/shell/NavDrawer";

/**
 * Application header. Structure follows the reference screenshot's header
 * (platform identity, page context, notifications, identity area) using
 * only verified UX4G classes (README §Navbar) — literal visual details
 * (purple bar, exact spacing) are not copied from the screenshot, per the
 * project's "screenshot informs hierarchy, UX4G supplies the styling"
 * rule (docs/UX4G.md).
 *
 * No fake auth: the identity area shows the role name only ("Operator
 * view"), never a fabricated person/avatar — there is no login yet
 * (Phase 2A explicitly excludes auth). No fake data: the notifications
 * indicator is a dot, not a fabricated unread count.
 */
export default function Header({
  homeHref,
  roleLabel,
  showMenuButton,
}: {
  homeHref: string;
  roleLabel: string;
  /** false for `mobileNav="bottom"` (Farmer) — BottomNav already covers
   * every destination on mobile, so there's nothing for this button to
   * open there. */
  showMenuButton: boolean;
}) {
  return (
    <header>
      <nav className="ux4g-navbar" aria-label="Application">
        <div className="ux4g-navbar-wrap ux4g-p-m">
          <Link href={homeHref} className="ux4g-label-xl-default">
            <span className="ux4g-heading-2xs-strong">
              Smart MSP Procurement Coordination Platform
            </span>
          </Link>

          <div className="ux4g-navbar-right ux4g-d-flex ux4g-flex-row ux4g-gap-m">
            {showMenuButton ? (
              <button
                type="button"
                data-drawer={DRAWER_ID}
                className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm lg:hidden"
                aria-haspopup="dialog"
              >
                Menu
              </button>
            ) : null}

            <button
              type="button"
              className="ux4g-btn ux4g-btn-text-primary ux4g-btn-sm"
              aria-label="Notifications (not yet implemented in this prototype)"
            >
              Notifications
              <span
                className="ux4g-badge-dot-primary"
                aria-hidden="true"
              ></span>
            </button>

            <span className="ux4g-tag-tonal-neutral ux4g-tag-s">
              {roleLabel} view
            </span>
          </div>
        </div>
      </nav>
    </header>
  );
}
