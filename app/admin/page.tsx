import type { CSSProperties } from "react";
import Link from "next/link";
import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import MetricCard from "@/components/shared/MetricCard";
import CentreOverviewCard from "@/components/admin/CentreOverviewCard";
import AttentionPanel from "@/components/admin/AttentionPanel";
import RoleSummary from "@/components/admin/RoleSummary";
import ActivityFeed from "@/components/admin/ActivityFeed";
import {
  demoCentres,
  demoActivity,
  systemOverview,
} from "@/lib/demo/adminDashboard";

const STATUS_TAG_CLASS: Record<string, string> = {
  OPEN: "ux4g-tag-filled-success",
  DELAYED: "ux4g-tag-filled-warning",
  PAUSED: "ux4g-tag-tonal-neutral",
  FULL: "ux4g-tag-outline-warning",
  CLOSED: "ux4g-tag-filled-error",
};

/**
 * Master Admin Dashboard — the real /admin screen, replacing the Phase 2A
 * ComingSoon placeholder. System-wide and monitoring-focused, deliberately
 * NOT a copy of the Operator dashboard with a new title: no single-centre
 * queue, no per-farmer processing, no operator-style status controls —
 * only cross-centre aggregates, the exception list, and the audit feed
 * (docs/PROJECT_STATE.md role-hierarchy note: Master Admin oversees, it
 * does not run day-to-day centre operations).
 *
 * UI ONLY — every value below comes from lib/demo/adminDashboard.ts,
 * clearly labelled. No Supabase, no API route, no real audit trail.
 *
 * Server Component — nothing here needs client interaction (unlike
 * CentreManagementCard on /admin/centres), so it stays static/
 * prerendered like the rest of the shell.
 */
export default function AdminOverviewPage() {
  const utilPercent = Math.round(
    (systemOverview.totalBookedQuintal / systemOverview.totalCapacityQuintal) *
      100
  );
  const utilFillStyle = {
    "--ux4g-progress-value": utilPercent,
  } as CSSProperties;

  const statusCounts = (
    ["OPEN", "DELAYED", "PAUSED", "FULL", "CLOSED"] as const
  ).map((status) => ({
    status,
    count: demoCentres.filter((c) => c.status === status).length,
  }));

  return (
    <PageContainer>
      <div className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-ai-center ux4g-jc-between ux4g-gap-s">
        <PageHeader
          title="System Overview"
          description="What is happening across all procurement centres right now."
        />
        <span
          className="ux4g-tag-outline-warning ux4g-tag-s"
          title="This screen has no backend yet — every value here is local, presentation-only demo data."
        >
          Demo data — not connected to a backend
        </span>
      </div>

      <div className="ux4g-d-flex ux4g-flex-col ux4g-gap-l">
        <div className="grid grid-cols-2 lg:grid-cols-5 ux4g-gap-m">
          <MetricCard
            label="Procurement centres"
            value={systemOverview.totalCentres}
          />
          <MetricCard
            label="Centres open"
            value={systemOverview.centresOpen}
          />
          <MetricCard
            label="Farmers waiting"
            value={systemOverview.farmersWaitingTotal}
            sublabel="system-wide"
          />
          <MetricCard
            label="Total capacity"
            value={systemOverview.totalCapacityQuintal}
            unit="Quintal"
          />
          <MetricCard
            label="Centres needing attention"
            value={systemOverview.centresRequiringAttention}
          />
        </div>

        <section aria-labelledby="centre-status-overview-heading">
          <h2
            id="centre-status-overview-heading"
            className="ux4g-heading-s-strong"
          >
            Centre status overview
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 ux4g-gap-m">
            {demoCentres.map((centre) => (
              <CentreOverviewCard key={centre.id} centre={centre} />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 ux4g-gap-l">
          <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
            <div className="ux4g-card-header">Centres by status</div>
            <div className="ux4g-card-body">
              <ul className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-m ux4g-p-none">
                {statusCounts.map(({ status, count }) => (
                  <li key={status} className="ux4g-d-flex ux4g-flex-col ux4g-gap-2xs">
                    <span className={`${STATUS_TAG_CLASS[status]} ux4g-tag-s`}>
                      {status}
                    </span>
                    <span className="ux4g-title-m-strong">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
            <div className="ux4g-card-header">System-wide capacity</div>
            <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-s">
              <div
                className="ux4g-progress-bar"
                role="progressbar"
                aria-valuenow={utilPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="System-wide capacity utilised today"
              >
                <div className="ux4g-progress-bar-fill" style={utilFillStyle} />
              </div>
              <p className="ux4g-body-s-default">
                {utilPercent}% utilised — {systemOverview.totalBookedQuintal}{" "}
                of {systemOverview.totalCapacityQuintal} Quintal booked
                across all centres
              </p>
            </div>
          </div>
        </div>

        <AttentionPanel centres={demoCentres} />

        <RoleSummary
          centreAdminCount={systemOverview.centreAdminCount}
          operatorCount={systemOverview.operatorCount}
          totalCentres={systemOverview.totalCentres}
        />

        <div>
          <ActivityFeed items={demoActivity.slice(0, 5)} />
          <Link
            href="/admin/activity"
            className="ux4g-btn ux4g-btn-text-primary ux4g-btn-md"
          >
            View all activity
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
