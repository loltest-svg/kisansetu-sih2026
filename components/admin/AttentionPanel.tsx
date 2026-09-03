import Link from "next/link";
import {
  getAttentionState,
  ATTENTION_LABEL,
  ATTENTION_TAG_CLASS,
  type CentreSummary,
} from "@/lib/demo/adminDashboard";

/**
 * "Centres requiring attention" — the exception-oriented view Phase 2D
 * asks for (system-wide → monitoring-focused → exception-oriented,
 * distinct from the Operator dashboard's queue-focused density). Only
 * lists centres whose attention state isn't NORMAL.
 */
export default function AttentionPanel({
  centres,
}: {
  centres: CentreSummary[];
}) {
  const flagged = centres.filter((c) => getAttentionState(c) !== "NORMAL");

  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">Centres requiring attention</div>
      <div className="ux4g-card-body">
        {flagged.length > 0 ? (
          <ul className="ux4g-list ux4g-list-default ux4g-list-m">
            {flagged.map((centre) => {
              const state = getAttentionState(centre);
              return (
                <li key={centre.id} className="ux4g-list-item">
                  <Link
                    href="/admin/centres"
                    className="ux4g-list-item-row"
                  >
                    <span className="ux4g-list-item-start ux4g-d-flex ux4g-flex-col">
                      <span className="ux4g-label-l-default">
                        {centre.name}
                      </span>
                      <span className="ux4g-body-xs-default">
                        {centre.location}
                      </span>
                    </span>
                    <span className="ux4g-list-item-end">
                      <span className={`${ATTENTION_TAG_CLASS[state]} ux4g-tag-s`}>
                        {ATTENTION_LABEL[state]}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="ux4g-body-m-default">
            No centres currently need attention.
          </p>
        )}
      </div>
    </div>
  );
}
