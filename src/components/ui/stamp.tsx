import { Awards, type AwardsComponentProps } from "@/components/ui/award";

export function Stamp(props: Omit<AwardsComponentProps, "variant">) {
  return <Awards variant="stamp" {...props} />;
}

export { Awards };
