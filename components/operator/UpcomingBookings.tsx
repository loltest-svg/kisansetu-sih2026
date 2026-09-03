import type { BookingItem } from "@/lib/demo/operatorDashboard";

/**
 * Compact upcoming-bookings list. List again, not Table, for the same
 * no-horizontal-overflow reasoning as LiveQueue. "Check In" is offered
 * only on the next booking — checking in the wrong farmer out of order
 * isn't a real operator action, so the control isn't offered for every
 * row.
 */
export default function UpcomingBookings({
  bookings,
  onCheckInNext,
}: {
  bookings: BookingItem[];
  onCheckInNext: () => void;
}) {
  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">Upcoming bookings</div>
      <div className="ux4g-card-body">
        {bookings.length > 0 ? (
          <ul className="ux4g-list ux4g-list-default ux4g-list-m">
            {bookings.map((booking, i) => (
              <li key={booking.id} className="ux4g-list-item">
                <div className="ux4g-list-item-row">
                  <span className="ux4g-list-item-start ux4g-d-flex ux4g-flex-col">
                    <span className="ux4g-label-l-default">
                      {booking.token} · {booking.farmerName}
                    </span>
                    <span className="ux4g-body-xs-default">
                      {booking.slotTimeLabel} · {booking.crop} ·{" "}
                      {booking.quantityQuintal} Quintal
                    </span>
                  </span>
                  {i === 0 ? (
                    <span className="ux4g-list-item-end">
                      <button
                        type="button"
                        className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-md"
                        onClick={onCheckInNext}
                      >
                        Check In
                      </button>
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ux4g-body-m-default">No upcoming bookings today.</p>
        )}
      </div>
    </div>
  );
}
