import type { CentreStatusValue } from "@/lib/demo/farmerDashboard";

const STATUS_TAG_CLASS: Record<CentreStatusValue, string> = {
  OPEN: "ux4g-tag-filled-success",
  DELAYED: "ux4g-tag-filled-warning",
  PAUSED: "ux4g-tag-tonal-neutral",
  FULL: "ux4g-tag-outline-warning",
  CLOSED: "ux4g-tag-filled-error",
};

/**
 * Fuller centre information than the dashboard's compact
 * FarmerCentreStatusCard — no map integration (none was asked for; a
 * text location line is enough), no fabricated geographic API.
 */
export default function CentreDetailsCard({
  name,
  location,
  status,
  todaysCapacityQuintal,
  bookedQuintal,
  processingRatePerHour,
  estimatedDelayMinutes,
  availableSlotsLabel,
  guidanceNote,
}: {
  name: string;
  location: string;
  status: CentreStatusValue;
  todaysCapacityQuintal: number;
  bookedQuintal: number;
  processingRatePerHour: number;
  estimatedDelayMinutes: number;
  availableSlotsLabel: string;
  guidanceNote: string;
}) {
  const remaining = todaysCapacityQuintal - bookedQuintal;

  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">{name}</div>
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-m">
        <div className="ux4g-d-flex ux4g-flex-row ux4g-ai-center ux4g-gap-s ux4g-flex-wrap">
          <span className={`${STATUS_TAG_CLASS[status]} ux4g-tag-s`}>
            {status}
          </span>
          <span className="ux4g-body-s-default">{location}</span>
        </div>

        <dl className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-l ux4g-p-none">
          <div>
            <dt className="ux4g-label-m-default">Today&apos;s capacity</dt>
            <dd className="ux4g-body-m-default">
              {todaysCapacityQuintal} Quintal
            </dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Remaining today</dt>
            <dd className="ux4g-body-m-default">{remaining} Quintal</dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Processing rate</dt>
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

        <p className="ux4g-body-s-default">{availableSlotsLabel}</p>

        <div className="ux4g-alert ux4g-alert-info" role="status">
          <span className="ux4g-body-s-default">{guidanceNote}</span>
        </div>
      </div>
    </div>
  );
}
