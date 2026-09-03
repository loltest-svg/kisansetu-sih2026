import QueueItemRow from "@/components/operator/QueueItemRow";
import type { QueueItem } from "@/lib/demo/operatorDashboard";

/**
 * Live queue. Uses List (`ux4g-list`), not Table — same choice and same
 * reasoning as the Phase 2A shell's nav (docs/UI_SPEC.md allows either;
 * List avoids the horizontal-overflow risk a wide table would carry on a
 * phone, so nothing needs a separate "collapse to cards" treatment here).
 */
export default function LiveQueue({
  items,
  onCallNext,
}: {
  items: QueueItem[];
  onCallNext: () => void;
}) {
  const hasWaiting = items.some((i) => i.status === "WAITING");
  const hasProcessing = items.some((i) => i.status === "PROCESSING");

  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header ux4g-d-flex ux4g-flex-row ux4g-jc-between ux4g-ai-center">
        <span>Live queue</span>
        <button
          type="button"
          className="ux4g-btn ux4g-btn-primary ux4g-btn-md"
          onClick={onCallNext}
          disabled={hasProcessing || !hasWaiting}
        >
          Call Next Farmer
        </button>
      </div>
      <div className="ux4g-card-body">
        {items.length > 0 ? (
          <ul className="ux4g-list ux4g-list-default ux4g-list-m">
            {items.map((item) => (
              <QueueItemRow key={item.id} item={item} />
            ))}
          </ul>
        ) : (
          <p className="ux4g-body-m-default">No farmers in the queue.</p>
        )}
      </div>
    </div>
  );
}
