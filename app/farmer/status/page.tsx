import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function FarmerCentreStatusPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Centre Status"
        description="Operator-reported centre status (OPEN, DELAYED, PAUSED, FULL, CLOSED) and processing rate."
      />
      <ComingSoon />
    </PageContainer>
  );
}
