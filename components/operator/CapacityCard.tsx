import type { CSSProperties } from "react";

/**
 * Today's capacity/utilisation. Uses the linear Progress Indicator
 * (`ux4g-progress-bar`/`-fill`). A circular variant also exists
 * (`ux4g-progress-circle`) but its real DOM contract in the compiled CSS
 * (`[data-ux-progress-circle]`, several nested `-indicator`/`-ring`/
 * `-value-wrap` parts driven by a conic-gradient mask) is materially more
 * complex than the trivial two-line example in the README — rather than
 * guess at an undocumented structure, this uses the fully-documented
 * linear bar, which is just as legitimate a "Progress Indicator" per
 * Design.md §12.
 *
 * The fill width is driven by the `--ux4g-progress-value` custom property
 * the compiled CSS actually reads (`inline-size:
 * max(calc(var(--ux4g-progress-value)*1%),1px)`), not the plain `width`
 * style the README's simplified example shows — confirmed by reading the
 * compiled rule directly before using it.
 */
export default function CapacityCard({
  totalQuintal,
  bookedQuintal,
  remainingQuintal,
  utilizationPercent,
}: {
  totalQuintal: number;
  bookedQuintal: number;
  remainingQuintal: number;
  utilizationPercent: number;
}) {
  const fillStyle = {
    "--ux4g-progress-value": utilizationPercent,
  } as CSSProperties;

  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">Capacity & utilisation</div>
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-s">
        <div
          className="ux4g-progress-bar"
          role="progressbar"
          aria-valuenow={utilizationPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Capacity utilised today"
        >
          <div className="ux4g-progress-bar-fill" style={fillStyle} />
        </div>
        <p className="ux4g-body-s-default">
          {utilizationPercent}% utilised — {bookedQuintal} of {totalQuintal}{" "}
          quintal booked
        </p>

        <dl className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-l ux4g-p-none">
          <div>
            <dt className="ux4g-label-m-default">Total capacity</dt>
            <dd className="ux4g-body-m-default">{totalQuintal} Quintal</dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Remaining</dt>
            <dd className="ux4g-body-m-default">{remainingQuintal} Quintal</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
