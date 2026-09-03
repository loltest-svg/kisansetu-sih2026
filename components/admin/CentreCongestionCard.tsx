import type { CSSProperties } from "react";
import {
  getAttentionState,
  ATTENTION_LABEL,
  ATTENTION_TAG_CLASS,
  utilizationPercent,
  type CentreSummary,
} from "@/lib/demo/adminDashboard";

/**
 * Capacity/congestion-focused per-centre card for `/admin/capacity`.
 * Reuses the same linear Progress Indicator pattern verified in Phase 2B
 * (`ux4g-progress-bar`/`-fill`, driven by the `--ux4g-progress-value`
 * custom property the compiled CSS actually reads — not the plain
 * `style="width:60%"` the README's simplified example shows). Not
 * factored into a shared component this phase, to avoid touching the
 * Phase 2B file that already has its own copy (docs/PROJECT_STATE.md —
 * "do not modify unrelated files").
 */
export default function CentreCongestionCard({
  centre,
}: {
  centre: CentreSummary;
}) {
  const attention = getAttentionState(centre);
  const util = utilizationPercent(centre);
  const remaining = centre.todaysCapacityQuintal - centre.bookedQuintal;
  const fillStyle = { "--ux4g-progress-value": util } as CSSProperties;

  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header ux4g-d-flex ux4g-flex-row ux4g-jc-between ux4g-ai-center">
        <span>{centre.name}</span>
        <span className={`${ATTENTION_TAG_CLASS[attention]} ux4g-tag-s`}>
          {ATTENTION_LABEL[attention]}
        </span>
      </div>
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-s">
        <div
          className="ux4g-progress-bar"
          role="progressbar"
          aria-valuenow={util}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${centre.name} capacity utilised today`}
        >
          <div className="ux4g-progress-bar-fill" style={fillStyle} />
        </div>
        <p className="ux4g-body-s-default">
          {util}% utilised — {centre.bookedQuintal} of{" "}
          {centre.todaysCapacityQuintal} Quintal booked
        </p>
        <dl className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-l ux4g-p-none">
          <div>
            <dt className="ux4g-label-m-default">Remaining</dt>
            <dd className="ux4g-body-m-default">{remaining} Quintal</dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Farmers waiting</dt>
            <dd className="ux4g-body-m-default">{centre.farmersWaiting}</dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Processing rate</dt>
            <dd className="ux4g-body-m-default">
              {centre.processingRatePerHour} farmers / hr
            </dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Estimated delay</dt>
            <dd className="ux4g-body-m-default">
              {centre.estimatedDelayMinutes} min
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
