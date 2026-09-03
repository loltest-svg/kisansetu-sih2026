import type { CentreStatusValue } from "@/lib/demo/farmerDashboard";

const STATUS_TAG_CLASS: Record<CentreStatusValue, string> = {
  OPEN: "ux4g-tag-filled-success",
  DELAYED: "ux4g-tag-filled-warning",
  PAUSED: "ux4g-tag-tonal-neutral",
  FULL: "ux4g-tag-outline-warning",
  CLOSED: "ux4g-tag-filled-error",
};

/**
 * Compact centre-status summary for the dashboard — deliberately lighter
 * than the Operator dashboard's `CentreStatusCard` (Phase 2B): read-only,
 * plain language ("Estimated delay" not "Operational Availability
 * State"), no operator controls. The fuller version lives on
 * /farmer/centre (`CentreDetailsCard`).
 */
export default function FarmerCentreStatusCard({
  status,
  queueCount,
  processingRatePerHour,
  estimatedDelayMinutes,
}: {
  status: CentreStatusValue;
  queueCount: number;
  processingRatePerHour: number;
  estimatedDelayMinutes: number;
}) {
  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">Centre status</div>
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-s">
        <span className={`${STATUS_TAG_CLASS[status]} ux4g-tag-s`}>
          {status}
        </span>
        <dl className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-l ux4g-p-none">
          <div>
            <dt className="ux4g-label-m-default">Queue</dt>
            <dd className="ux4g-body-m-default">{queueCount} farmers</dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Processing</dt>
            <dd className="ux4g-body-m-default">
              {processingRatePerHour} farmers / hr
            </dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Estimated delay</dt>
            <dd className="ux4g-body-m-default">
              {estimatedDelayMinutes} min
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
