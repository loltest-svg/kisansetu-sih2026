import ActivityItem from "@/components/admin/ActivityItem";
import type { ActivityItem as ActivityItemType } from "@/lib/demo/adminDashboard";

export default function ActivityFeed({
  items,
}: {
  items: ActivityItemType[];
}) {
  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">Recent activity</div>
      <div className="ux4g-card-body">
        {items.length > 0 ? (
          <ul className="ux4g-list ux4g-list-default ux4g-list-m">
            {items.map((item) => (
              <ActivityItem key={item.id} item={item} />
            ))}
          </ul>
        ) : (
          <p className="ux4g-body-m-default">No recent activity.</p>
        )}
      </div>
    </div>
  );
}
