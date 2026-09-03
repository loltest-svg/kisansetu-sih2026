import AppShell from "@/components/shell/AppShell";
import { adminNav } from "@/lib/navigation";

/**
 * This is the future **Master Admin** / system-wide interface (per the
 * project's role-hierarchy decision) — not a generic single "Admin" role.
 * A future Centre Admin is expected to reuse the Operator tree's
 * operational pages under a wider permission set, not this one.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      role="admin"
      roleLabel="Admin"
      navItems={adminNav}
      mobileNav="drawer"
    >
      {children}
    </AppShell>
  );
}
