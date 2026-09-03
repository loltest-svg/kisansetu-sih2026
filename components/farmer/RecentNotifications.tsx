import type { NotificationItem } from "@/lib/demo/farmerDashboard";

/**
 * Presentation/demo notifications only — there is no SMS/push integration
 * yet (docs/PROJECT.md: SMS starts as a mockable abstraction). Nothing
 * here was actually sent to the farmer.
 */
export default function RecentNotifications({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">Recent notifications</div>
      <div className="ux4g-card-body">
        {notifications.length > 0 ? (
          <ul className="ux4g-list ux4g-list-default ux4g-list-m">
            {notifications.map((n) => (
              <li key={n.id} className="ux4g-list-item">
                <div className="ux4g-list-item-row">
                  <span className="ux4g-list-item-start ux4g-body-s-default">
                    {n.message}
                  </span>
                  <span className="ux4g-list-item-end ux4g-body-xs-default">
                    {n.timeLabel}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ux4g-body-m-default">No notifications.</p>
        )}
      </div>
    </div>
  );
}
