// src/utils/urlState.ts
// URL state management utilities for handling query parameters and navigation state

import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

// Custom hook for managing URL search parameters
export function useUrlState<T extends Record<string, any>>(defaultValues: T) {
  const [searchParams, setSearchParams] = useSearchParams()

  // Parse current URL parameters
  const urlState = useMemo(() => {
    const params: Partial<T> = {}
    
    for (const [key, value] of searchParams.entries()) {
      // Try to parse as JSON first (for complex values)
      try {
        params[key as keyof T] = JSON.parse(value)
      } catch {
        // If not JSON, use as string
        params[key as keyof T] = value as T[keyof T]
      }
    }
    
    return { ...defaultValues, ...params }
  }, [searchParams, defaultValues])

  // Update URL parameters
  const updateUrlState = useCallback((updates: Partial<T>, replace = false) => {
    const newParams = new URLSearchParams(searchParams)
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        newParams.delete(key)
      } else if (typeof value === 'object') {
        newParams.set(key, JSON.stringify(value))
      } else {
        newParams.set(key, String(value))
      }
    })

    setSearchParams(newParams, { replace })
  }, [searchParams, setSearchParams])

  // Clear specific parameters
  const clearUrlState = useCallback((keys: (keyof T)[]) => {
    const newParams = new URLSearchParams(searchParams)
    keys.forEach(key => newParams.delete(String(key)))
    setSearchParams(newParams, { replace: true })
  }, [searchParams, setSearchParams])

  // Reset to default state
  const resetUrlState = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  return {
    urlState,
    updateUrlState,
    clearUrlState,
    resetUrlState,
    rawParams: searchParams
  }
}

// Hook for managing navigation with state
export function useNavigationState() {
  const navigate = useNavigate()
  const location = useLocation()

  const navigateWithState = useCallback((
    to: string, 
    state?: any,
    options?: { replace?: boolean }
  ) => {
    navigate(to, { 
      state: { ...location.state, ...state },
      replace: options?.replace 
    })
  }, [navigate, location.state])

  return {
    navigate: navigateWithState,
    currentState: location.state,
    pathname: location.pathname,
    search: location.search
  }
}

// Utility functions for common URL operations
export const urlUtils = {
  // Build URL with parameters
  buildUrl: (path: string, params: Record<string, any> = {}) => {
    const url = new URL(path, window.location.origin)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'object') {
          url.searchParams.set(key, JSON.stringify(value))
        } else {
          url.searchParams.set(key, String(value))
        }
      }
    })
    return url.pathname + url.search
  },

  // Parse URL parameters
  parseUrl: (urlString: string) => {
    const url = new URL(urlString, window.location.origin)
    const params: Record<string, any> = {}
    
    for (const [key, value] of url.searchParams.entries()) {
      try {
        params[key] = JSON.parse(value)
      } catch {
        params[key] = value
      }
    }
    
    return {
      pathname: url.pathname,
      search: url.search,
      params
    }
  },

  // Get current page from pathname
  getCurrentPage: (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean)
    return segments.length > 0 ? segments[0] : 'home'
  },

  // Check if current route matches pattern
  matchRoute: (pathname: string, pattern: string) => {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/:\w+/g, '([^/]+)') + '$'
    )
    return regex.test(pathname)
  }
}

// Hook for search functionality with URL persistence
export function useSearchState(defaultQuery = '') {
  const { urlState, updateUrlState, clearUrlState } = useUrlState({
    q: defaultQuery,
    filter: undefined as string | undefined,
    sort: undefined as string | undefined,
    page: 1
  })

  const setQuery = useCallback((query: string) => {
    updateUrlState({ q: query, page: 1 })
  }, [updateUrlState])

  const setFilter = useCallback((filter: string | undefined) => {
    updateUrlState({ filter, page: 1 })
  }, [updateUrlState])

  const setSort = useCallback((sort: string | undefined) => {
    updateUrlState({ sort, page: 1 })
  }, [updateUrlState])

  const setPage = useCallback((page: number) => {
    updateUrlState({ page })
  }, [updateUrlState])

  const clearSearch = useCallback(() => {
    clearUrlState(['q', 'filter', 'sort', 'page'])
  }, [clearUrlState])

  return {
    query: urlState.q,
    filter: urlState.filter,
    sort: urlState.sort,
    page: urlState.page,
    setQuery,
    setFilter,
    setSort,
    setPage,
    clearSearch
  }
}

// Hook for form state with URL persistence (useful for filters)
export function useFormUrlState<T extends Record<string, any>>(
  initialValues: T,
  debounceMs = 500
) {
  const { urlState, updateUrlState } = useUrlState(initialValues)

  // Debounced update function
  const debouncedUpdate = useMemo(() => {
    let timeoutId: NodeJS.Timeout
    
    return (updates: Partial<T>) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        updateUrlState(updates)
      }, debounceMs)
    }
  }, [updateUrlState, debounceMs])

  return {
    values: urlState,
    updateValue: (key: keyof T, value: T[keyof T]) => {
      debouncedUpdate({ [key]: value } as Partial<T>)
    },
    updateValues: debouncedUpdate,
    resetValues: () => updateUrlState(initialValues, true)
  }
}