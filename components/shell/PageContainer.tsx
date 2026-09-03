/**
 * Responsive content container for page bodies. `ux4g-container`/
 * `-lg` are UX4G's own documented layout utilities (README "CSS Bundle" —
 * Layout module) — used instead of a Tailwind max-width wrapper since an
 * equivalent already exists in the design system.
 */
export default function PageContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ux4g-container ux4g-container-lg ux4g-p-xl">
      {children}
    </div>
  );
}
