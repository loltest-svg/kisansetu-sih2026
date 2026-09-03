import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import ComingSoon from "@/components/shell/ComingSoon";

export default function FarmerLiveQueuePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Live Queue"
        description="Your queue position and estimated wait time, updated live via Supabase Realtime."
      />
      <ComingSoon note="Realtime is not wired up yet — this is navigation only." />
    </PageContainer>
  );
}
