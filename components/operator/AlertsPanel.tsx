import type { AlertItem } from "@/lib/demo/operatorDashboard";

const ALERT_CLASS: Record<AlertItem["severity"], string> = {
  info: "ux4g-alert-info",
  warning: "ux4g-alert-warning",
  error: "ux4g-alert-error",
};

/**
 * Attention-required feed. These are presentation/demo alerts (see
 * lib/demo/operatorDashboard.ts) — nothing here represents a real
 * operational event.
 */
export default function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">Alerts &amp; attention required</div>
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-s">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`ux4g-alert ${ALERT_CLASS[alert.severity]}`}
              role="status"
            >
              <span className="ux4g-body-s-default">
                {alert.message}{" "}
                <span className="ux4g-body-xs-default">{alert.timeLabel}</span>
              </span>
            </div>
          ))
        ) : (
          <p className="ux4g-body-m-default">
            No alerts — nothing needs attention right now.
          </p>
        )}
      </div>
    </div>
  );
}
