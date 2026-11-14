import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group/switch relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-edge p-0.5 transition-[background-color,border-color] duration-150 after:absolute after:-inset-x-1 after:-inset-y-2.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-lilac data-checked:border-lilac data-checked:bg-lilac data-unchecked:bg-violet data-disabled:cursor-not-allowed data-disabled:opacity-60",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[18px] rounded-full transition-transform duration-150 ease-hullo data-checked:translate-x-5 data-checked:bg-violet data-unchecked:translate-x-0 data-unchecked:bg-muted-foreground"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
