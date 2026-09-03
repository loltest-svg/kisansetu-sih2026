import Link from "next/link";
import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import BookingList from "@/components/farmer/BookingList";
import { demoBookingHistory } from "@/lib/demo/farmerDashboard";

export default function MyBookingsPage() {
  return (
    <PageContainer>
      <div className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-ai-center ux4g-jc-between ux4g-gap-s">
        <PageHeader
          title="My Bookings"
          description="Your upcoming and past procurement appointments."
        />
        <Link
          href="/farmer/bookings/new"
          className="ux4g-btn ux4g-btn-primary ux4g-btn-md"
        >
          Book Slot
        </Link>
      </div>
      <BookingList bookings={demoBookingHistory} />
    </PageContainer>
  );
}
