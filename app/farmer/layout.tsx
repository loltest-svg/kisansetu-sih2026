import AppShell from "@/components/shell/AppShell";
import { farmerNav } from "@/lib/navigation";

export default function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      role="farmer"
      roleLabel="Farmer"
      navItems={farmerNav}
      mobileNav="bottom"
    >
      {children}
    </AppShell>
  );
}
