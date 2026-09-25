import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[4px] border border-cream/15 bg-black/30 px-3 py-2 text-base text-cream transition-colors file:mr-3 file:border-0 file:bg-transparent file:font-mono file:text-xs file:font-bold file:uppercase file:tracking-[0.12em] file:text-primary placeholder:text-dust-500 hover:border-cream/30 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
