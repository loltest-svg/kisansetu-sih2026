import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ActivityFeed from "@/components/admin/ActivityFeed";
import { demoActivity } from "@/lib/demo/adminDashboard";

export default function AdminActivityPage() {
  return (
    <PageContainer>
      <div className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-ai-center ux4g-jc-between ux4g-gap-s">
        <PageHeader
          title="System Activity"
          description="A preview of the future audit trail across all centres."
        />
        <span
          className="ux4g-tag-outline-warning ux4g-tag-s"
          title="This is not a real audit log — every entry here is local, presentation-only demo data."
        >
          Demo data — not a real audit trail
        </span>
      </div>
      <ActivityFeed items={demoActivity} />
    </PageContainer>
  );
}
