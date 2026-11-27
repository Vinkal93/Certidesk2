import { notFound, redirect } from "next/navigation";
import { AuthError, getSessionUser } from "@/lib/security/session";
import { getCertificateTemplateById } from "@/services/template-studio.service";
import { CertificateStudioClient } from "@/features/super-admin/components/certificate-studio-client";

export default async function SuCertificateTemplateEditorPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su/login");

  const { templateId } = await params;
  let tpl;
  try {
    tpl = await getCertificateTemplateById(templateId);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) notFound();
    throw error;
  }

  return <CertificateStudioClient initialTemplate={tpl} />;
}
