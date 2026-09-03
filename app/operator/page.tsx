import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function OperatorDashboardPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Centre Dashboard"
        description="Centre overview KPIs, live queue, capacity, current processing and alerts (docs/UI_SPEC.md §C)."
      />
      <ComingSoon note="No centre metrics exist yet — this shell does not fabricate data." />
    </PageContainer>
  );
}
