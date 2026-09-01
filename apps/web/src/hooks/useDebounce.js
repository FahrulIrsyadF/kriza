import { useState, useEffect } from 'react';

/**
 * Debounce a value by delaying updates until the user stops typing.
 *
 * @param {any} value     - The value to debounce
 * @param {number} delay  - Delay in milliseconds (default: 400ms)
 * @returns {any}         - Debounced value
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
