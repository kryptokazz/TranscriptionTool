import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 active:translate-y-0.5",
  {
    variants: {
      variant: {
        default:
          "bg-green-500 text-white shadow-[0_4px_0_0_#16a34a] hover:shadow-[0_2px_0_0_#16a34a] hover:translate-y-0.5 active:shadow-[0_0px_0_0_#16a34a] active:translate-y-1",
        secondary:
          "bg-blue-500 text-white shadow-[0_4px_0_0_#2563eb] hover:shadow-[0_2px_0_0_#2563eb] hover:translate-y-0.5 active:shadow-[0_0px_0_0_#2563eb] active:translate-y-1",
        outline:
          "border-2 border-gray-300 bg-white text-gray-700 shadow-[0_4px_0_0_#d1d5db] hover:shadow-[0_2px_0_0_#d1d5db] hover:translate-y-0.5 active:shadow-[0_0px_0_0_#d1d5db] active:translate-y-1",
        ghost: "hover:bg-gray-100 hover:text-gray-900",
        link: "text-primary underline-offset-4 hover:underline",
        destructive:
          "bg-red-500 text-white shadow-[0_4px_0_0_#dc2626] hover:shadow-[0_2px_0_0_#dc2626] hover:translate-y-0.5 active:shadow-[0_0px_0_0_#dc2626] active:translate-y-1",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-14 px-8 py-4 text-base",
        icon: "h-10 w-10",
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