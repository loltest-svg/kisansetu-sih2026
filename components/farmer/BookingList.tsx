import BookingCard from "@/components/farmer/BookingCard";
import type { BookingHistoryItem } from "@/lib/demo/farmerDashboard";

export default function BookingList({
  bookings,
}: {
  bookings: BookingHistoryItem[];
}) {
  if (bookings.length === 0) {
    return <p className="ux4g-body-m-default">No bookings yet.</p>;
  }

  return (
    <div className="ux4g-d-flex ux4g-flex-col ux4g-gap-m">
      {bookings.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
}
