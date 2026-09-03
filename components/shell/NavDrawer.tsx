import NavList from "@/components/shell/NavList";
import type { NavItem } from "@/lib/navigation";

const DRAWER_ID = "app-nav-drawer";

/**
 * Mobile navigation, opened from Header's menu button. Used by every role
 * shell (Farmer uses it at every width; Operator/Admin only below the
 * `lg` breakpoint, once Sidebar takes over).
 *
 * Markup follows the verified Drawer pattern (README §Drawer:
 * `ux4g-drawer-overlay` > `ux4g-drawer ux4g-drawer-left`, opened via
 * `data-drawer`, closed via `data-drawer-close`) — driven entirely by the
 * UX4G runtime already verified in Phase 1, no React state here.
 *
 * `role="dialog"`/`aria-modal`/`aria-label` are added on top of the README
 * example (which omits them) — the same kind of accessibility gap-filling
 * done for Input labels in Phase 1, using standard ARIA only, no invented
 * classes. Known limitation, not fixed here: the vendor runtime's
 * open/close logic (dist/runtime/design-system.mjs) does not trap focus or
 * return focus to the trigger button on close — acceptable for this
 * prototype, flagged in docs/PROJECT_STATE.md rather than silently patched
 * (patching it would mean overriding component internals, which the UX4G
 * contract disallows).
 */
export { DRAWER_ID };

export default function NavDrawer({
  items,
  title,
}: {
  items: NavItem[];
  title: string;
}) {
  return (
    <div className="ux4g-drawer-overlay">
      <div
        id={DRAWER_ID}
        className="ux4g-drawer ux4g-drawer-left"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="ux4g-drawer-header ux4g-p-l">
          <h2 className="ux4g-heading-xs-strong">{title}</h2>
          <button type="button" data-drawer-close aria-label="Close menu">
            &times;
          </button>
        </div>
        <div className="ux4g-drawer-body">
          <nav aria-label="Primary navigation (mobile)">
            <NavList items={items} />
          </nav>
        </div>
      </div>
    </div>
  );
}
