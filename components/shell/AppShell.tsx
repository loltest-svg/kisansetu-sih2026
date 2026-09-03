import Header from "@/components/shell/Header";
import Sidebar from "@/components/shell/Sidebar";
import NavDrawer from "@/components/shell/NavDrawer";
import BottomNav from "@/components/shell/BottomNav";
import type { NavItem } from "@/lib/navigation";

/**
 * Reusable application shell — Header + persistent desktop Sidebar (every
 * role, `lg:block`) + a role-appropriate mobile nav + main content slot.
 * One shell, three role layouts (app/farmer, app/operator, app/admin) each
 * pass their own nav items, role label and `mobileNav`.
 *
 * The layout intentionally differs by breakpoint rather than just scaling
 * down: at `lg` and up every role gets the same persistent Sidebar; below
 * it, Farmer gets a fixed BottomNav (the KisanSetu reference's mobile
 * pattern — a consumer-app-shaped 5-item tab bar suits Farmer's short,
 * flat nav) while Operator/Admin keep the Header-triggered NavDrawer (more
 * appropriate for a longer "operational software" nav list, and the
 * pattern already verified working in Phase 2A). NavDrawer is still
 * mounted for `mobileNav="bottom"` too — Escape/overlay-click affordances
 * cost nothing extra — but nothing opens it in that mode, since Header
 * hides its trigger button.
 *
 * Tailwind here is structural only (`lg:flex`, `flex-1`, bottom padding to
 * clear the fixed BottomNav on mobile) — see docs/UX4G.md "Tailwind
 * boundary".
 */
export default function AppShell({
  role,
  roleLabel,
  navItems,
  mobileNav,
  children,
}: {
  role: "farmer" | "operator" | "admin";
  roleLabel: string;
  navItems: NavItem[];
  mobileNav: "bottom" | "drawer";
  children: React.ReactNode;
}) {
  const homeHref = `/${role}`;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Bypass block — UX4G ships .ux4g-sr-only (always hidden) but no
          focus-visible companion for the classic skip-link pattern; the
          matching CSS lives in app/globals.css under .skip-link:focus,
          using only UX4G tokens for its visual values. */}
      <a href="#main-content" className="ux4g-sr-only skip-link">
        Skip to main content
      </a>

      <Header
        homeHref={homeHref}
        roleLabel={roleLabel}
        showMenuButton={mobileNav === "drawer"}
      />

      <div className="lg:flex flex-1">
        <Sidebar items={navItems} />
        <main
          id="main-content"
          className={`flex-1${mobileNav === "bottom" ? " pb-20 lg:pb-0" : ""}`}
        >
          {children}
        </main>
      </div>

      {mobileNav === "bottom" ? (
        <BottomNav items={navItems} />
      ) : (
        <NavDrawer items={navItems} title={`${roleLabel} menu`} />
      )}
    </div>
  );
}
