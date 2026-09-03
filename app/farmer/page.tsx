import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import NextStepCard from "@/components/farmer/NextStepCard";
import FarmerCentreStatusCard from "@/components/farmer/FarmerCentreStatusCard";
import QuickActions from "@/components/farmer/QuickActions";
import WorkflowStepper from "@/components/shared/WorkflowStepper";
import PaymentStatusCard from "@/components/farmer/PaymentStatusCard";
import RecentNotifications from "@/components/farmer/RecentNotifications";
import {
  demoFarmer,
  demoNextStep,
  demoCentreStatus,
  procurementStages,
  demoCurrentStageIndex,
  demoPaymentStatus,
  demoNotifications,
} from "@/lib/demo/farmerDashboard";

/**
 * Farmer Dashboard — the real /farmer screen (replaces the Phase 2A
 * ComingSoon placeholder). UI ONLY: every value below comes from
 * lib/demo/farmerDashboard.ts, clearly labelled — no Supabase, no API
 * route, no real booking/payment/notification (docs/PROJECT_STATE.md).
 *
 * Server Component — nothing on this page needs client-side interaction
 * (unlike the Operator dashboard's local demo-state toggles in Phase 2B),
 * so it stays static/prerendered like the rest of the Phase 2A shell.
 *
 * Information hierarchy follows the phase instructions exactly: greeting
 * → Next Step → centre status → quick actions → procurement progress →
 * payment status → notifications.
 */
export default function FarmerDashboardPage() {
  return (
    <PageContainer>
      <div className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-ai-center ux4g-jc-between ux4g-gap-s">
        <PageHeader
          title={`Namaste, ${demoFarmer.firstName}`}
          description="Here's what's happening with your procurement booking."
        />
        <span
          className="ux4g-tag-outline-warning ux4g-tag-s"
          title="This screen has no backend yet — every value here is local, presentation-only demo data."
        >
          Demo data — not connected to a backend
        </span>
      </div>

      <div className="ux4g-d-flex ux4g-flex-col ux4g-gap-l">
        <NextStepCard
          centreName={demoNextStep.centreName}
          centreLocation={demoNextStep.centreLocation}
          dateLabel={demoNextStep.dateLabel}
          timeLabel={demoNextStep.timeLabel}
          token={demoNextStep.token}
          status={demoNextStep.status}
          farmersAhead={demoNextStep.farmersAhead}
          estimatedWaitMinutes={demoNextStep.estimatedWaitMinutes}
        />

        <FarmerCentreStatusCard
          status={demoCentreStatus.status}
          queueCount={demoCentreStatus.queueCount}
          processingRatePerHour={demoCentreStatus.processingRatePerHour}
          estimatedDelayMinutes={demoCentreStatus.estimatedDelayMinutes}
        />

        <QuickActions />

        <section aria-labelledby="procurement-progress-heading">
          <h2
            id="procurement-progress-heading"
            className="ux4g-heading-s-strong"
          >
            Procurement progress
          </h2>
          <p className="ux4g-body-s-default">
            Quality Check is assessed by centre staff when you arrive — this
            screen only shows where you are in the process, it does not
            decide quality itself.
          </p>
          <WorkflowStepper
            stages={procurementStages}
            currentIndex={demoCurrentStageIndex}
          />
        </section>

        <PaymentStatusCard status={demoPaymentStatus} />

        <RecentNotifications notifications={demoNotifications} />
      </div>
    </PageContainer>
  );
}
