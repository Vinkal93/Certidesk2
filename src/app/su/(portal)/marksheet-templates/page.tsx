import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listMarksheetTemplates } from "@/services/template-studio.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SuMarksheetTemplatesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su/login");

  const templates = await listMarksheetTemplates();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold">Marksheet Template Studio</h2>
        <p className="text-muted text-xs">
          Configure A4 marksheet headers, footers, and dynamic subject tables.
        </p>
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
                {tpl.columns.length} table columns · {tpl.orientation}
              </span>
              <Link
                href={`/su/marksheet-templates/${tpl.id}/editor`}
                className="text-primary font-semibold hover:underline"
              >
                Open Table Builder →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
