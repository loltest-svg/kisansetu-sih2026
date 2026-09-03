import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import BookingForm from "@/components/farmer/BookingForm";

export default function NewBookingPage() {
  return (
    <PageContainer>
      <PageHeader
        title="New Booking"
        description="Tell us your crop, quantity and preferred slot."
      />
      <BookingForm />
    </PageContainer>
  );
}
