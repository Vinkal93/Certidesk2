import { redirect } from "next/navigation";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { listCourses } from "@/services/academic.service";
import { listInstituteStudyMaterials } from "@/services/study-material.service";
import { StudyMaterialClient } from "@/features/institutes/components/study-material-client";

export default async function InstituteStudyMaterialPage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) redirect("/login/institute");

  const [materials, courses] = await Promise.all([
    listInstituteStudyMaterials(user),
    listCourses(user),
  ]);

  return (
    <StudyMaterialClient
      initialMaterials={materials}
      courseNames={courses.map((c) => c.name)}
      canWrite={hasStaffPermission(user, "courses:write")}
    />
  );
}
