import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-12 w-full min-w-0 rounded-md border border-edge bg-violet px-3.5 py-2 font-sans text-lg text-text transition-[border-color] duration-150 placeholder:text-muted-foreground hover:border-muted-foreground focus-visible:border-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lilac disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted-foreground aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  )
}

export { Input }
