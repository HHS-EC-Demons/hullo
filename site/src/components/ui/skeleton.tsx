import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("block rounded-[2px] bg-raised animate-pulse motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

export { Skeleton }
