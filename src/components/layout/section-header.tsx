import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  inverted?: boolean;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  inverted = false,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center"
          ? "mx-auto max-w-2xl items-center text-center"
          : "max-w-2xl items-start text-left",
        className
      )}
    >
      {eyebrow && (
        <Badge
          variant={inverted ? "navy" : "primary"}
          className={inverted ? "border-white/20 bg-white/10 text-blue-200" : undefined}
        >
          {eyebrow}
        </Badge>
      )}
      <h2
        className={cn(
          "text-3xl font-bold tracking-tight sm:text-4xl",
          inverted ? "text-white" : "text-foreground"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "text-base leading-relaxed sm:text-lg",
            inverted ? "text-slate-300" : "text-muted"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
