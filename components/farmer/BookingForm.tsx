"use client";

import { useState } from "react";
import {
  demoCentreOptions,
  demoCropOptions,
  demoSlotOptions,
} from "@/lib/demo/farmerDashboard";

/**
 * New Booking form. UI ONLY — see docs/PROJECT_STATE.md (Phase 2C):
 * submitting shows an explicit "this is a demo" message instead of a fake
 * success/confirmation screen, because no booking is actually created.
 *
 * Structured so a real implementation can slot in behind the same fields:
 * centre/date/slot/crop/quantity are exactly the inputs
 * docs/BUSINESS_LOGIC.md's Smart Allocation Engine needs, and the engine
 * would replace "pick a centre yourself" with a recommended centre/slot —
 * not built here, this form only collects the same inputs it would need.
 *
 * Field structure note: the README's Input/Dropdown examples
 * (`<div class="ux4g-input-container ..."><label/><input/></div>`) omit
 * an inner wrapper the *compiled* CSS actually styles
 * (`.ux4g-input-md .ux4g-input{height:2.5rem}`,
 * `.ux4g-input-error .ux4g-input{border-color:...}` — both target
 * `.ux4g-input`, not the bare `<input>`/`<select>`). Confirmed by reading
 * the compiled CSS directly, not the simplified example. Every field
 * below uses the full `ux4g-input-container` > `.ux4g-input` >
 * `ux4g-input-input` structure so borders/height/focus render as
 * intended — see docs/PROJECT_STATE.md for the full finding, including
 * that Phase 1/2A's existing inputs predate this discovery and would
 * benefit from the same fix in a later pass.
 */
export default function BookingForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-m">
        <div className="ux4g-alert ux4g-alert-info" role="status">
          <span className="ux4g-body-s-default">
            This form previews the future booking flow. It does not create a
            real booking — the finished system will recommend a centre and
            slot for you automatically based on capacity and centre status.
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
          className="ux4g-d-flex ux4g-flex-col ux4g-gap-m"
        >
          <div className="ux4g-input-container ux4g-input-md ux4g-input-default">
            <label className="ux4g-label-m-default" htmlFor="booking-centre">
              Procurement centre
            </label>
            <div className="ux4g-input">
              <select id="booking-centre" className="ux4g-input-input" required>
                {demoCentreOptions.map((centre) => (
                  <option key={centre} value={centre}>
                    {centre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ux4g-input-container ux4g-input-md ux4g-input-default">
            <label className="ux4g-label-m-default" htmlFor="booking-date">
              Preferred date
            </label>
            <div className="ux4g-input">
              <input
                id="booking-date"
                type="date"
                className="ux4g-input-input"
                required
              />
            </div>
          </div>

          <div className="ux4g-input-container ux4g-input-md ux4g-input-default">
            <label className="ux4g-label-m-default" htmlFor="booking-slot">
              Preferred time slot
            </label>
            <div className="ux4g-input">
              <select id="booking-slot" className="ux4g-input-input" required>
                {demoSlotOptions.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ux4g-input-container ux4g-input-md ux4g-input-default">
            <label className="ux4g-label-m-default" htmlFor="booking-crop">
              Crop / commodity
            </label>
            <div className="ux4g-input">
              <select id="booking-crop" className="ux4g-input-input" required>
                {demoCropOptions.map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ux4g-input-container ux4g-input-md ux4g-input-default">
            <label className="ux4g-label-m-default" htmlFor="booking-quantity">
              Approximate quantity (Quintal)
            </label>
            <div className="ux4g-input">
              <input
                id="booking-quantity"
                type="number"
                min={0}
                step={1}
                className="ux4g-input-input"
                placeholder="e.g. 25"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="ux4g-btn ux4g-btn-primary ux4g-btn-md"
          >
            Preview booking
          </button>

          {submitted ? (
            <div className="ux4g-alert ux4g-alert-success" role="status">
              <span className="ux4g-body-s-default">
                This is a demo — no booking was created. Real slot booking
                will be available once the backend is connected.
              </span>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
