"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        "3d-primary":
          "bg-gradient-to-b from-orange-400 to-orange-600 text-white border-b-4 border-orange-800 hover:from-orange-300 hover:to-orange-500 hover:border-orange-700 active:border-b-2 active:translate-y-0.5",
        "3d-secondary":
          "bg-gradient-to-b from-yellow-400 to-yellow-600 text-black border-b-4 border-yellow-800 hover:from-yellow-300 hover:to-yellow-500 hover:border-yellow-700 active:border-b-2 active:translate-y-0.5",
        "3d-success":
          "bg-gradient-to-b from-green-400 to-green-600 text-white border-b-4 border-green-800 hover:from-green-300 hover:to-green-500 hover:border-green-700 active:border-b-2 active:translate-y-0.5",
        "3d-danger":
          "bg-gradient-to-b from-red-400 to-red-600 text-white border-b-4 border-red-800 hover:from-red-300 hover:to-red-500 hover:border-red-700 active:border-b-2 active:translate-y-0.5",
        "3d-glass":
          "bg-gradient-to-b from-white/20 to-white/10 backdrop-blur-sm border border-white/30 text-white shadow-lg hover:from-white/30 hover:to-white/20 hover:shadow-xl active:scale-95",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        "3d-default": "h-12 px-6 py-3 shadow-lg hover:shadow-xl",
        "3d-lg": "h-14 px-8 py-4 shadow-xl hover:shadow-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  force3D?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, force3D = false, ...props }, ref) => {
    const isMobile = useIsMobile()
    const isAndroidTV =
      typeof window !== "undefined" &&
      window.navigator.userAgent.includes("Android") &&
      (window.navigator.userAgent.includes("TV") || (window.screen.width >= 1920 && window.screen.height >= 1080))

    const shouldUse3D = force3D || (!isMobile && !isAndroidTV)

    let finalVariant = variant
    let finalSize = size

    if (!shouldUse3D && variant?.startsWith("3d-")) {
      finalVariant = variant.replace("3d-", "") as any
      if (finalVariant === "glass") finalVariant = "outline"
    }

    if (!shouldUse3D && size?.startsWith("3d-")) {
      finalSize = size.replace("3d-", "") as any
    }

    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(
          buttonVariants({ variant: finalVariant, size: finalSize }),
          shouldUse3D && variant?.startsWith("3d-") && "transform-gpu perspective-1000",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
