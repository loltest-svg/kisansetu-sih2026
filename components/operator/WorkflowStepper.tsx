import type { ProcessingStage } from "@/lib/demo/operatorDashboard";

/**
 * Renders the procurement workflow as a UX4G Stepper. Two instances are
 * rendered — one `ux4g-stepper-horizontal` (desktop, `lg:block`), one
 * `ux4g-stepper-vertical` (mobile, `lg:hidden`) — because the verified
 * `ux4g-stepper-mobile` modifier (README §Stepper) is a manual class, not
 * an auto-applied breakpoint behaviour; toggling between two orientations
 * needs two elements. Same "duplicate + Tailwind visibility toggle"
 * pattern already used for Sidebar/NavDrawer and Sidebar/BottomNav in the
 * Phase 2A shell, so this isn't a new technique.
 *
 * `role="list"`/`aria-current="step"` are added on top of the README's
 * plain `<div>` example — standard ARIA, not an invented class — since a
 * stepper conveys sequence/position information a screen reader can't
 * infer from unstyled divs alone.
 *
 * This is a display of *nominal* stage/position — see
 * lib/demo/operatorDashboard.ts: it does not assert every earlier stage
 * genuinely completed for a real record, because there is no real record
 * yet.
 */
export default function WorkflowStepper({
  stages,
  currentIndex,
}: {
  stages: ProcessingStage[];
  currentIndex: number;
}) {
  const renderSteps = () =>
    stages.map((stage, i) => {
      const state =
        i < currentIndex ? "completed" : i === currentIndex ? "active" : "";
      return (
        <div
          key={stage.key}
          className={`ux4g-stepper-step${state ? ` ${state}` : ""}`}
          aria-current={state === "active" ? "step" : undefined}
        >
          {stage.label}
        </div>
      );
    });

  return (
    <div aria-label="Procurement workflow stage">
      <div className="hidden lg:block">
        <div
          role="list"
          className="ux4g-stepper ux4g-stepper-horizontal ux4g-stepper-center"
        >
          {renderSteps()}
        </div>
      </div>
      <div className="lg:hidden">
        <div role="list" className="ux4g-stepper ux4g-stepper-vertical">
          {renderSteps()}
        </div>
      </div>
    </div>
  );
}
