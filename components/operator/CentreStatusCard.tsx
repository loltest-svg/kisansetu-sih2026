"use client";

import type { CentreStatusValue } from "@/lib/demo/operatorDashboard";

const STATUS_TAG_CLASS: Record<CentreStatusValue, string> = {
  OPEN: "ux4g-tag-filled-success",
  DELAYED: "ux4g-tag-filled-warning",
  PAUSED: "ux4g-tag-tonal-neutral",
  FULL: "ux4g-tag-outline-warning",
  CLOSED: "ux4g-tag-filled-error",
};

const DELAY_MODAL_ID = "report-delay-modal";

/**
 * Centre status + the operator-facing status controls. Status here is
 * always operator-provided (docs/BUSINESS_LOGIC.md — "Dynamic Centre
 * Status": never auto-detected, no machine-failure sensing implied).
 *
 * The Pause/Resume/Report Delay buttons change *local component state
 * only*, passed down from the page (`onPause`/`onResume`/`onReportDelay`)
 * — nothing here calls an API or persists anything. See
 * lib/demo/operatorDashboard.ts and the "Demo" tag rendered in the page
 * header for the explicit UI labelling this data-honesty rule requires.
 */
export default function CentreStatusCard({
  status,
  centreName,
  centreLocation,
  processingRatePerHour,
  estimatedDelayMinutes,
  delayReason,
  onPause,
  onResume,
  onReportDelay,
}: {
  status: CentreStatusValue;
  centreName: string;
  centreLocation: string;
  processingRatePerHour: number;
  estimatedDelayMinutes: number;
  delayReason: string | null;
  onPause: () => void;
  onResume: () => void;
  onReportDelay: (reason: string) => void;
}) {
  const isOpenLike = status === "OPEN" || status === "DELAYED" || status === "FULL";

  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">Centre status</div>
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-s">
        <div className="ux4g-d-flex ux4g-flex-row ux4g-ai-center ux4g-gap-s ux4g-flex-wrap">
          <span className={`${STATUS_TAG_CLASS[status]} ux4g-tag-s`}>
            {status}
          </span>
          <span className="ux4g-body-s-default">
            {centreName} · {centreLocation}
          </span>
        </div>

        <dl className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-l ux4g-p-none">
          <div>
            <dt className="ux4g-label-m-default">Processing rate</dt>
            <dd className="ux4g-body-m-default">
              {processingRatePerHour} farmers / hr
            </dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Est. delay</dt>
            <dd className="ux4g-body-m-default">
              {estimatedDelayMinutes} min
            </dd>
          </div>
        </dl>

        {delayReason ? (
          <p className="ux4g-body-s-default">
            <strong className="ux4g-label-m-default">Delay reason: </strong>
            {delayReason}
          </p>
        ) : null}
      </div>
      <div className="ux4g-card-footer ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-s">
        {isOpenLike ? (
          <button
            type="button"
            className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-md"
            onClick={onPause}
          >
            Pause Centre
          </button>
        ) : (
          <button
            type="button"
            className="ux4g-btn ux4g-btn-primary ux4g-btn-md"
            onClick={onResume}
          >
            Resume Centre
          </button>
        )}
        <button
          type="button"
          data-modal-target={`#${DELAY_MODAL_ID}`}
          className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-md"
        >
          Report Delay
        </button>
      </div>

      <div
        id={DELAY_MODAL_ID}
        className="ux4g-modal-backdrop ux4g-modal-backdrop-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${DELAY_MODAL_ID}-title`}
      >
        <div className="ux4g-modal-box ux4g-modal-m">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const reason = new FormData(e.currentTarget)
                .get("delay-reason")
                ?.toString()
                .trim();
              onReportDelay(reason && reason.length > 0 ? reason : "Delay reported");
              // Close the same way the drawer/modal Cancel button does —
              // the UX4G runtime handles it via data-close-modal, so
              // instead of duplicating that logic we just click one.
              (
                e.currentTarget.querySelector(
                  "[data-close-modal]"
                ) as HTMLButtonElement | null
              )?.click();
              e.currentTarget.reset();
            }}
          >
            <div className="ux4g-modal-header">
              <h2 id={`${DELAY_MODAL_ID}-title`} className="ux4g-heading-s-strong">
                Report a delay
              </h2>
              <button type="button" data-close-modal aria-label="Close">
                &times;
              </button>
            </div>
            <div className="ux4g-modal-body">
              <div className="ux4g-textarea">
                <label className="ux4g-textarea-label" htmlFor="delay-reason">
                  Reason
                </label>
                <textarea
                  id="delay-reason"
                  name="delay-reason"
                  className="ux4g-textarea-input"
                  maxLength={200}
                  placeholder="e.g. Weighing machine under maintenance"
                />
              </div>
            </div>
            <div className="ux4g-modal-footer ux4g-d-flex ux4g-gap-s">
              <button
                type="button"
                data-close-modal
                className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-md"
              >
                Cancel
              </button>
              <button type="submit" className="ux4g-btn ux4g-btn-primary ux4g-btn-md">
                Report delay
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
