"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/navigation";

/**
 * Renders one role's nav items as a UX4G List. Used twice per role shell
 * (persistent desktop Sidebar + mobile NavDrawer) so it owns the one
 * "which item is current" computation instead of duplicating it.
 *
 * Client Component: needs the current path (usePathname) to mark the
 * active item. This is the only piece of the shell that needs to be
 * client-side — Header, Sidebar, NavDrawer, PageContainer and PageHeader
 * all stay Server Components and simply render this in a slot.
 *
 * UX4G note: there is no dedicated vertical/sidebar-nav component in
 * Design.md §12's parity table. List (`ux4g-list` / `ux4g-list-item` /
 * `ux4g-list-item-row`) is the closest verified building block — its
 * `.ux4g-list-item-row.active` state (confirmed in the compiled CSS,
 * bound to `--ux4g-bg-primary` / `--ux4g-text-brand-primary-default`) is
 * applied here on real `<Link>` elements rather than the README's `<div>`/
 * `<span>` example, for correct link semantics. This is a documented gap
 * filled with an existing component, not an invented one.
 */
export default function NavList({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // "Best match wins": without this, a root item like href="/operator"
  // would prefix-match every one of its own sub-routes (`/operator/queue`
  // starts with "/operator/") and show as active alongside the actual
  // current item. Picking the longest matching href resolves that
  // generically instead of special-casing the root path.
  const activeHref = items
    .filter(
      (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <ul className="ux4g-list ux4g-list-default ux4g-list-m">
      {items.map((item) => {
        const isActive = item.href === activeHref;
        return (
          <li key={item.href} className="ux4g-list-item">
            <Link
              href={item.href}
              className={`ux4g-list-item-row${isActive ? " active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={
                  isActive
                    ? "ux4g-list-item-start ux4g-label-l-strong"
                    : "ux4g-list-item-start ux4g-label-l-default"
                }
              >
                {item.label}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
