import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import CentreDetailsCard from "@/components/farmer/CentreDetailsCard";
import { demoCentreDetails } from "@/lib/demo/farmerDashboard";

export default function FarmerCentrePage() {
  return (
    <PageContainer>
      <PageHeader
        title="My Centre"
        description="Status and capacity at your procurement centre."
      />
      <CentreDetailsCard
        name={demoCentreDetails.name}
        location={demoCentreDetails.location}
        status={demoCentreDetails.status}
        todaysCapacityQuintal={demoCentreDetails.todaysCapacityQuintal}
        bookedQuintal={demoCentreDetails.bookedQuintal}
        processingRatePerHour={demoCentreDetails.processingRatePerHour}
        estimatedDelayMinutes={demoCentreDetails.estimatedDelayMinutes}
        availableSlotsLabel={demoCentreDetails.availableSlotsLabel}
        guidanceNote={demoCentreDetails.guidanceNote}
      />
    </PageContainer>
  );
}
