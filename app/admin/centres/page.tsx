import PageContainer from "@/components/shell/PageContainer";
import PageHeader from "@/components/shell/PageHeader";
import CentreManagementCard from "@/components/admin/CentreManagementCard";
import { demoCentres } from "@/lib/demo/adminDashboard";

/**
 * Centre Management — structured for the FUTURE ability to view/create/
 * edit/activate centres (phase instructions), but every action here is a
 * UI representation only this phase: no persistence, no fake API calls,
 * no fake "saved successfully" messages. See CentreManagementCard for
 * exactly what each control does today.
 */
export default function AdminCentresPage() {
  return (
    <PageContainer>
      <div className="ux4g-d-flex ux4g-flex-row ux4g-flex-wrap ux4g-ai-center ux4g-jc-between ux4g-gap-s">
        <PageHeader
          title="Centres"
          description="All procurement centres, their assigned Centre Admin, and operational status."
        />
        <button
          type="button"
          className="ux4g-btn ux4g-btn-primary ux4g-btn-md"
          disabled
          title="Creating a new centre is not implemented yet"
        >
          Create centre
        </button>
      </div>
      <div className="ux4g-d-flex ux4g-flex-col ux4g-gap-m">
        {demoCentres.map((centre) => (
          <CentreManagementCard key={centre.id} centre={centre} />
        ))}
      </div>
    </PageContainer>
  );
}
