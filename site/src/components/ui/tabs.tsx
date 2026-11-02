import * as React from "react"
import { cn } from "@/lib/utils"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-6 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex w-fit flex-wrap items-stretch gap-x-6 gap-y-1 border-b border-rule text-muted-foreground group-data-vertical/tabs:flex-col group-data-vertical/tabs:border-r group-data-vertical/tabs:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative -mb-px inline-flex min-h-11 cursor-pointer items-center gap-2 border-b-2 border-transparent px-0 font-sans text-lg whitespace-nowrap text-muted-foreground transition-colors duration-150 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lilac disabled:cursor-not-allowed disabled:opacity-60 data-active:border-lilac data-active:font-bold data-active:text-text group-data-vertical/tabs:-mr-px group-data-vertical/tabs:mb-0 group-data-vertical/tabs:justify-start group-data-vertical/tabs:border-r-2 group-data-vertical/tabs:border-b-0 group-data-vertical/tabs:pr-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lilac", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
