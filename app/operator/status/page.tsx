import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function OperatorCentreStatusPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Centre Status"
        description="Set OPEN, DELAYED, PAUSED, FULL or CLOSED and report a delay reason (docs/BUSINESS_LOGIC.md)."
      />
      <ComingSoon note="No automatic machine-failure detection — status here will always be operator-reported." />
    </PageContainer>
  );
}
