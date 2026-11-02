import * as React from "react"
import { cn } from "@/lib/utils"
import { Slider as SliderPrimitive } from "radix-ui"

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  thumbLabel?: string
  thumbLabelledBy?: string
  thumbValueText?: (value: number, index: number) => string
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabel,
  thumbLabelledBy,
  thumbValueText,
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex min-h-11 w-full cursor-pointer touch-none items-center select-none data-disabled:cursor-not-allowed data-disabled:opacity-60 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow bg-edge data-horizontal:h-px data-horizontal:w-full data-vertical:h-full data-vertical:w-px"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-lilac select-none data-horizontal:-top-px data-horizontal:h-[3px] data-vertical:-left-px data-vertical:w-[3px]"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={thumbLabelledBy ? undefined : thumbLabel}
          aria-labelledby={thumbLabelledBy}
          aria-valuetext={thumbValueText ? thumbValueText(_values[index], index) : undefined}
          className="relative block size-5 shrink-0 rounded-full border-2 border-violet bg-lilac transition-transform duration-150 select-none after:absolute after:-inset-3 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lilac active:scale-110 disabled:pointer-events-none"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
