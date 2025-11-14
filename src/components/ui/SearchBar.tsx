import React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from './input'
import { cn } from '../../lib/utils'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * SearchBar Component
 * 
 * A search input with:
 * - Search icon on the left
 * - Clear button (X) on the right when there's text
 * - Instant filter support
 * 
 * @example
 * ```tsx
 * const [search, setSearch] = useState('')
 * 
 * <SearchBar
 *   value={search}
 *   onChange={setSearch}
 *   placeholder="Search conversations..."
 * />
 * ```
 */
export function SearchBar({ 
  value, 
  onChange, 
  placeholder = 'Search...',
  className 
}: SearchBarProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10"
        aria-label={placeholder}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear search"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
