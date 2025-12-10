// Utility to convert API data from snake_case to camelCase
export const convertSnakeToCamel = (data: any): any => {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => convertSnakeToCamel(item));
  }

  return Object.keys(data).reduce((result: Record<string, any>, key: string) => {
    // Convert key from snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    // Recursively convert nested objects and arrays
    const value = data[key];
    result[camelKey] = typeof value === 'object' ? convertSnakeToCamel(value) : value;
    
    return result;
  }, {});
};