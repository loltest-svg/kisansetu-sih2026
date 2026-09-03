import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function AdminCentresPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Centres"
        description="All procurement centres — status, capacity and congestion at a glance."
      />
      <ComingSoon />
    </PageContainer>
  );
}
