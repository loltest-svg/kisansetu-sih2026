/**
 * UX4G integration smoke test — Phase 1 foundation only.
 *
 * Not the real Farmer/Operator/Admin UI (docs/UI_SPEC.md, Phase 2). This
 * page exists to prove the stack works: Next.js renders it as a Server
 * Component (no "use client" here), while the interactive Modal below is
 * driven entirely by the UX4G runtime's event delegation — mounted once by
 * <Ux4gRuntime /> in app/layout.tsx — with no React state of our own.
 *
 * Every class below is verified against the installed
 * ux4g-web-components@2.0.1 package (README + compiled styles/ux4g.css),
 * per docs/UX4G.md. Tailwind is used only for the two structural layout
 * points noted inline; no colour, spacing value, radius, typography,
 * border or focus treatment is set outside UX4G classes/tokens.
 */
export default function Home() {
  return (
    // Tailwind: outer page shell only (min-height + column flow).
    <div className="min-h-screen flex flex-col">
      <main className="ux4g-container ux4g-container-lg ux4g-p-xl">
        <header className="ux4g-p-none">
          <p className="ux4g-label-l-default ux4g-text-brand-primary-default">
            Smart MSP Procurement Coordination Platform — SIH26032
          </p>
          <h1 className="ux4g-heading-xl-strong">UX4G integration smoke test</h1>
          <p className="ux4g-body-m-default">
            Phase 1 foundation check only. The real Farmer, Operator and
            Admin experiences are specified in{" "}
            <code>docs/UI_SPEC.md</code> and built in Phase 2.
          </p>
        </header>

        {/* Tailwind: responsive column count only — the gap value itself
            comes from the ux4g-gap-l token, not Tailwind. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 ux4g-gap-l ux4g-p-none">
          <section aria-labelledby="buttons-heading" className="ux4g-p-none">
            <h2 id="buttons-heading" className="ux4g-heading-s-strong">
              Buttons
            </h2>
            <p className="ux4g-body-s-default">
              Base + variant + size composition (Design.md §2 — safe under
              every component&apos;s class-composition model).
            </p>
            <div className="ux4g-d-flex ux4g-flex-wrap ux4g-gap-m">
              <button type="button" className="ux4g-btn ux4g-btn-primary ux4g-btn-md">
                Primary
              </button>
              <button
                type="button"
                className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-md"
              >
                Outline
              </button>
              <button type="button" className="ux4g-btn ux4g-btn-tonal-primary ux4g-btn-md">
                Tonal
              </button>
              <button type="button" className="ux4g-btn ux4g-btn-text-primary ux4g-btn-md">
                Text
              </button>
              <button
                type="button"
                className="ux4g-btn ux4g-btn-primary ux4g-btn-md"
                disabled
                aria-disabled="true"
              >
                Disabled
              </button>
            </div>
          </section>

          <section aria-labelledby="form-heading" className="ux4g-p-none">
            <h2 id="form-heading" className="ux4g-heading-s-strong">
              Form controls
            </h2>
            <p className="ux4g-body-s-default">
              Labels are explicitly associated via <code>htmlFor</code>/
              <code>id</code> — the README example omits this; Design.md §9
              requires it.
            </p>
            <div className="ux4g-d-flex ux4g-flex-col ux4g-gap-m">
              <div className="ux4g-input-container ux4g-input-md ux4g-input-default">
                <label htmlFor="smoke-farmer-name">Farmer name</label>
                <input id="smoke-farmer-name" type="text" placeholder="e.g. Ramesh Kumar" />
              </div>
              <div className="ux4g-input-container ux4g-input-md ux4g-input-error">
                <label htmlFor="smoke-quantity">Quantity (quintal)</label>
                <input
                  id="smoke-quantity"
                  type="number"
                  min={0}
                  aria-invalid="true"
                  aria-describedby="smoke-quantity-helper"
                />
                <span id="smoke-quantity-helper" className="ux4g-input-helper">
                  Quantity is required
                </span>
              </div>
            </div>
          </section>

          <section aria-labelledby="card-heading" className="ux4g-p-none">
            <h2 id="card-heading" className="ux4g-heading-s-strong">
              Card
            </h2>
            <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
              <div className="ux4g-card-header">Centre overview</div>
              <div className="ux4g-card-body">
                <p className="ux4g-body-m-default">
                  Header, body and footer regions render as documented
                  (README §Card).
                </p>
              </div>
              <div className="ux4g-card-footer">
                <span className="ux4g-tag-filled-success ux4g-tag-s">OPEN</span>
              </div>
            </div>
          </section>

          <section aria-labelledby="status-heading" className="ux4g-p-none">
            <h2 id="status-heading" className="ux4g-heading-s-strong">
              Status (Tag)
            </h2>
            <p className="ux4g-body-s-default">
              Not colour-only: each status also carries its own text label.
              Values match the <code>centre_status</code> enum in{" "}
              <code>docs/DATABASE.md</code>.
            </p>
            <div className="ux4g-d-flex ux4g-flex-wrap ux4g-gap-s">
              <span className="ux4g-tag-filled-success ux4g-tag-s">OPEN</span>
              <span className="ux4g-tag-tonal-neutral ux4g-tag-s">DELAYED</span>
              <span className="ux4g-tag-outline-error ux4g-tag-s">CLOSED</span>
            </div>
          </section>
        </div>

        <section aria-labelledby="runtime-heading" className="ux4g-p-none">
          <h2 id="runtime-heading" className="ux4g-heading-s-strong">
            Runtime check (Modal)
          </h2>
          <p className="ux4g-body-s-default">
            Opens and closes via the UX4G runtime&apos;s{" "}
            <code>data-modal-target</code> / <code>data-close-modal</code>{" "}
            event delegation — no React state involved. This page is a
            Server Component; only <code>components/Ux4gRuntime.tsx</code> is
            a Client Component.
          </p>
          <button
            type="button"
            data-modal-target="#smoke-modal"
            className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-md"
          >
            Open runtime test modal
          </button>

          <div
            id="smoke-modal"
            className="ux4g-modal-backdrop ux4g-modal-backdrop-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="smoke-modal-title"
          >
            <div className="ux4g-modal-box ux4g-modal-m">
              <div className="ux4g-modal-header">
                <h2 id="smoke-modal-title" className="ux4g-heading-s-strong">
                  Runtime check
                </h2>
                <button type="button" data-close-modal aria-label="Close">
                  &times;
                </button>
              </div>
              <div className="ux4g-modal-body">
                <p className="ux4g-body-m-default">
                  If this opened on click and closes on click, the UX4G
                  client-side runtime is initialized correctly.
                </p>
              </div>
              <div className="ux4g-modal-footer">
                <button
                  type="button"
                  data-close-modal
                  className="ux4g-btn ux4g-btn-primary ux4g-btn-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
