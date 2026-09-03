import WorkflowStepper from "@/components/shared/WorkflowStepper";
import type { ProcessingStage, QueueItem } from "@/lib/demo/operatorDashboard";

/**
 * The single farmer currently at the counter. `item` is null when nobody
 * is being processed (e.g. right after "Complete Processing", before
 * "Call Next") — shown as an explicit empty state, not a blank card.
 */
export default function CurrentProcessingCard({
  item,
  stages,
  stageIndex,
  onComplete,
}: {
  item: QueueItem | null;
  stages: ProcessingStage[];
  stageIndex: number;
  onComplete: () => void;
}) {
  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">Current processing</div>
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-m">
        {item ? (
          <>
            <div className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-l">
              <div>
                <p className="ux4g-label-m-default">Token</p>
                <p className="ux4g-title-m-strong">{item.token}</p>
              </div>
              <div>
                <p className="ux4g-label-m-default">Farmer</p>
                <p className="ux4g-body-m-default">{item.farmerName}</p>
              </div>
              {item.crop ? (
                <div>
                  <p className="ux4g-label-m-default">Crop</p>
                  <p className="ux4g-body-m-default">{item.crop}</p>
                </div>
              ) : null}
              {item.quantityQuintal ? (
                <div>
                  <p className="ux4g-label-m-default">Quantity</p>
                  <p className="ux4g-body-m-default">
                    {item.quantityQuintal} Quintal
                  </p>
                </div>
              ) : null}
            </div>
            <WorkflowStepper stages={stages} currentIndex={stageIndex} />
          </>
        ) : (
          <p className="ux4g-body-m-default">
            No farmer is currently being processed. Use{" "}
            <strong className="ux4g-label-m-default">Call Next</strong> in
            the live queue to start the next one.
          </p>
        )}
      </div>
      {item ? (
        <div className="ux4g-card-footer">
          <button
            type="button"
            className="ux4g-btn ux4g-btn-primary ux4g-btn-md"
            onClick={onComplete}
          >
            Complete Processing
          </button>
        </div>
      ) : null}
    </div>
  );
}
