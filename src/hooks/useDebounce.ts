import { useState, useEffect } from 'react'

/**
 * Retrasa la propagación de un valor hasta que el usuario deja de cambiar
 * el input durante `delay` ms. Úsalo para evitar requests por cada keystroke.
 */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
