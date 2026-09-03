import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function AdminCapacityPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Capacity & Congestion"
        description="Cross-centre comparison of capacity utilisation and congestion."
      />
      <ComingSoon />
    </PageContainer>
  );
}
