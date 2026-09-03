import NavList from "@/components/shell/NavList";
import type { NavItem } from "@/lib/navigation";

/**
 * Persistent desktop sidebar. Operator/Admin shells only (`variant="sidebar"`
 * in AppShell) — Farmer stays on the NavDrawer at every width, per the
 * "significantly simpler than Operator" decision (docs/UI_SPEC.md §B).
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
