import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-surface-2 border border-border-subtle",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
