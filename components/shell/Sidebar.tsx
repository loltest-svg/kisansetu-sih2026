import NavList from "@/components/shell/NavList";
import type { NavItem } from "@/lib/navigation";

/**
 * Persistent desktop sidebar, used by every role's shell at `lg` and up —
 * the layout adapts by breakpoint (desktop: sidebar; mobile: BottomNav for
 * Farmer, NavDrawer for Operator/Admin), not by scaling one layout down.
 *
 * Tailwind (`hidden lg:block`) is the only thing deciding when this shows —
 * matches UX4G's own Tablet/Desktop cutoff of 1024px (Design.md §8), so the
 * breakpoint isn't an arbitrary Tailwind number.
 */
export default function Sidebar({ items }: { items: NavItem[] }) {
  return (
    <aside className="hidden lg:block ux4g-p-l ux4g-bg-neutral-elevated">
      <nav aria-label="Primary">
        <NavList items={items} />
      </nav>
    </aside>
  );
}
