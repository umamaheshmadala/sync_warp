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
          peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent 
          transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 
          focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
          min-h-0 min-w-0
          ${checked ? 'bg-blue-600' : 'bg-gray-200'}
          ${className}
        `}
        style={{
          width: '44px',
          height: '24px',
          minWidth: '44px',
          minHeight: '24px',
          boxSizing: 'border-box'
        }}
      >
        <span className="sr-only">Toggle</span>
        <span
          aria-hidden="true"
          className={`
            pointer-events-none block h-5 w-5 transform rounded-full bg-white shadow ring-0 
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    )
  }
)

Switch.displayName = "Switch"
