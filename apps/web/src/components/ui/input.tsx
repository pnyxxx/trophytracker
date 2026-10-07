import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex min-h-14 w-full rounded-2xl border-2 border-ink-600 bg-ink-800 px-4 py-2 text-[18px] text-cream transition-colors file:mr-3 file:rounded-full file:border-0 file:bg-cream file:px-3 file:py-1 file:font-sans file:text-sm file:font-bold file:text-ink placeholder:text-dust-600 hover:border-dust-600 focus-visible:border-cream focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-signal-text",
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
