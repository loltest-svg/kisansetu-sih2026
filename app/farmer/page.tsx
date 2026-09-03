import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function FarmerDashboardPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Farmer Dashboard"
        description="Entry point for booking status and quick actions (docs/UI_SPEC.md §B)."
      />
      <ComingSoon />
    </PageContainer>
  );
}
