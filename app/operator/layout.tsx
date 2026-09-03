import AppShell from "@/components/shell/AppShell";
import { operatorNav } from "@/lib/navigation";

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      role="operator"
      roleLabel="Operator"
      navItems={operatorNav}
      mobileNav="drawer"
    >
      {children}
    </AppShell>
  );
}
