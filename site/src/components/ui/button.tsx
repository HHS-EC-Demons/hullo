import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "press press-primary",
        secondary: "press",
        selected: "press press-selected",
        danger: "press press-danger",
        default: "press press-primary",
        quiet: "press",
        ghost: "press",
        line: "press",
        link: "inline-flex min-h-11 cursor-pointer items-center bg-transparent p-0 font-normal text-lilac underline decoration-1 underline-offset-[0.2em] hover:decoration-2",
      },
      size: {
        default: "",
        sm: "min-h-11 px-4",
        lg: "min-h-14 px-7 text-lg",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
