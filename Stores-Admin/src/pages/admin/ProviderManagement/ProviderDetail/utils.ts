// utils.ts - Super defensive utility functions

/**
 * Ultra-safe status badge class getter with multiple safety checks
 */
export const getStatusBadgeClass = (status: any): string => {
  // Multiple layers of safety checks
  if (status === null || status === undefined) {
    return 'bg-gray-100 text-gray-800';
  }
  
  if (typeof status !== 'string') {
    return 'bg-gray-100 text-gray-800';
  }
  
  if (status.length === 0) {
    return 'bg-gray-100 text-gray-800';
  }

  try {
    const normalizedStatus = status.toLowerCase().trim();
    
    switch (normalizedStatus) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  } catch (error) {
    console.warn('Error in getStatusBadgeClass:', error, 'Status:', status);
    return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Ultra-safe verification badge class getter
 */
export const getVerificationBadgeClass = (status: any): string => {
  // Multiple layers of safety checks
  if (status === null || status === undefined) {
    return 'bg-gray-100 text-gray-800';
  }
  
  if (typeof status !== 'string') {
    return 'bg-gray-100 text-gray-800';
  }
  
  if (status.length === 0) {
    return 'bg-gray-100 text-gray-800';
  }

  try {
    const normalizedStatus = status.toLowerCase().trim();
    
    switch (normalizedStatus) {
      case 'verified':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  } catch (error) {
    console.warn('Error in getVerificationBadgeClass:', error, 'Status:', status);
    return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Ultra-safe phone number formatter
 */
export function formatPhoneNumber(phoneNumber: any): string {
  // Handle all possible falsy values
  if (!phoneNumber) {
    return 'N/A';
  }

  // Convert to string if it's not already
  let phoneStr: string;
  try {
    phoneStr = String(phoneNumber).trim();
  } catch (error) {
    return 'N/A';
  }

  if (phoneStr === '' || phoneStr === 'null' || phoneStr === 'undefined') {
    return 'N/A';
  }

  try {
    // Remove all non-digit characters
    const cleaned = phoneStr.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length > 6) {
      const match = cleaned.match(/(\d{3})(\d{3})(\d+)/);
      if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
      }
    }
    
    return phoneStr;
  } catch (error) {
    console.warn('Error formatting phone number:', error);
    return phoneNumber;
  }
}

/**
 * Ultra-safe date formatter
 */
export const formatDate = (dateString: any): string => {
  if (!dateString) {
    return 'N/A';
  }

  try {
    const dateStr = String(dateString);
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Safe property accessor - prevents undefined property access
 */
export const safeGet = <T>(obj: any, path: string, defaultValue: T): T => {
  try {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Safe array access
 */
export const safeArray = <T>(arr: any): T[] => {
  return Array.isArray(arr) ? arr : [];
};

/**
 * Safe number formatting
 */
export const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  return defaultValue;
};