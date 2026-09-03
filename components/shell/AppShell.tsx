import Header from "@/components/shell/Header";
import Sidebar from "@/components/shell/Sidebar";
import NavDrawer from "@/components/shell/NavDrawer";
import type { NavItem } from "@/lib/navigation";

/**
 * Reusable application shell — Header + (desktop Sidebar | mobile
 * NavDrawer) + main content slot. One shell, three role layouts
 * (app/farmer, app/operator, app/admin) each pass their own nav items,
 * role label and variant; nothing here is role-specific beyond that.
 *
 * variant "sidebar": persistent desktop Sidebar, NavDrawer below `lg`.
 * variant "simple": NavDrawer at every width, no persistent Sidebar —
 * Farmer only, per the "significantly simpler than Operator" decision.
 *
 * Tailwind here is structural only (`lg:flex`, `flex-1`) — see
 * docs/UX4G.md "Tailwind boundary".
 */
export default function AppShell({
  role,
  roleLabel,
  navItems,
  variant,
  children,
}: {
  role: "farmer" | "operator" | "admin";
  roleLabel: string;
  navItems: NavItem[];
  variant: "sidebar" | "simple";
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

      <Header homeHref={homeHref} roleLabel={roleLabel} />

      <div className="lg:flex flex-1">
        {variant === "sidebar" ? <Sidebar items={navItems} /> : null}
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>

      <NavDrawer items={navItems} title={`${roleLabel} menu`} />
    </div>
  );
}
