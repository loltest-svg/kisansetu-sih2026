import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import QueueStatusCard from "@/components/farmer/QueueStatusCard";
import { demoQueueStatus } from "@/lib/demo/farmerDashboard";

export default function FarmerLiveQueuePage() {
  return (
    <PageContainer>
      <div className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-ai-center ux4g-jc-between ux4g-gap-s">
        <PageHeader
          title="Live Queue"
          description="How long until your turn."
        />
        <span
          className="ux4g-tag-outline-warning ux4g-tag-s"
          title="This screen has no backend yet — every value here is local, presentation-only demo data."
        >
          Demo data — not connected to a backend
        </span>
      </div>
      <QueueStatusCard
        token={demoQueueStatus.token}
        position={demoQueueStatus.position}
        farmersAhead={demoQueueStatus.farmersAhead}
        estimatedWaitMinutes={demoQueueStatus.estimatedWaitMinutes}
        processingRatePerHour={demoQueueStatus.processingRatePerHour}
        currentlyProcessingToken={demoQueueStatus.currentlyProcessingToken}
      />
    </PageContainer>
  );
}
