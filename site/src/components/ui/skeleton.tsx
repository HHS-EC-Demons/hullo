import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("rounded-[2px] bg-raised animate-pulse motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

export { Skeleton }
