// filepath: c:\Users\Ellis Rockefeller\Desktop\Morevans.com\MoreVans-FE-v2\src\helper\apiDataConverter.tsx
import { convertToCamelCase } from '../utilities/snakeToCamel';
import { ServiceRequest, JourneyStop, JourneyItem } from '../types';

/**
 * Converts a snake_case API response for a service request into a camelCase ServiceRequest object
 * @param data The API response data with snake_case keys
 * @returns A camelCase ServiceRequest object
 */
export const convertApiServiceRequest = (data: Record<string, any>): ServiceRequest => {
    // Convert the data to camelCase
    return convertToCamelCase<ServiceRequest>(data);
};

/**
 * Safely handles API response that might be null or undefined
 * @param apiCall The async function that makes the API call
 * @returns A function that returns the converted data or undefined if there was an error
 */
export const safeApiCall = async <T,>(apiCall: () => Promise<Record<string, any>>): Promise<T | undefined> => {
    try {
        const response = await apiCall();
        if (!response) return undefined;
        return convertToCamelCase<T>(response);
    } catch (error) {
        console.error('API call failed:', error);
        return undefined;
    }
};

/**
 * Maps journey stops from snake_case API format to camelCase
 * @param stops Array of journey stops from the API
 * @returns Converted JourneyStop array with camelCase properties
 */
export const mapJourneyStops = (stops: Record<string, any>[] | null | undefined): JourneyStop[] => {
    if (!stops || !Array.isArray(stops)) return [];

    return stops.map((stop) => {
        const camelStop = convertToCamelCase<JourneyStop>(stop);

        // Handle special case mappings if needed
        if (stop.items && Array.isArray(stop.items)) {
            camelStop.items = stop.items.map((item: Record<string, any>) => convertToCamelCase<JourneyItem>(item));
        }

        return camelStop;
    });
};

/**
 * Maps moving items from snake_case API format to camelCase
 * @param items Array of moving items from the API
 * @returns Converted JourneyItem array with camelCase properties
 */
export const mapmoving_items = (items: Record<string, any>[] | null | undefined): JourneyItem[] => {
    if (!items || !Array.isArray(items)) return [];

    return items.map((item) => convertToCamelCase<JourneyItem>(item));
};
