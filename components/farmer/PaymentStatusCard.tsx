import type { PaymentStatusValue } from "@/lib/demo/farmerDashboard";

const STATUS_TAG_CLASS: Record<PaymentStatusValue, string> = {
  PENDING: "ux4g-tag-tonal-neutral",
  PROCESSED: "ux4g-tag-filled-success",
};

/**
 * Status only — docs/BUSINESS_LOGIC.md: "'Payment status' tracking is
 * exactly that — a status field ... It is not payment processing." No
 * amount, no bank details, no "pay now" action anywhere in this
 * component, so there is nothing here that could be mistaken for a real
 * payment/banking flow.
 */
export default function PaymentStatusCard({
  status,
}: {
  status: PaymentStatusValue;
}) {
  return (
    <div className="ux4g-card ux4g-card-solid ux4g-card-vertical">
      <div className="ux4g-card-header">Payment status</div>
      <div className="ux4g-card-body ux4g-d-flex ux4g-flex-col ux4g-gap-s">
        <span className={`${STATUS_TAG_CLASS[status]} ux4g-tag-s`}>
          {status === "PENDING" ? "Payment pending" : "Payment processed"}
        </span>
        <p className="ux4g-body-s-default">
          This shows status only — payment itself is handled outside this
          application.
        </p>
      </div>
    </div>
  );
}
