import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function AdminOverviewPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Platform Overview"
        description="System-wide KPIs across all procurement centres (Master Admin / system-level view)."
      />
      <ComingSoon />
    </PageContainer>
  );
}
