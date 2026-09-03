import {
  getAttentionState,
  ATTENTION_LABEL,
  ATTENTION_TAG_CLASS,
  type CentreSummary,
} from "@/lib/demo/adminDashboard";

const STATUS_TAG_CLASS: Record<CentreSummary["status"], string> = {
  OPEN: "ux4g-tag-filled-success",
  DELAYED: "ux4g-tag-filled-warning",
  PAUSED: "ux4g-tag-tonal-neutral",
  FULL: "ux4g-tag-outline-warning",
  CLOSED: "ux4g-tag-filled-error",
};

/**
 * Compact per-centre card for the system-wide overview grid
 * (`/admin`) — Card, not Table, so the grid degrades to a single column
 * on narrow screens instead of forcing horizontal scroll.
 */
export default function CentreOverviewCard({
  centre,
}: {
  centre: CentreSummary;
}) {
  const attention = getAttentionState(centre);

  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">{centre.name}</div>
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-s">
        <div className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-s ux4g-ai-center">
          <span className={`${STATUS_TAG_CLASS[centre.status]} ux4g-tag-s`}>
            {centre.status}
          </span>
          {attention !== "NORMAL" && attention !== centre.status ? (
            <span className={`${ATTENTION_TAG_CLASS[attention]} ux4g-tag-s`}>
              {ATTENTION_LABEL[attention]}
            </span>
          ) : null}
          <span className="ux4g-body-s-default">{centre.location}</span>
        </div>
        <dl className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-l ux4g-p-none">
          <div>
            <dt className="ux4g-label-m-default">Farmers waiting</dt>
            <dd className="ux4g-body-m-default">{centre.farmersWaiting}</dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Today&apos;s capacity</dt>
            <dd className="ux4g-body-m-default">
              {centre.todaysCapacityQuintal} Quintal
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
