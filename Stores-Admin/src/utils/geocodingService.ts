// Geocoding Service - Backend API proxy to avoid CORS issues
// This service calls your Django backend instead of Google Maps directly

import axiosInstance from '../services/axiosInstance';

// Types for API responses
export interface AddressPrediction {
    description: string;
    place_id: string;
    reference: string;
    matched_substrings: Array<{
        length: number;
        offset: number;
    }>;
    structured_formatting: {
        main_text: string;
        secondary_text: string;
    };
    terms: Array<{
        offset: number;
        value: string;
    }>;
    types: string[];
}

export interface PlaceDetails {
    formatted_address: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
        location_type: string;
        viewport: {
            northeast: { lat: number; lng: number };
            southwest: { lat: number; lng: number };
        };
    };
    address_components: Array<{
        long_name: string;
        short_name: string;
        types: string[];
    }>;
    parsed_address: {
        street_number: string;
        route: string;
        locality: string;
        postal_town: string;
        administrative_area_level_1: string;
        administrative_area_level_2: string;
        country: string;
        postal_code: string;
    };
}

export interface AddressAutocompleteResponse {
    predictions: AddressPrediction[];
    status: string;
}

export interface PlaceDetailsResponse {
    result: PlaceDetails;
    status: string;
}

export interface GeocodeResult {
    formatted_address: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
        location_type: string;
    };
    address_components: Array<{
        long_name: string;
        short_name: string;
        types: string[];
    }>;
}

export interface GeocodeResponse {
    results: GeocodeResult[];
    status: string;
}

/**
 * Get address suggestions using Google Places Autocomplete (via backend)
 */
export async function getAddressSuggestions(input: string, sessionToken?: string): Promise<AddressAutocompleteResponse> {
    try {
        const params: any = {
            input: input.trim(),
        };

        if (sessionToken) {
            params.sessiontoken = sessionToken;
        }

        // Use the working endpoint path that bypasses authentication
        const response = await axiosInstance.get('/geocoding/google-autocomplete/', {
            params,
        });

        if (response.data.error) {
            throw new Error(response.data.error);
        }

        return response.data;
    } catch (error) {
        console.error('Error fetching address suggestions:', error);
        throw error;
    }
}

/**
 * Get detailed place information using Google Place Details (via backend)
 */
export async function getPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetailsResponse> {
    try {
        const params: any = {
            place_id: placeId,
        };

        if (sessionToken) {
            params.sessiontoken = sessionToken;
        }

        const response = await axiosInstance.get('/geocoding/google-place-details/', {
            params,
        });

        if (response.data.error) {
            throw new Error(response.data.error);
        }

        return response.data;
    } catch (error) {
        console.error('Error fetching place details:', error);
        throw error;
    }
}

/**
 * Geocode an address to get coordinates (via backend)
 */
export async function geocodeAddress(address: string): Promise<GeocodeResponse> {
    try {
        const response = await axiosInstance.get('/geocoding/geocode-address/', {
            params: {
                address: address.trim(),
            },
        });

        if (response.data.error) {
            throw new Error(response.data.error);
        }

        return response.data;
    } catch (error) {
        console.error('Error geocoding address:', error);
        throw error;
    }
}

/**
 * Get UK postcode suggestions (via backend)
 */
export async function getPostcodeSuggestions(query: string): Promise<string[]> {
    try {
        if (query.length < 2) {
            return [];
        }

        const response = await axiosInstance.get('/geocoding/postcode-suggestions/', {
            params: {
                q: query,
            },
        });

        return response.data.suggestions || [];
    } catch (error) {
        console.error('Error fetching postcode suggestions:', error);
        return [];
    }
}

/**
 * Validate UK postcode (via backend)
 */
export async function validatePostcode(postcode: string): Promise<{
    isValid: boolean;
    message?: string;
    context?: any;
}> {
    try {
        const response = await axiosInstance.get(`/morevans/api/v1/locations/validate-postcode/${encodeURIComponent(postcode)}/`);

        return response.data;
    } catch (error) {
        console.error('Error validating postcode:', error);
        return {
            isValid: false,
            message: 'Error validating postcode',
        };
    }
}

/**
 * Generate a session token for billing optimization
 * Use the same token for autocomplete + place details calls
 */
export function generateSessionToken(): string {
    return 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Extract coordinates from place details or geocode result
 */
export function extractCoordinates(result: PlaceDetails | GeocodeResult): {
    lat: number;
    lng: number;
} | null {
    try {
        const location = result.geometry?.location;
        if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
            return {
                lat: location.lat,
                lng: location.lng,
            };
        }
        return null;
    } catch (error) {
        console.error('Error extracting coordinates:', error);
        return null;
    }
}

/**
 * Extract address components for form filling
 */
export function extractAddressComponents(result: PlaceDetails): {
    address_line1: string;
    city: string;
    county: string;
    postcode: string;
    country: string;
} {
    const parsed = result.parsed_address || {};
    const components = result.address_components || [];

    // Build address line 1
    let addressLine1 = '';
    if (parsed.street_number) {
        addressLine1 += parsed.street_number;
    }
    if (parsed.route) {
        addressLine1 += (addressLine1 ? ' ' : '') + parsed.route;
    }

    return {
        address_line1: addressLine1,
        city: parsed.postal_town || parsed.locality || '',
        county: parsed.administrative_area_level_2 || '',
        postcode: parsed.postal_code || '',
        country: parsed.country || 'United Kingdom',
    };
}
