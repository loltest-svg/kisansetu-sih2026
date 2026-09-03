/**
 * Compact end-of-context operational summary — deliberately kept to
 * operational stats (wait time, queue peak, uptime), not financial/
 * analytics content, per docs/UI_SPEC.md's "Today's Summary" note (the
 * screenshot's "Farmer Satisfaction" rating and PDF/Excel export are
 * explicitly NOT REQUIRED FOR MVP and are not reproduced here).
 */
export default function DailySummary({
  avgWaitMinutes,
  peakQueueCount,
  peakQueueTimeLabel,
  centreUptimeLabel,
}: {
  avgWaitMinutes: number;
  peakQueueCount: number;
  peakQueueTimeLabel: string;
  centreUptimeLabel: string;
}) {
  const stats = [
    { label: "Avg. wait time", value: `${avgWaitMinutes} min` },
    {
      label: "Peak queue",
      value: `${peakQueueCount} farmers`,
      sublabel: `at ${peakQueueTimeLabel}`,
    },
    { label: "Centre uptime", value: centreUptimeLabel },
  ];

  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">Today&apos;s summary</div>
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-l">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="ux4g-label-m-default">{stat.label}</p>
            <p className="ux4g-title-m-strong">{stat.value}</p>
            {stat.sublabel ? (
              <p className="ux4g-body-xs-default">{stat.sublabel}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
