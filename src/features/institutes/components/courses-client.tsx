"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Edit3, Plus, RotateCcw, Search, Trash2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileFab, ResponsiveFormModal } from "@/components/ui/responsive-form-modal";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import type { CourseRecord, CourseSubject } from "@/types/academic";

export function CoursesClient({
  initialCourses,
  canWrite,
}: {
  initialCourses: CourseRecord[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [courses, setCourses] = React.useState(initialCourses);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showDeleted, setShowDeleted] = React.useState(false);

  // Modal state (Add / Edit)
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<CourseRecord | null>(null);

  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [durationMonths, setDurationMonths] = React.useState("12");
  const [monthlyFeeRupees, setMonthlyFeeRupees] = React.useState("500");
  const [admissionFeeRupees, setAdmissionFeeRupees] = React.useState("300");
  const [duration, setDuration] = React.useState("12 Months");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<"active" | "inactive">("active");
  const [subjects, setSubjects] = React.useState<CourseSubject[]>([
    { id: "sub_1", name: "", code: "SUB-01", order: 1, maxMarks: 100 },
  ]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = React.useState<CourseRecord | null>(null);
  const [deleteWarning, setDeleteWarning] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const parsedMonths = Math.max(0, Number(durationMonths) || 0);
  const parsedMonthly = Math.max(0, Number(monthlyFeeRupees) || 0);
  const parsedAdmission = Math.max(0, Number(admissionFeeRupees) || 0);
  const computedTuitionRupees = parsedMonths * parsedMonthly;
  const computedTotalRupees = computedTuitionRupees + parsedAdmission;

  const resetForm = () => {
    setEditingCourse(null);
    setName("");
    setCode("");
    setDurationMonths("12");
    setMonthlyFeeRupees("500");
    setAdmissionFeeRupees("300");
    setDuration("12 Months");
    setDescription("");
    setStatus("active");
    setError(null);
    setSubjects([{ id: "sub_1", name: "", code: "SUB-01", order: 1, maxMarks: 100 }]);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (course: CourseRecord) => {
    setEditingCourse(course);
    setName(course.name);
    setCode(course.code);
    const months = course.durationMonths ?? 12;
    const admRupees = (course.admissionFeePaise ?? 0) / 100;
    const monthlyRupees = course.monthlyFeePaise
      ? course.monthlyFeePaise / 100
      : Math.max(0, (course.feePaise / 100 - admRupees) / Math.max(1, months));
    setDurationMonths(String(months));
    setMonthlyFeeRupees(String(Math.round(monthlyRupees)));
    setAdmissionFeeRupees(String(Math.round(admRupees)));
    setDuration(course.duration);
    setDescription(course.description || "");
    setStatus(course.status === "inactive" ? "inactive" : "active");
    setSubjects(
      course.subjects.length > 0
        ? course.subjects
        : [{ id: "sub_1", name: "", code: "SUB-01", order: 1, maxMarks: 100 }]
    );
    setError(null);
    setModalOpen(true);
  };

  const addSubjectRow = () => {
    const nextOrder = subjects.length + 1;
    setSubjects((prev) => [
      ...prev,
      {
        id: `sub_${Date.now()}_${nextOrder}`,
        name: "",
        code: `SUB-0${nextOrder}`,
        order: nextOrder,
        maxMarks: 100,
      },
    ]);
  };

  const saveCourse = async (addAnother: boolean) => {
    setError(null);
    setLoading(true);
    try {
      const validSubjects = subjects.filter((s) => s.name.trim().length > 0);
      const payload = {
        name,
        code,
        duration: duration.trim() || `${parsedMonths || 1} Months`,
        durationMonths: parsedMonths > 0 ? parsedMonths : undefined,
        monthlyFeeRupees: parsedMonthly,
        admissionFeeRupees: parsedAdmission,
        feeRupees: computedTotalRupees,
        description,
        status,
        subjects: validSubjects,
      };

      const url = editingCourse
        ? `/api/institute/courses/${editingCourse.id}`
        : "/api/institute/courses";
      const method = editingCourse ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { course: CourseRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to save course.");
        return;
      }

      if (editingCourse) {
        setCourses((prev) =>
          prev.map((c) => (c.id === editingCourse.id ? json.data!.course : c))
        );
        setModalOpen(false);
      } else {
        setCourses((prev) => [json.data!.course, ...prev]);
        if (addAnother) {
          resetForm();
        } else {
          setModalOpen(false);
        }
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDeleted = async () => {
    const next = !showDeleted;
    setShowDeleted(next);
    const res = await fetch(`/api/institute/courses?includeDeleted=${next ? "1" : "0"}`, {
      cache: "no-store",
    });
    const json = (await res.json()) as {
      ok: boolean;
      data?: { courses: CourseRecord[] };
    };
    if (res.ok && json.ok && json.data) {
      setCourses(json.data.courses);
    }
  };

  const handleConfirmDelete = async (reason: string, force: boolean) => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/institute/courses/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, force }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: { code?: string; message?: string };
      };
      if (!res.ok || !json.ok) {
        if (json.error?.code === "DEPENDENCY_CONFLICT") {
          setDeleteWarning(json.error.message ?? "Dependencies exist.");
          return;
        }
        setDeleteWarning(json.error?.message ?? "Failed to delete course.");
        return;
      }
      setCourses((prev) =>
        showDeleted
          ? prev.map((c) =>
              c.id === deleteTarget.id
                ? { ...c, status: "deleted", deletionReason: reason }
                : c
            )
          : prev.filter((c) => c.id !== deleteTarget.id)
      );
      setDeleteTarget(null);
      setDeleteWarning(null);
      router.refresh();
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestore = async (course: CourseRecord) => {
    const res = await fetch(`/api/institute/courses/${course.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    const json = (await res.json()) as {
      ok: boolean;
      data?: { course: CourseRecord };
    };
    if (res.ok && json.ok && json.data) {
      setCourses((prev) => prev.map((c) => (c.id === course.id ? json.data!.course : c)));
      router.refresh();
    }
  };

  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.duration.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-foreground text-xl font-bold tracking-tight">
            Courses &amp; Subjects
          </h2>
          <p className="text-muted text-xs">
            Unique course codes, monthly fee structure, custom subjects, and soft-delete
            protection.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleToggleDeleted()}
          >
            {showDeleted ? "Hide Deleted" : "Show Deleted"}
          </Button>
          {canWrite && (
            <Button
              type="button"
              size="sm"
              className="hidden sm:inline-flex"
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              onClick={openCreateModal}
            >
              Add Course
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Search course name or code..."
          leftAddon={<Search className="h-4 w-4" aria-hidden="true" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Course Cards Grid */}
      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="text-muted py-12 text-center text-sm">
            No courses found. Click <strong>Add Course</strong> to create your first
            course.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredCourses.map((course) => (
            <Card key={course.id}>
              <CardHeader className="border-border flex flex-row items-start justify-between gap-3 border-b pb-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{course.code}</Badge>
                    <Badge
                      variant={
                        course.status === "active"
                          ? "success"
                          : course.status === "deleted"
                            ? "danger"
                            : "default"
                      }
                    >
                      {course.status}
                    </Badge>
                    <Badge variant="outline">
                      <Users className="mr-1 h-3 w-3" aria-hidden="true" />
                      {course.enrolledCount ?? 0} students
                    </Badge>
                  </div>
                  <CardTitle className="mt-2 truncate">{course.name}</CardTitle>
                  <p className="text-muted mt-0.5 text-xs">
                    Duration: {course.duration} &bull; Total Fee: ₹
                    {(course.feePaise / 100).toFixed(2)}
                    {course.monthlyFeePaise ? (
                      <>
                        {" "}
                        ({course.durationMonths ?? "?"}m &times; ₹
                        {(course.monthlyFeePaise / 100).toFixed(0)}
                        {course.admissionFeePaise
                          ? ` + ₹${(course.admissionFeePaise / 100).toFixed(0)} adm.`
                          : ""}
                        )
                      </>
                    ) : null}
                  </p>
                </div>

                {canWrite && (
                  <div className="flex shrink-0 items-center gap-1">
                    {course.status === "deleted" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        }
                        onClick={() => void handleRestore(course)}
                      >
                        Restore
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(course)}
                          aria-label={`Edit ${course.name}`}
                        >
                          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteWarning(
                              (course.enrolledCount ?? 0) > 0
                                ? `${course.enrolledCount} active student(s) are enrolled in ${course.name}.`
                                : null
                            );
                            setDeleteTarget(course);
                          }}
                          aria-label={`Delete ${course.name}`}
                        >
                          <Trash2 className="text-danger h-4 w-4" aria-hidden="true" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-4 text-sm">
                {course.description && (
                  <p className="text-muted mb-3 text-xs">{course.description}</p>
                )}
                <p className="text-muted mb-2 text-xs font-semibold uppercase">
                  Custom Subjects ({course.subjects.length})
                </p>
                {course.subjects.length === 0 ? (
                  <p className="text-muted text-xs">No subjects added.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {course.subjects.map((sub) => (
                      <Badge key={sub.id} variant="primary">
                        {sub.order}. {sub.name} ({sub.maxMarks}m)
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Mobile Floating Action Button */}
      {canWrite && <MobileFab label="Add Course" onClick={openCreateModal} />}

      {/* Add / Edit Course Modal */}
      <ResponsiveFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCourse ? `Edit Course — ${editingCourse.code}` : "Add New Course"}
        subtitle="Set monthly fee, duration, admission fee, and custom subjects."
      >
        {error && (
          <div
            role="alert"
            className="bg-danger-soft text-danger mb-4 flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs dark:border-red-800/60"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveCourse(false);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Course Name"
              placeholder="e.g. ADCA / O Level"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Course Code (Unique)"
              placeholder="e.g. ADCA"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label="Duration (Months)"
              type="number"
              min="1"
              max="120"
              placeholder="12"
              value={durationMonths}
              onChange={(e) => {
                setDurationMonths(e.target.value);
                const m = Number(e.target.value);
                if (m > 0) setDuration(`${m} Months`);
              }}
              required
            />
            <Input
              label="Monthly Fee (₹)"
              type="number"
              min="0"
              placeholder="500"
              value={monthlyFeeRupees}
              onChange={(e) => setMonthlyFeeRupees(e.target.value)}
              required
            />
            <Input
              label="Admission Fee (₹)"
              type="number"
              min="0"
              placeholder="300"
              value={admissionFeeRupees}
              onChange={(e) => setAdmissionFeeRupees(e.target.value)}
            />
          </div>

          <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-xs">
            <span className="text-muted">
              Auto Calculation:{" "}
              <strong className="text-foreground">
                {parsedMonths} &times; ₹{parsedMonthly.toLocaleString("en-IN")}
              </strong>{" "}
              = ₹{computedTuitionRupees.toLocaleString("en-IN")} + ₹
              {parsedAdmission.toLocaleString("en-IN")} admission
            </span>
            <span className="text-primary text-sm font-bold tabular-nums">
              Total: ₹{computedTotalRupees.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Duration Label"
              placeholder="12 Months"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
              options={[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ]}
            />
          </div>
          <Textarea
            label="Description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="border-border space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <p className="text-foreground text-xs font-semibold uppercase">Subjects</p>
              <Button type="button" variant="outline" size="sm" onClick={addSubjectRow}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Subject
              </Button>
            </div>
            {subjects.map((sub, idx) => (
              <div key={sub.id} className="flex items-center gap-2">
                <Input
                  placeholder={`Subject ${idx + 1}`}
                  value={sub.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSubjects((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                    );
                  }}
                />
                <Input
                  type="number"
                  className="w-20"
                  value={String(sub.maxMarks)}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 100;
                    setSubjects((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, maxMarks: val } : item
                      )
                    );
                  }}
                />
                {subjects.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSubjects((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="text-danger h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="border-border flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            {!editingCourse && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={loading}
                onClick={() => void saveCourse(true)}
              >
                Save &amp; Add Another
              </Button>
            )}
            <Button type="submit" size="sm" loading={loading}>
              {editingCourse ? "Update Course" : "Save Course"}
            </Button>
          </div>
        </form>
      </ResponsiveFormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteWarning(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Course"
        recordLabel={deleteTarget ? `${deleteTarget.name} (${deleteTarget.code})` : ""}
        affectedSummary="Soft-deletes this course from active listings while preserving historical student enrollments and fee receipts. Can be restored later."
        dependencyWarning={deleteWarning}
        requireForceCheckbox={Boolean(deleteWarning)}
        loading={deleteLoading}
      />
    </div>
  );
}
