import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { buildDefaultCertificateTemplate } from "@/services/template-studio.service";
import { CertificateStudioClient } from "@/features/super-admin/components/certificate-studio-client";

export default async function SuNewCertificateTemplatePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su/login");

  const tpl = buildDefaultCertificateTemplate(user.uid);
  return (
    <CertificateStudioClient
      initialTemplate={{
        ...tpl,
        id: "",
        name: "Custom Certificate Template",
        status: "draft",
        version: 0,
      }}
    />
  );
}
