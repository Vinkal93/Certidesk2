import * as React from "react";
import { cn } from "@/lib/cn";

export interface PageContainerProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function PageContainer({ children, className, ...props }: PageContainerProps) {
  return (
    <main
      id="main-content"
      className={cn("min-h-[calc(100vh-4rem)]", className)}
      {...props}
    >
      {children}
    </main>
  );
}
