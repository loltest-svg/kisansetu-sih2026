import MetricCard from "@/components/shared/MetricCard";

/**
 * Answers exactly one question — "how long until my turn?" — without
 * requiring the farmer to understand centre operations. Deliberately
 * shows only the farmer's own token and aggregate counts, never other
 * farmers' names/tokens (docs/SECURITY.md — farmers can see centre-level
 * queue state, not other farmers' personal data).
 */
export default function QueueStatusCard({
  token,
  position,
  farmersAhead,
  estimatedWaitMinutes,
  processingRatePerHour,
  currentlyProcessingToken,
}: {
  token: string;
  position: number;
  farmersAhead: number;
  estimatedWaitMinutes: number;
  processingRatePerHour: number;
  currentlyProcessingToken: string;
}) {
  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">Your place in the queue</div>
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-m">
        <div>
          <p className="ux4g-label-m-default">Your token</p>
          <p className="ux4g-heading-m-strong">{token}</p>
          <p className="ux4g-body-s-default">Queue position #{position}</p>
        </div>

        <div className="grid grid-cols-2 ux4g-gap-m">
          <MetricCard label="Farmers ahead" value={farmersAhead} />
          <MetricCard
            label="Estimated wait"
            value={estimatedWaitMinutes}
            unit="min"
          />
        </div>

        <dl className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-l ux4g-p-none">
          <div>
            <dt className="ux4g-label-m-default">Currently processing</dt>
            <dd className="ux4g-body-m-default">
              Token {currentlyProcessingToken}
            </dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Processing rate</dt>
            <dd className="ux4g-body-m-default">
              {processingRatePerHour} farmers / hr
            </dd>
          </div>
        </dl>

        <p className="ux4g-body-xs-default">
          Demo data — this queue is not connected to a live backend yet.
        </p>
      </div>
    </div>
  );
}
