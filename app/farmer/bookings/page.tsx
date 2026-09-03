import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function MyBookingsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="My Bookings"
        description="Booking detail, check-in and procurement/payment status will live here."
      />
      <ComingSoon note="No booking data exists yet — Supabase is not connected in this phase." />
    </PageContainer>
  );
}
