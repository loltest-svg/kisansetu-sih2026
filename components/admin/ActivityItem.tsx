import type { ActivityItem as ActivityItemType } from "@/lib/demo/adminDashboard";

/**
 * One audit-style entry: what happened, where, who, when — the four
 * pieces of context the phase instructions require. This is a *demo*
 * activity feed (see the note rendered above the list in
 * app/admin/activity/page.tsx) — not a real audit trail. No personal
 * data beyond a role label + first name for the actor, matching the
 * "actor" shape already used in lib/demo/operatorDashboard.ts.
 */
export default function ActivityItem({ item }: { item: ActivityItemType }) {
  return (
    <li className="ux4g-list-item">
      <div className="ux4g-list-item-row">
        <span className="ux4g-list-item-start ux4g-d-flex ux4g-flex-col">
          <span className="ux4g-label-l-default">{item.message}</span>
          <span className="ux4g-body-xs-default">
            {item.centreName} · {item.actor}
          </span>
        </span>
        <span className="ux4g-list-item-end ux4g-body-xs-default">
          {item.timeLabel}
        </span>
      </div>
    </li>
  );
}
