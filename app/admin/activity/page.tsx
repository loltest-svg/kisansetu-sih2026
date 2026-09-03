import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function AdminActivityPage() {
  return (
    <PageContainer>
      <PageHeader
        title="System Activity"
        description="Recent bookings and status changes across all centres."
      />
      <ComingSoon />
    </PageContainer>
  );
}
