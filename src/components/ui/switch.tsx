import * as React from "react"

export interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, disabled = false, className = '' }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full 
          transition-colors duration-200 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
          ${className}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0.5'}
          `}
        />
      </button>
    )
  }
)

Switch.displayName = "Switch"
