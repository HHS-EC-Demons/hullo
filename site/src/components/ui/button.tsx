import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2.5 rounded-md border-0 font-sans font-bold tracking-[-0.005em] whitespace-nowrap no-underline transition-[transform,background-color,box-shadow,color] duration-150 ease-hullo select-none active:not-aria-[haspopup]:translate-y-px disabled:cursor-not-allowed aria-invalid:shadow-[inset_0_0_0_1px_var(--danger)] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-laser text-violet hover:bg-[color-mix(in_oklab,var(--laser)_82%,var(--ink-text))] disabled:bg-raised disabled:text-muted-foreground disabled:shadow-[inset_0_0_0_1px_var(--edge)]",
        quiet:
          "bg-transparent text-text shadow-[inset_0_0_0_1px_var(--edge)] hover:bg-raised hover:shadow-[inset_0_0_0_1px_var(--ink-text)] aria-expanded:bg-raised disabled:bg-raised disabled:text-muted-foreground disabled:shadow-[inset_0_0_0_1px_var(--violet-rule)]",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-raised hover:text-text aria-expanded:bg-raised aria-expanded:text-text disabled:text-muted-foreground",
        line:
          "bg-transparent text-lilac shadow-[inset_0_0_0_1px_var(--lilac)] hover:bg-lilac hover:text-violet disabled:text-muted-foreground disabled:shadow-[inset_0_0_0_1px_var(--violet-rule)] disabled:hover:bg-transparent",
        danger:
          "bg-transparent text-danger shadow-[inset_0_0_0_1px_var(--danger)] hover:bg-danger hover:text-violet",
        link: "h-auto min-h-11 bg-transparent px-0 font-normal text-lilac underline decoration-1 underline-offset-[0.2em] hover:decoration-2",
      },
      size: {
        default: "min-h-12 px-[22px] text-sm",
        sm: "min-h-11 px-4 text-sm",
        lg: "min-h-14 px-7 text-lg",
        icon: "size-11 p-0 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
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
