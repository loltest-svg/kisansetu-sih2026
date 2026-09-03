import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function OperatorLiveQueuePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Live Queue"
        description="Token, farmer, status and estimated wait, with Call Next Farmer / Mark No-show actions."
      />
      <ComingSoon />
    </PageContainer>
  );
}
