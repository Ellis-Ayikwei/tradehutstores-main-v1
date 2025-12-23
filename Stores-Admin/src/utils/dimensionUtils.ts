// Dimension parsing utilities for converting between display format and API format

export interface ParsedDimensions {
  length: number;
  height: number;
  width: number;
  unit: string;
}

/**
 * Parse dimension string like "L:67 H:67 W:78" into separate values
 * @param dimensionString - String in format "L:67 H:67 W:78" or "67 x 67 x 78 cm"
 * @returns ParsedDimensions object with length, height, width, and unit
 */
export const parseDimensions = (dimensionString: string): ParsedDimensions => {
  if (!dimensionString || typeof dimensionString !== 'string') {
    return { length: 0, height: 0, width: 0, unit: 'cm' };
  }

  // Handle format like "L:67 H:67 W:78"
  const lhwMatch = dimensionString.match(/L:(\d+(?:\.\d+)?)\s*H:(\d+(?:\.\d+)?)\s*W:(\d+(?:\.\d+)?)/i);
  if (lhwMatch) {
    return {
      length: parseFloat(lhwMatch[1]) || 0,
      height: parseFloat(lhwMatch[2]) || 0,
      width: parseFloat(lhwMatch[3]) || 0,
      unit: 'cm'
    };
  }

  // Handle format like "67 x 67 x 78 cm" or "67 x 67 x 78"
  const xFormatMatch = dimensionString.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(cm|m|in|ft)?/i);
  if (xFormatMatch) {
    return {
      length: parseFloat(xFormatMatch[1]) || 0,
      height: parseFloat(xFormatMatch[2]) || 0,
      width: parseFloat(xFormatMatch[3]) || 0,
      unit: xFormatMatch[4]?.toLowerCase() || 'cm'
    };
  }

  // Handle format like "67, 67, 78 cm" or "67, 67, 78"
  const commaFormatMatch = dimensionString.match(/(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(cm|m|in|ft)?/i);
  if (commaFormatMatch) {
    return {
      length: parseFloat(commaFormatMatch[1]) || 0,
      height: parseFloat(commaFormatMatch[2]) || 0,
      width: parseFloat(commaFormatMatch[3]) || 0,
      unit: commaFormatMatch[4]?.toLowerCase() || 'cm'
    };
  }

  // If no pattern matches, try to extract numbers
  const numbers = dimensionString.match(/\d+(?:\.\d+)?/g);
  if (numbers && numbers.length >= 3) {
    return {
      length: parseFloat(numbers[0]) || 0,
      height: parseFloat(numbers[1]) || 0,
      width: parseFloat(numbers[2]) || 0,
      unit: 'cm'
    };
  }

  // Default fallback
  return { length: 0, height: 0, width: 0, unit: 'cm' };
};

/**
 * Format parsed dimensions back to API format "L:67 H:67 W:78"
 * @param dimensions - ParsedDimensions object
 * @returns Formatted string like "L:67 H:67 W:78"
 */
export const formatDimensionsToAPI = (dimensions: ParsedDimensions): string => {
  const { length, height, width } = dimensions;
  return `L:${length} H:${height} W:${width}`;
};

/**
 * Format parsed dimensions to display format "67 x 67 x 78 cm"
 * @param dimensions - ParsedDimensions object
 * @returns Formatted string like "67 x 67 x 78 cm"
 */
export const formatDimensionsToDisplay = (dimensions: ParsedDimensions): string => {
  const { length, height, width, unit } = dimensions;
  return `${length} × ${height} × ${width} ${unit}`;
};

/**
 * Validate dimension values
 * @param dimensions - ParsedDimensions object
 * @returns boolean indicating if dimensions are valid
 */
export const validateDimensions = (dimensions: ParsedDimensions): boolean => {
  const { length, height, width } = dimensions;
  return length > 0 && height > 0 && width > 0;
};

/**
 * Get dimension string from item (handles both API format and display format)
 * @param item - Item object that may have dimensions property
 * @returns ParsedDimensions object
 */
export const getItemDimensions = (item: any): ParsedDimensions => {
  if (!item) return { length: 0, height: 0, width: 0, unit: 'cm' };
  
  // If item has separate dimension properties
  if (item.length !== undefined || item.height !== undefined || item.width !== undefined) {
    return {
      length: parseFloat(item.length) || 0,
      height: parseFloat(item.height) || 0,
      width: parseFloat(item.width) || 0,
      unit: item.unit || 'cm'
    };
  }
  
  // If item has dimensions string
  if (item.dimensions) {
    return parseDimensions(item.dimensions);
  }
  
  return { length: 0, height: 0, width: 0, unit: 'cm' };
};

