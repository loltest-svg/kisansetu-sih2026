import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function FarmerProcessingPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Farmer Processing"
        description="Current token's stage: Check-in → Quality Check → Weighment → Procurement → Payment Status."
      />
      <ComingSoon note="Quality Check here will be the centre's official stage, distinct from any farmer-facing pre-arrival readiness indicator (docs/BUSINESS_LOGIC.md)." />
    </PageContainer>
  );
}
