import { useState, useEffect } from 'react';

/**
 * A custom hook that delays updating a value until a specified delay has passed.
 * Useful for search inputs or other cases where you want to avoid excessive operations 
 * while a value changes frequently.
 * 
 * @param value The value to debounce
 * @param delay The delay in milliseconds (default: 500ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Update the debounced value after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer when value changes or component unmounts
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Example usage:
 * 
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * 
 * // Only perform filtering or API calls when debouncedSearchTerm changes
 * useEffect(() => {
 *   // Perform filtering or API call here
 * }, [debouncedSearchTerm]);
 * 
 * // In your component's JSX:
 * <input 
 *   type="text"
 *   value={searchTerm}
 *   onChange={(e) => setSearchTerm(e.target.value)}
 * />
 */