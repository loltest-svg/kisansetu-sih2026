/**
 * Page title/context area — one per page, rendered inside PageContainer.
 * `title` renders as the page's single <h1> (heading hierarchy starts
 * here; Header's platform name is not a heading).
 */
export default function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="ux4g-p-none">
      <h1 className="ux4g-heading-l-strong">{title}</h1>
      {description ? (
        <p className="ux4g-body-m-default">{description}</p>
      ) : null}
    </div>
  );
}
