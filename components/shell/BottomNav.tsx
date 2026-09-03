"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveHref, type NavItem } from "@/lib/navigation";

/**
 * Fixed bottom tab bar — Farmer only, below the `lg` breakpoint (the
 * KisanSetu reference's mobile pattern; matches "bottom-navigation style
 * ... may be used as inspiration where appropriate"). Desktop Farmer still
 * gets the persistent Sidebar, same as Operator/Admin — see AppShell.
 *
 * No UX4G "bottom navigation" component exists (checked the installed
 * package's README and compiled CSS — no `bottom-nav`/`tab-bar` classes of
 * any kind; Design.md §12's parity table has no such component either).
 * This composes one from verified primitives only: layout utilities
 * (`ux4g-fixed`, `ux4g-bottom-0`, `ux4g-inset-x-0`, `ux4g-jc-around`,
 * `ux4g-bt-1`), the typography scale, and `.ux4g-icon-outlined` with icon
 * ligature names confirmed to exist as real glyphs in the installed
 * package's own embedded "UX4G Material Icons Outlined" font (extracted
 * and inspected with fontTools — not assumed from naming convention).
 * Nothing here is an invented class or component.
 */
export default function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const activeHref = getActiveHref(items, pathname);

  return (
    <nav
      aria-label="Primary (mobile)"
      className="lg:hidden ux4g-fixed ux4g-bottom-0 ux4g-inset-x-0 ux4g-bt-1 ux4g-bg-neutral-elevated ux4g-z-40 bottom-nav"
    >
      <ul className="ux4g-d-flex ux4g-jc-around ux4g-p-none">
        {items.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <li key={item.href} className="ux4g-p-none">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className="ux4g-d-flex ux4g-flex-col ux4g-ai-center ux4g-gap-3xs ux4g-p-xs"
              >
                <i
                  className={`ux4g-icon-outlined${isActive ? " ux4g-text-primary" : ""}`}
                  aria-hidden="true"
                >
                  {item.icon}
                </i>
                <span
                  className={
                    isActive
                      ? "ux4g-label-s-strong ux4g-text-primary"
                      : "ux4g-label-s-default"
                  }
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
