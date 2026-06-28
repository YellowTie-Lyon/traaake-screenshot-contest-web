import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-surface text-text-secondary",
        open: "border-green-700/50 bg-green-900/20 text-green-400",
        paused: "border-yellow-700/50 bg-yellow-900/20 text-yellow-400",
        closed: "border-red-700/50 bg-red-900/20 text-red-400",
        archived: "border-border bg-surface-2 text-text-muted",
        draft: "border-blue-700/50 bg-blue-900/20 text-blue-400",
        cyan: "border-cyan/50 bg-cyan/10 text-cyan",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
