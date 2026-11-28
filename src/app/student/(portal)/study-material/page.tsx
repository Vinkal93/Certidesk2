import { redirect } from "next/navigation";
import { BookOpen, ExternalLink, FileText, Link2, Video } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { listStudentStudyMaterials } from "@/services/study-material.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StudentStudyMaterialPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") {
    redirect("/login/student");
  }

  const materials = await listStudentStudyMaterials(user);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Study Material ({materials.length})
        </h2>
        <p className="text-muted text-xs">
          Documents, notes, channels, and learning links shared by your institute.
        </p>
      </div>

      {materials.length === 0 ? (
        <Card>
          <CardContent className="text-muted py-12 text-center text-sm">
            No study material has been uploaded by your institute yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {materials.map((item) => (
            <Card key={item.id}>
              <CardHeader className="border-border border-b pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="primary">{item.materialType.toUpperCase()}</Badge>
                  <Badge variant="outline">{item.courseName}</Badge>
                </div>
                <CardTitle className="mt-2 text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-3 text-xs">
                {item.description && (
                  <p className="text-muted leading-relaxed">{item.description}</p>
                )}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary hover:bg-primary-dark inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-semibold text-white transition-colors"
                >
                  {item.materialType === "document" ? (
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : item.materialType === "video" ? (
                    <Video className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : item.materialType === "channel" ? (
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Open Study Material
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
