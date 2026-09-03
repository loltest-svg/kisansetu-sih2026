/**
 * One KPI card — a plain, role-agnostic value display. Used across the
 * Operator dashboard's "Key Operational Metrics" row (Phase 2B) and the
 * Farmer dashboard's "Farmers Ahead"/"Estimated Wait" stats (Phase 2C).
 * Kept generic and data-free on purpose: it renders whatever the caller
 * passes it, it doesn't know where the numbers come from.
 */
export default function MetricCard({
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
