import Link from "next/link";
import MetricCard from "@/components/shared/MetricCard";
import type { BookingStatus } from "@/lib/demo/farmerDashboard";

const STATUS_TAG_CLASS: Record<BookingStatus, string> = {
  CONFIRMED: "ux4g-tag-filled-success",
  COMPLETED: "ux4g-tag-tonal-neutral",
  CANCELLED: "ux4g-tag-outline-error",
};

/**
 * The single most important thing on the Farmer dashboard — "what do I
 * need to do, and when" — placed first, per the phase's information
 * hierarchy. Mirrors the reference image's "Your Next Step" card
 * (centre, date/time, token, status, farmers-ahead/estimated-wait, a
 * link into the live queue), rebuilt with verified UX4G classes only.
 */
export default function NextStepCard({
  centreName,
  centreLocation,
  dateLabel,
  timeLabel,
  token,
  status,
  farmersAhead,
  estimatedWaitMinutes,
}: {
  centreName: string;
  centreLocation: string;
  dateLabel: string;
  timeLabel: string;
  token: string;
  status: BookingStatus;
  farmersAhead: number;
  estimatedWaitMinutes: number;
}) {
  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">Your next step</div>
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-m">
        <div className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-jc-between ux4g-ai-start ux4g-gap-s">
          <div>
            <p className="ux4g-title-m-strong">{centreName}</p>
            <p className="ux4g-body-s-default">{centreLocation}</p>
            <p className="ux4g-body-m-default">
              {dateLabel} · {timeLabel}
            </p>
          </div>
          <div className="ux4g-d-flex ux4g-flex-col ux4g-ai-end ux4g-gap-2xs">
            <span className={`${STATUS_TAG_CLASS[status]} ux4g-tag-s`}>
              {status}
            </span>
            <span className="ux4g-label-m-default">Token {token}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 ux4g-gap-m">
          <MetricCard label="Farmers ahead" value={farmersAhead} />
          <MetricCard
            label="Estimated wait"
            value={estimatedWaitMinutes}
            unit="min"
          />
        </div>
      </div>
      <div className="ux4g-card-footer">
        <Link
          href="/farmer/queue"
          className="ux4g-btn ux4g-btn-primary ux4g-btn-md"
        >
          View Live Queue
        </Link>
      </div>
    </div>
  );
}
