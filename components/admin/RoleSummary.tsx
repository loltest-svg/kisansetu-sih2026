/**
 * Visually acknowledges the approved role hierarchy (Master Admin →
 * Centre Admin → Centre Operator → Farmer) without building user
 * management — per Phase 2D's explicit instruction: presentation only,
 * the real user/role database is a later backend-phase concern.
 */
export default function RoleSummary({
  centreAdminCount,
  operatorCount,
  totalCentres,
}: {
  centreAdminCount: number;
  operatorCount: number;
  totalCentres: number;
}) {
  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">Oversight</div>
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-s">
        <p className="ux4g-body-s-default">
          As Master Admin, you oversee every Centre Admin and Centre
          Operator across all procurement centres.
        </p>
        <dl className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-gap-l ux4g-p-none">
          <div>
            <dt className="ux4g-label-m-default">Centre Admins</dt>
            <dd className="ux4g-body-m-default">{centreAdminCount}</dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Centre Operators</dt>
            <dd className="ux4g-body-m-default">{operatorCount}</dd>
          </div>
          <div>
            <dt className="ux4g-label-m-default">Procurement centres</dt>
            <dd className="ux4g-body-m-default">{totalCentres}</dd>
          </div>
        </dl>
        <p className="ux4g-body-xs-default">
          Centre Admin/Operator account management is not built yet — this
          is a presentation-only summary (docs/PROJECT_STATE.md).
        </p>
      </div>
    </div>
  );
}
