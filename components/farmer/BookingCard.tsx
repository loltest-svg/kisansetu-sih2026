import Link from "next/link";
import type { BookingHistoryItem } from "@/lib/demo/farmerDashboard";

const STATUS_TAG_CLASS: Record<BookingHistoryItem["status"], string> = {
  CONFIRMED: "ux4g-tag-filled-success",
  COMPLETED: "ux4g-tag-tonal-neutral",
  CANCELLED: "ux4g-tag-outline-error",
};

/**
 * One booking, as a Card rather than a table row — reads fine on a phone
 * with no risk of horizontal overflow, unlike a wide table would.
 */
export default function BookingCard({
  booking,
}: {
  booking: BookingHistoryItem;
}) {
  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-jc-between ux4g-ai-start ux4g-gap-s">
        <div>
          <p className="ux4g-label-m-default">Token {booking.token}</p>
          <p className="ux4g-title-s-strong">{booking.centreName}</p>
          <p className="ux4g-body-s-default">
            {booking.dateLabel} · {booking.timeLabel}
          </p>
          <p className="ux4g-body-s-default">
            {booking.crop} · {booking.quantityQuintal} Quintal
          </p>
        </div>
        <span className={`${STATUS_TAG_CLASS[booking.status]} ux4g-tag-s`}>
          {booking.status}
        </span>
      </div>
      {booking.status === "CONFIRMED" ? (
        <div className="ux4g-card-footer">
          <Link
            href="/farmer/queue"
            className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-md"
          >
            View Live Queue
          </Link>
        </div>
      ) : null}
    </div>
  );
}
