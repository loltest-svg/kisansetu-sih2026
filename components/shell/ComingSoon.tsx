/**
 * Placeholder for a screen whose navigation exists but whose real content
 * is Phase 2B+ work (docs/PROJECT_STATE.md). Explicitly not a fake
 * dashboard — no invented metrics, no sample data shaped like the future
 * schema. Uses UX4G's Empty State (`ux4g-empty-state` /
 * `ux4g-empty-state-content`, confirmed in compiled CSS) without its
 * illustration `<img>` — the project's design language rules out
 * decorative illustrations, so only the text-bearing part of the pattern
 * is used.
 */
export default function ComingSoon({ note }: { note?: string }) {
  return (
    <div className="ux4g-empty-state ux4g-p-2xl">
      <div className="ux4g-empty-state-content">
        <h2 className="ux4g-title-l-strong">Not built yet</h2>
        <p className="ux4g-body-m-default">
          This screen&apos;s navigation is in place; its real content is
          Phase 2B work.
          {note ? ` ${note}` : ""}
        </p>
      </div>
    </div>
  );
}
