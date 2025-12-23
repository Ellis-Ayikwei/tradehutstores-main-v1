// filepath: c:\Users\Ellis Rockefeller\Desktop\Morevans.com\MoreVans-FE-v2\src\utilities\caseConverters.tsx
/**
 * Utility functions to convert between camelCase and snake_case
 */

/**
 * Converts a string from camelCase to snake_case
 * @param str The camelCase string to convert
 * @returns The snake_case version of the string
 */
export const camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * Converts a string from snake_case to camelCase
 * @param str The snake_case string to convert
 * @returns The camelCase version of the string
 */
export const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Converts an object's keys from camelCase to snake_case
 * @param obj The object with camelCase keys
 * @returns A new object with snake_case keys
 */
export const convertObjectKeysToSnake = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertObjectKeysToSnake(item));
  }

  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = camelToSnake(key);
    const value = obj[key];
    
    acc[snakeKey] = typeof value === 'object' ? convertObjectKeysToSnake(value) : value;
    return acc;
  }, {} as Record<string, any>);
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
 * Type-safe function to convert object to snake_case
 * @param data The data with camelCase keys
 * @returns A new object with snake_case keys
 */
export function convertToSnakeCase<T>(data: Record<string, any>): T {
  return convertObjectKeysToSnake(data) as T;
}

/**
 * Type-safe function to convert object to camelCase
 * @param data The data with snake_case keys
 * @returns A new object with camelCase keys
 */
export function convertToCamelCase<T>(data: Record<string, any>): T {
  return convertObjectKeysToCamel(data) as T;
}