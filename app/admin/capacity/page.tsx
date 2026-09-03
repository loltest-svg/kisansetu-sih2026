import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import CentreCongestionCard from "@/components/admin/CentreCongestionCard";
import { demoCentres, utilizationPercent } from "@/lib/demo/adminDashboard";

/**
 * Capacity & Congestion — answers "where is procurement capacity
 * becoming a bottleneck?" Centres sorted by utilisation (most congested
 * first) so the Master Admin sees problems immediately, without needing
 * to scan every card.
 */
export default function AdminCapacityPage() {
  const sorted = [...demoCentres].sort(
    (a, b) => utilizationPercent(b) - utilizationPercent(a)
  );

  return (
    <PageContainer>
      <div className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-ai-center ux4g-jc-between ux4g-gap-s">
        <PageHeader
          title="Capacity & Congestion"
          description="Centres sorted by today's utilisation — most congested first."
        />
        <span
          className="ux4g-tag-outline-warning ux4g-tag-s"
          title="This screen has no backend yet — every value here is local, presentation-only demo data."
        >
          Demo data — not connected to a backend
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 ux4g-gap-l">
        {sorted.map((centre) => (
          <CentreCongestionCard key={centre.id} centre={centre} />
        ))}
      </div>
    </PageContainer>
  );
}
