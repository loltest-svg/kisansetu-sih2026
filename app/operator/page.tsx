"use client";

import { useState } from "react";
import Link from "next/link";
import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import CentreStatusCard from "@/components/operator/CentreStatusCard";
import OperationalMetricCard from "@/components/operator/OperationalMetricCard";
import CurrentProcessingCard from "@/components/operator/CurrentProcessingCard";
import LiveQueue from "@/components/operator/LiveQueue";
import CapacityCard from "@/components/operator/CapacityCard";
import UpcomingBookings from "@/components/operator/UpcomingBookings";
import AlertsPanel from "@/components/operator/AlertsPanel";
import DailySummary from "@/components/operator/DailySummary";
import {
  demoCentre,
  demoMetrics,
  demoCapacity,
  demoUpcomingBookings,
  demoAlerts,
  demoDailySummary,
  processingStages,
  initialCentreStatus,
  initialQueue,
  initialProcessingStageIndex,
  type CentreStatusValue,
  type QueueItem,
  type BookingItem,
} from "@/lib/demo/operatorDashboard";

/**
 * Centre Operations Dashboard — the real /operator screen (replaces the
 * Phase 2A ComingSoon placeholder).
 *
 * UI ONLY, per Phase 2B scope: no Supabase, no API route, no persistence.
 * State below is local-only React state seeded from
 * lib/demo/operatorDashboard.ts's presentation data; "Call Next", "Check
 * In", "Complete Processing", "Pause/Resume Centre" and "Report Delay" all
 * mutate that local state so the intended interaction is visible and
 * honest, and reset on reload — none of them call an API or claim to
 * change real system state (docs/PROJECT_STATE.md — Data Honesty).
 *
 * This page is a Client Component (unlike the Phase 2A stub pages)
 * because the interactive demo state needs to be shared across
 * CentreStatusCard, CurrentProcessingCard and LiveQueue; the shell around
 * it (AppShell/Sidebar/NavDrawer/PageContainer/PageHeader) is unchanged
 * and stays exactly as Phase 2A left it.
 */
export default function OperatorDashboardPage() {
  const [status, setStatus] = useState<CentreStatusValue>(initialCentreStatus);
  const [delayReason, setDelayReason] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [stageIndex, setStageIndex] = useState(initialProcessingStageIndex);
  const [bookings, setBookings] = useState<BookingItem[]>(demoUpcomingBookings);

  const currentItem = queue.find((q) => q.status === "PROCESSING") ?? null;
  const processingNow = currentItem ? 1 : 0;

  function handlePause() {
    setStatus("PAUSED");
  }

  function handleResume() {
    setStatus("OPEN");
    setDelayReason(null);
  }

  function handleReportDelay(reason: string) {
    setStatus("DELAYED");
    setDelayReason(reason);
  }

  function handleCallNext() {
    setQueue((prev) => {
      const nextWaitingIndex = prev.findIndex((q) => q.status === "WAITING");
      if (nextWaitingIndex === -1) return prev;
      return prev.map((q, i) =>
        i === nextWaitingIndex ? { ...q, status: "PROCESSING", etaMinutes: null } : q
      );
    });
    // A newly-called farmer's in-person journey nominally starts at
    // Check-in (Registration/Slot Booking already happened earlier,
    // online) — see processingStages in lib/demo/operatorDashboard.ts.
    setStageIndex(processingStages.findIndex((s) => s.key === "CHECK_IN"));
  }

  function handleCompleteProcessing() {
    setQueue((prev) =>
      prev.map((q) =>
        q.status === "PROCESSING" ? { ...q, status: "COMPLETED" } : q
      )
    );
    setStageIndex(0);
  }

  function handleCheckInNext() {
    setBookings((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setQueue((q) => [
        ...q,
        {
          id: `checked-in-${next.id}`,
          token: next.token,
          farmerName: next.farmerName,
          maskedPhone: "98XXXXXX••",
          status: "WAITING",
          etaMinutes: (q.filter((x) => x.status === "WAITING").length + 1) * 8,
          crop: next.crop,
          quantityQuintal: next.quantityQuintal,
        },
      ]);
      return rest;
    });
  }

  return (
    <PageContainer>
      <div className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-ai-center ux4g-jc-between ux4g-gap-s">
        <PageHeader
          title="Centre Operations Dashboard"
          description={`${demoCentre.name} · ${demoCentre.location} · Today`}
        />
        <span
          className="ux4g-tag-outline-warning ux4g-tag-s"
          title="This screen has no backend yet — every value and action here is local, presentation-only demo state."
        >
          Demo data — not connected to a backend
        </span>
      </div>

      <div className="ux4g-d-flex ux4g-flex-col ux4g-gap-l">
        <CentreStatusCard
          status={status}
          centreName={demoCentre.name}
          centreLocation={demoCentre.location}
          processingRatePerHour={demoMetrics.processingRatePerHour}
          estimatedDelayMinutes={demoMetrics.estimatedDelayMinutes}
          delayReason={delayReason}
          onPause={handlePause}
          onResume={handleResume}
          onReportDelay={handleReportDelay}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 ux4g-gap-m">
          <OperationalMetricCard
            label="Farmers waiting"
            value={queue.filter((q) => q.status === "WAITING").length}
          />
          <OperationalMetricCard label="Processing now" value={processingNow} />
          <OperationalMetricCard
            label="Today's capacity"
            value={demoMetrics.todaysCapacityQuintal}
            unit="Quintal"
          />
          <OperationalMetricCard
            label="Remaining capacity"
            value={demoCapacity.remainingQuintal}
            unit="Quintal"
          />
        </div>

        <CurrentProcessingCard
          item={currentItem}
          stages={processingStages}
          stageIndex={stageIndex}
          onComplete={handleCompleteProcessing}
        />

        <LiveQueue items={queue} onCallNext={handleCallNext} />

        <div className="grid grid-cols-1 lg:grid-cols-2 ux4g-gap-l">
          <CapacityCard
            totalQuintal={demoMetrics.todaysCapacityQuintal}
            bookedQuintal={demoMetrics.bookedQuintal}
            remainingQuintal={demoCapacity.remainingQuintal}
            utilizationPercent={demoCapacity.utilizationPercent}
          />
          <UpcomingBookings bookings={bookings} onCheckInNext={handleCheckInNext} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 ux4g-gap-l">
          <AlertsPanel alerts={demoAlerts} />
          <DailySummary
            avgWaitMinutes={demoDailySummary.avgWaitMinutes}
            peakQueueCount={demoDailySummary.peakQueueCount}
            peakQueueTimeLabel={demoDailySummary.peakQueueTimeLabel}
            centreUptimeLabel={demoDailySummary.centreUptimeLabel}
          />
        </div>

        <div className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-s">
          <Link href="/operator/queue" className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-md">
            View Queue
          </Link>
          <Link href="/operator/bookings" className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-md">
            View Bookings
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
