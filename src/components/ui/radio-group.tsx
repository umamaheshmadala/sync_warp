import * as React from "react"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
} | undefined>(undefined)

const RadioGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        value?: string
        onValueChange?: (value: string) => void
        disabled?: boolean
    }
>(({ className, value, onValueChange, disabled, children, ...props }, ref) => {
    return (
        <RadioGroupContext.Provider value={{ value, onValueChange, disabled }}>
            <div
                role="radiogroup"
                ref={ref}
                className={cn("grid gap-2", className)}
                {...props}
            >
                {children}
            </div>
        </RadioGroupContext.Provider>
    )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
        value: string
    }
>(({ className, value, disabled, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext)
    
    if (!context) {
        console.warn("RadioGroupItem used outside of RadioGroup")
    }

    const { value: groupValue, onValueChange, disabled: groupDisabled } = context || {}
    const checked = value === groupValue
    const isDisabled = disabled || groupDisabled

    return (
        <button
            type="button"
            role="radio"
            aria-checked={checked}
            data-state={checked ? "checked" : "unchecked"}
            value={value}
            disabled={isDisabled}
            onClick={() => onValueChange?.(value)}
            ref={ref}
            className={cn(
                "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            <span className={cn("flex items-center justify-center", checked ? "block" : "hidden")}>
                <Circle className="h-2.5 w-2.5 fill-current text-current" />
            </span>
        </button>
    )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
