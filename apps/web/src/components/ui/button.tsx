import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Boutons « Balise » : pilules, texte en gras, zone tactile de 48 px minimum.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-sans font-bold transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-cream disabled:pointer-events-none disabled:bg-ink-700 disabled:text-dust-500 disabled:border-transparent [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-signal text-white hover:bg-signal-hover hover:text-white active:bg-signal-press",
        destructive: "bg-signal text-white hover:bg-signal-hover hover:text-white",
        outline: "border-[1.5px] border-cream/45 bg-transparent text-cream hover:bg-cream/10 hover:text-cream",
        secondary: "bg-cream text-ink hover:bg-white hover:text-ink",
        ghost: "text-dust-100 hover:bg-cream/10 hover:text-cream",
        link: "text-signal-text underline underline-offset-[3px] hover:text-cream",
      },
      size: {
        default: "min-h-12 px-[22px] text-[17px]",
        sm: "min-h-11 px-4 text-[15px]",
        lg: "min-h-14 px-7 text-[18px]",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
