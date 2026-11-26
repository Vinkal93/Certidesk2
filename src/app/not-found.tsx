import { NotFoundView } from "@/components/ui/not-found-view";

export default function GlobalNotFoundPage() {
  return (
    <NotFoundView
      code="404"
      title="Page not found"
      description="The page you are looking for moved, vanished, or never existed."
      primaryHref="/"
      primaryLabel="Back home"
      secondaryHref="/get-started"
      secondaryLabel="Explore portals"
    />
  );
}
