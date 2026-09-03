import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function CapacityAndSlotsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Capacity & Slots"
        description="Total capacity, booked, available slots and processing rate for today."
      />
      <ComingSoon />
    </PageContainer>
  );
}
