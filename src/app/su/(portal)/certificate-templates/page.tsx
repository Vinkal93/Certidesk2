import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listCertificateTemplates } from "@/services/template-studio.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function SuCertificateTemplatesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su/login");

  const templates = await listCertificateTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-bold">
            Certificate Template Studio
          </h2>
          <p className="text-muted text-xs">
            Design and publish A4 vector certificate templates for all institutes.
          </p>
        </div>
        <Link
          href="/su/certificate-templates/new"
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          + New Template
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {templates.map((tpl) => (
          <Card key={tpl.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{tpl.name}</CardTitle>
              <Badge variant={tpl.status === "published" ? "success" : "outline"}>
                {tpl.status} v{tpl.version}
              </Badge>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-xs">
              <span className="text-muted">
                A4 {tpl.orientation} ({tpl.widthMm}mm × {tpl.heightMm}mm)
              </span>
              <Link
                href={`/su/certificate-templates/${tpl.id}/editor`}
                className="text-primary font-semibold hover:underline"
              >
                Open Studio Editor →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
