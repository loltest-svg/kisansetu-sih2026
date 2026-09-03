"use client";

import { useState } from "react";
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
 * Richer per-centre card for `/admin/centres`, structured for the FUTURE
 * management actions the phase instructions describe (view, edit,
 * activate/deactivate) without persisting anything:
 *
 * - "Deactivate"/"Activate" flips *local component state only* — no API
 *   call, no Supabase, resets on reload, labelled as such.
 * - "Edit centre details" is a real, native `disabled` button with an
 *   explanatory tooltip rather than wired to a fake save flow — there is
 *   nothing to edit yet
 *   (docs/PROJECT_STATE.md — Data Honesty: no fake "saved successfully"
 *   messages anywhere in this phase).
 */
export default function CentreManagementCard({
  centre,
}: {
  centre: CentreSummary;
}) {
  const [locallyActive, setLocallyActive] = useState(
    centre.status !== "CLOSED"
  );
  const attention = getAttentionState(centre);

  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">{centre.name}</div>
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-s">
        <div className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-s ux4g-ai-center">
          <span className={`${STATUS_TAG_CLASS[centre.status]} ux4g-tag-s`}>
            {centre.status}
          </span>
          <span className={`${ATTENTION_TAG_CLASS[attention]} ux4g-tag-s`}>
            {ATTENTION_LABEL[attention]}
          </span>
          {!locallyActive ? (
            <span className="ux4g-tag-outline-error ux4g-tag-s">
              Deactivated (demo)
            </span>
          ) : null}
          <span className="ux4g-body-s-default">{centre.location}</span>
        </div>

        <dl className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-l ux4g-p-none">
          <div>
            <dt className="ux4g-label-m-default">Assigned Centre Admin</dt>
            <dd className="ux4g-body-m-default">
              {centre.assignedCentreAdmin}
            </dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Operators</dt>
            <dd className="ux4g-body-m-default">{centre.operatorCount}</dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Today&apos;s capacity</dt>
            <dd className="ux4g-body-m-default">
              {centre.todaysCapacityQuintal} Quintal
            </dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Farmers waiting</dt>
            <dd className="ux4g-body-m-default">{centre.farmersWaiting}</dd>
          </div>
        </dl>
      </div>
      <div className="ux4g-card-footer ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-s">
        <button
          type="button"
          className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-md"
          disabled
          title="Centre editing is not implemented yet"
        >
          Edit centre details
        </button>
        <button
          type="button"
          className={
            locallyActive
              ? "ux4g-btn ux4g-btn-outline-danger ux4g-btn-md"
              : "ux4g-btn ux4g-btn-primary ux4g-btn-md"
          }
          onClick={() => setLocallyActive((v) => !v)}
        >
          {locallyActive ? "Deactivate centre" : "Activate centre"}
        </button>
      </div>
    </div>
  );
}
