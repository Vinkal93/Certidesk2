import { notFound, redirect } from "next/navigation";
import { AuthError, getSessionUser } from "@/lib/security/session";
import { getMarksheetTemplateById } from "@/services/template-studio.service";
import { MarksheetStudioClient } from "@/features/super-admin/components/marksheet-studio-client";

export default async function SuMarksheetTemplateEditorPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su/login");

  const { templateId } = await params;
  let tpl;
  try {
    tpl = await getMarksheetTemplateById(templateId);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) notFound();
    throw error;
  }

  return <MarksheetStudioClient initialTemplate={tpl} />;
}
