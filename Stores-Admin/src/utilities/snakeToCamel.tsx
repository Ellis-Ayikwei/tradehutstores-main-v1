// filepath: c:\Users\Ellis Rockefeller\Desktop\Morevans.com\MoreVans-FE-v2\src\utilities\snakeToCamel.tsx
/**
 * Utility to convert snake_case keys to camelCase
 */

/**
 * Converts a string from snake_case to camelCase
 * @param str The snake_case string to convert
 * @returns The camelCase version of the string
 */
export const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

/**
 * Converts an object's keys from snake_case to camelCase
 * @param obj The object with snake_case keys
 * @returns A new object with camelCase keys
 */
export const convertObjectKeysToCamel = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertObjectKeysToCamel(item));
  }

  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = snakeToCamel(key);
    const value = obj[key];
    
    acc[camelKey] = typeof value === 'object' ? convertObjectKeysToCamel(value) : value;
    return acc;
  }, {} as Record<string, any>);
};

/**
 * Type-safe function to convert API response to camelCase
 * @param data The API response data with snake_case keys
 * @returns A new object with camelCase keys that matches the specified type
 */
export function convertToCamelCase<T>(data: Record<string, any>): T {
  return convertObjectKeysToCamel(data) as T;
}