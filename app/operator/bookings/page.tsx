import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function OperatorBookingsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Bookings"
        description="All bookings for this centre, with filters."
      />
      <ComingSoon />
    </PageContainer>
  );
}
