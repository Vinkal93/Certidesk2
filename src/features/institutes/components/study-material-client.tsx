"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileText,
  Link2,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileFab, ResponsiveFormModal } from "@/components/ui/responsive-form-modal";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import type {
  StudyMaterialRecord,
  StudyMaterialType,
} from "@/services/study-material.service";

export function StudyMaterialClient({
  initialMaterials,
  courseNames,
  canWrite,
}: {
  initialMaterials: StudyMaterialRecord[];
  courseNames: string[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [materials, setMaterials] = React.useState(initialMaterials);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<StudyMaterialRecord | null>(null);
  const [title, setTitle] = React.useState("");
  const [materialType, setMaterialType] = React.useState<StudyMaterialType>("link");
  const [url, setUrl] = React.useState("");
  const [courseName, setCourseName] = React.useState("All Courses");
  const [description, setDescription] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<StudyMaterialRecord | null>(
    null
  );

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setMaterialType("link");
    setUrl("");
    setCourseName("All Courses");
    setDescription("");
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item: StudyMaterialRecord) => {
    setEditing(item);
    setTitle(item.title);
    setMaterialType(item.materialType);
    setUrl(item.url);
    setCourseName(item.courseName);
    setDescription(item.description);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const endpoint = editing
        ? `/api/institute/study-material/${editing.id}`
        : "/api/institute/study-material";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          materialType,
          url,
          courseName,
          description,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { material: StudyMaterialRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to save study material.");
        return;
      }
      if (editing) {
        setMaterials((prev) =>
          prev.map((m) => (m.id === editing.id ? json.data!.material : m))
        );
        setMessage("Study material updated.");
      } else {
        setMaterials((prev) => [json.data!.material, ...prev]);
        setMessage("Study material published to student portal.");
      }
      setModalOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/institute/study-material/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMaterials((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        setDeleteTarget(null);
        setMessage("Study material removed.");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-foreground text-xl font-bold tracking-tight">
            Study Material ({materials.length})
          </h2>
          <p className="text-muted text-xs">
            Share documents, PDFs, reference links, YouTube/Telegram channels, and video
            lectures with your students.
          </p>
        </div>
        {canWrite && (
          <Button
            type="button"
            size="sm"
            className="hidden sm:inline-flex"
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={openCreate}
          >
            Add Study Material
          </Button>
        )}
      </div>

      {message && (
        <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs dark:border-emerald-800/60">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      {materials.length === 0 ? (
        <Card>
          <CardContent className="text-muted py-12 text-center text-sm">
            No study materials added yet. Click <strong>Add Study Material</strong> to
            share links, PDFs, or channels with students.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {materials.map((item) => (
            <Card key={item.id}>
              <CardHeader className="border-border flex flex-row items-start justify-between gap-3 border-b pb-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="primary">{item.materialType.toUpperCase()}</Badge>
                    <Badge variant="outline">{item.courseName}</Badge>
                  </div>
                  <CardTitle className="mt-2 truncate text-base">{item.title}</CardTitle>
                </div>
                {canWrite && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(item)}
                      aria-label={`Edit ${item.title}`}
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(item)}
                      aria-label={`Delete ${item.title}`}
                    >
                      <Trash2 className="text-danger h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3 pt-3 text-xs">
                {item.description && (
                  <p className="text-muted leading-relaxed">{item.description}</p>
                )}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-1.5 font-semibold hover:underline"
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
                  Open Resource
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canWrite && <MobileFab label="Add Material" onClick={openCreate} />}

      <ResponsiveFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Study Material" : "Add Study Material"}
        subtitle="Students can access this immediately from their Study Material sidebar."
      >
        {error && (
          <div
            role="alert"
            className="bg-danger-soft text-danger mb-3 flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs dark:border-red-800/60"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Material Title"
            placeholder="e.g. ADCA Notes PDF / Official Telegram Channel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Resource Type"
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value as StudyMaterialType)}
              options={[
                { label: "Document / PDF Link", value: "document" },
                { label: "Web Link / Drive", value: "link" },
                { label: "Channel (YouTube / Telegram)", value: "channel" },
                { label: "Video Lecture", value: "video" },
              ]}
            />
            <Select
              label="Target Course"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              options={[
                { label: "All Courses", value: "All Courses" },
                ...courseNames.map((c) => ({ label: c, value: c })),
              ]}
            />
          </div>
          <Input
            label="Resource URL (https://...)"
            type="url"
            placeholder="https://drive.google.com/... or https://t.me/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <Textarea
            label="Description (Optional)"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="border-border flex justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={loading}>
              {editing ? "Update Material" : "Publish Material"}
            </Button>
          </div>
        </form>
      </ResponsiveFormModal>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete()}
        title="Delete Study Material"
        recordLabel={deleteTarget?.title ?? ""}
        affectedSummary="Removes this study material link from both the Institute and Student portals."
        loading={loading}
      />
    </div>
  );
}
