/**
 * One KPI card — reused for every value in the "Key Operational Metrics"
 * row (farmers waiting, remaining capacity, processing rate, etc). Kept
 * generic and data-free on purpose: it renders whatever numbers the page
 * passes it, it doesn't know where they come from.
 */
export default function OperationalMetricCard({
  label,
  value,
  unit,
  sublabel,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sublabel?: string;
}) {
  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-body">
        <p className="ux4g-label-m-default">{label}</p>
        <p className="ux4g-heading-l-strong">
          {value}
          {unit ? (
            <span className="ux4g-label-l-default"> {unit}</span>
          ) : null}
        </p>
        {sublabel ? (
          <p className="ux4g-body-s-default">{sublabel}</p>
        ) : null}
      </div>
    </div>
  );
}
