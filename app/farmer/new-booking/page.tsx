import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function NewBookingPage() {
  return (
    <PageContainer>
      <PageHeader
        title="New Booking"
        description="Crop and quantity entry, then a smart centre/slot recommendation (docs/BUSINESS_LOGIC.md)."
      />
      <ComingSoon note="Allocation logic is a later phase — no recommendation is computed here yet." />
    </PageContainer>
  );
}
