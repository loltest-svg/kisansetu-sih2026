import type { QueueItem } from "@/lib/demo/operatorDashboard";

const STATUS_TAG: Record<QueueItem["status"], string> = {
  PROCESSING: "ux4g-tag-filled-brand",
  WAITING: "ux4g-tag-tonal-neutral",
  COMPLETED: "ux4g-tag-outline-success",
};

/**
 * One row of the Live Queue list. Visual distinction between
 * processing/waiting/completed comes from both the status Tag's text
 * (never colour alone) and, for the active row, a strong-weight token —
 * same non-colour-only pattern used for nav active state in Phase 2A.
 */
export default function QueueItemRow({ item }: { item: QueueItem }) {
  const isProcessing = item.status === "PROCESSING";
  const isCompleted = item.status === "COMPLETED";

  return (
    <li className="ux4g-list-item">
      <div
        className={`ux4g-list-item-row${isProcessing ? " active" : ""}`}
      >
        <span className="ux4g-list-item-start ux4g-d-flex ux4g-flex-col">
          <span
            className={
              isProcessing ? "ux4g-label-l-strong" : "ux4g-label-l-default"
            }
          >
            {item.token} · {item.farmerName}
          </span>
          <span className="ux4g-body-xs-default">{item.maskedPhone}</span>
        </span>
        <span className="ux4g-list-item-end ux4g-d-flex ux4g-flex-col ux4g-ai-end">
          <span className={`${STATUS_TAG[item.status]} ux4g-tag-s`}>
            {item.status}
          </span>
          {!isProcessing && !isCompleted && item.etaMinutes != null ? (
            <span className="ux4g-body-xs-default">
              ~{item.etaMinutes} min
            </span>
          ) : null}
        </span>
      </div>
    </li>
  );
}
