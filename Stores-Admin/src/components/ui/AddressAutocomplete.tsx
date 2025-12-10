// Enhanced Address Autocomplete Component - Worldwide Search with Detailed Address Display
import React, { useEffect, useRef, useState } from 'react';
import { extractAddressComponents, extractCoordinates, generateSessionToken, getAddressSuggestions, getPlaceDetails, type AddressPrediction } from '../../services/geocodingService';
import axiosInstance from '../../services/axiosInstance';

interface AddressAutocompleteProps {
    // New enhanced interface
    placeholder?: string;
    onAddressSelect?: (address: {
        formatted_address: string;
        coordinates: { lat: number; lng: number };
        components: {
            address_line1: string;
            city: string;
            county: string;
            postcode: string;
            country: string;
        };
    }) => void;
    onAddressChange?: (value: string) => void;
    value?: string;
    style?: React.CSSProperties;
    showDetails?: boolean;

    // Legacy interface for backward compatibility
    name?: string;
    onChange?: (
        value: string,
        coords?: { lat: number; lng: number },
        addressDetails?: {
            address_line1: string;
            city: string;
            county: string;
            postcode: string;
            country: string;
        }
    ) => void;
    label?: string;
    error?: string | false | undefined;
    touched?: boolean;
    required?: boolean;
    className?: string;

    // Enhanced postcode address lookup
    onPostcodeAddressesFound?: (addresses: PostcodeAddress[]) => void;
    showPostcodeAddresses?: boolean;
    autoSelectFirst?: boolean;
}

interface PostcodeAddress {
    source: string;
    formatted_address: string;
    place_id?: string;
    main_text?: string;
    secondary_text?: string;
    address_line1?: string;
    city?: string;
    postcode?: string;
    country?: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
    placeholder = 'Enter address, city, or postcode...',
    onAddressSelect,
    onAddressChange,
    value,
    style,
    showDetails = true,
    // Legacy props
    name,
    onChange,
    label,
    error,
    touched,
    required,
    className,
    // Enhanced props
    onPostcodeAddressesFound,
    showPostcodeAddresses = true,
    autoSelectFirst = false,
}) => {
    const [searchText, setSearchText] = useState(value || '');
    const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<any>(null);
    const [sessionToken, setSessionToken] = useState('');
    const [postcodeAddresses, setPostcodeAddresses] = useState<PostcodeAddress[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Cache for postcode addresses (5 minute expiry)
    const [addressCache, setAddressCache] = useState<Map<string, { addresses: PostcodeAddress[]; expiry: number }>>(new Map());

    // Generate session token on component mount
    useEffect(() => {
        setSessionToken(generateSessionToken());
    }, []);

    // Handle clicks outside dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Handle search text changes with debouncing
    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        if (searchText.trim().length >= 2 && !selectedAddress) {
            debounceTimeoutRef.current = setTimeout(() => {
                searchAddresses(searchText);
            }, 300);
        } else {
            setPredictions([]);
            setShowDropdown(false);
        }

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [searchText, selectedAddress]);

    const searchAddresses = async (query: string) => {
        if (!query.trim() || selectedAddress) return;

        setLoading(true);
        try {
            // Use our backend's Google Places API - now works worldwide!
            const response = await getAddressSuggestions(query, sessionToken);
            // Extract predictions array from the response object
            setPredictions(response?.predictions || []);
            setShowDropdown(true);
        } catch (error) {
            console.error('Error fetching address suggestions:', error);
            setPredictions([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPostcodeAddresses = async (postcode: string, currentAddress: any) => {
        if (!postcode || !postcode.trim()) return;

        // Only fetch for UK postcodes (basic check)
        const ukPostcodePattern = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
        if (!ukPostcodePattern.test(postcode.trim())) {
            return;
        }

        const formattedPostcode = postcode.trim().toUpperCase();

        // Check cache first
        const cached = addressCache.get(formattedPostcode);
        if (cached && cached.expiry > Date.now()) {
            setPostcodeAddresses(cached.addresses);
            if (onPostcodeAddressesFound) {
                onPostcodeAddressesFound(cached.addresses);
            }
            logPostcodeAddresses(formattedPostcode, currentAddress, cached.addresses);
            return;
        }

        try {
            const response = await axiosInstance.get(`/geocoding/simple-postcode-addresses/?postcode=${encodeURIComponent(formattedPostcode)}`);
            const data = response.data;
            const addresses: PostcodeAddress[] =
                data.addresses?.map((addr: any) => ({
                    formatted_address: addr.formatted_address || `${addr.main_text || ''} ${addr.secondary_text || ''}`.trim(),
                    postcode: formattedPostcode,
                    address_line1: addr.main_text || addr.address_line1,
                    city: addr.city || addr.secondary_text?.split(',')[0],
                    country: 'United Kingdom',
                    source: addr.source || 'google_places',
                    place_id: addr.place_id,
                    main_text: addr.main_text,
                    secondary_text: addr.secondary_text,
                })) || [];

            // Cache addresses for 5 minutes
            const newCache = new Map(addressCache);
            newCache.set(formattedPostcode, {
                addresses,
                expiry: Date.now() + 5 * 60 * 1000, // 5 minutes
            });
            setAddressCache(newCache);

            setPostcodeAddresses(addresses);
            if (onPostcodeAddressesFound) {
                onPostcodeAddressesFound(addresses);
            }

            // Log the postcode addresses
            logPostcodeAddresses(formattedPostcode, currentAddress, addresses);
        } catch (error) {
            console.error('Error fetching postcode addresses:', error);
        }
    };

    const logPostcodeAddresses = (postcode: string, currentAddress: any, addresses: PostcodeAddress[]) => {
        // Console log matching the format user showed
        console.log('\n🏠 Selected Address Details:');
        console.log(`   - Coordinates: Lat ${currentAddress?.coordinates?.lat || 'N/A'}, Lng ${currentAddress?.coordinates?.lng || 'N/A'}`);
        console.log(`   - Address Line: ${currentAddress?.formatted_address || currentAddress?.components?.address_line1 || 'N/A'}`);
        console.log(`   - City: ${currentAddress?.components?.city || 'N/A'}`);
        console.log(`   - Postcode: ${currentAddress?.components?.postcode || postcode}`);
        console.log(`   - Country: ${currentAddress?.components?.country || 'United Kingdom'}`);

        console.log(`\n🏘️ Available Addresses in ${postcode}:`);
        console.log(`   - Found ${addresses.length} addresses`);
        addresses.forEach((addr, index) => {
            console.log(`   ${index + 1}. ${addr.formatted_address} (${addr.source})`);
        });
        console.log(''); // Empty line for readability
    };

    const handleAddressSelect = async (placeId: string, description: string) => {
        setSearchText(description);
        setPredictions([]);
        setShowDropdown(false);
        setLoading(true);
        
        // Immediately prevent any further dropdown display
        setSelectedAddress({ formatted_address: description, coordinates: { lat: 0, lng: 0 }, components: {} });

        try {
            // Get detailed place information
            const response = await getPlaceDetails(placeId, sessionToken);
            const placeDetails = response?.result;

            if (placeDetails) {
                const coordinates = extractCoordinates(placeDetails);
                const components = extractAddressComponents(placeDetails);

                const addressData = {
                    formatted_address: placeDetails.formatted_address || description,
                    coordinates: coordinates || { lat: 0, lng: 0 },
                    components,
                };

                setSelectedAddress(addressData);

                // Call the new enhanced callback
                if (onAddressSelect) {
                    onAddressSelect(addressData);
                }

                // Call the legacy callback for backward compatibility
                if (onChange) {
                    onChange(placeDetails.formatted_address || description, coordinates || undefined, components);
                }

                // Also call onAddressChange for form compatibility
                if (onAddressChange) {
                    onAddressChange(placeDetails.formatted_address || description);
                }

                // Fetch addresses for this postcode if it's a UK postcode
                if (components.postcode && components.country?.toLowerCase().includes('kingdom')) {
                    await fetchPostcodeAddresses(components.postcode, addressData);
                }
            }
        } catch (error) {
            console.error('Error fetching place details:', error);
        } finally {
            setLoading(false);
            // Generate new session token for next search
            setSessionToken(generateSessionToken());
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchText(value);

        // Clear addresses when input changes
        setPostcodeAddresses([]);

        // If user is typing and it's different from the selected address, clear the selection
        if (selectedAddress && value !== selectedAddress.formatted_address) {
            setSelectedAddress(null);
            setPredictions([]);
            setShowDropdown(false);
        }

        // Only trigger callbacks if the value is meaningful (at least 2 chars or empty)
        // This prevents validation errors on small screens when users are still typing
        if (onAddressChange) {
            onAddressChange(value);
        }

        // Legacy onChange callback - only pass meaningful values
        if (onChange) {
            // If the value is too short, pass empty string to avoid validation errors
            const meaningfulValue = value.length >= 2 || value.length === 0 ? value : '';
            onChange(meaningfulValue);
        }
    };

    const handleClear = () => {
        setSearchText('');
        setPredictions([]);
        setPostcodeAddresses([]);
        setSelectedAddress(null);
        setShowDropdown(false);

        if (onAddressChange) {
            onAddressChange('');
        }

        if (onChange) {
            onChange('');
        }

        if (onAddressSelect) {
            onAddressSelect({
                formatted_address: '',
                coordinates: { lat: 0, lng: 0 },
                components: {
                    address_line1: '',
                    city: '',
                    county: '',
                    postcode: '',
                    country: '',
                },
            });
        }
    };

    const inputClasses = 'w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-lg';

    // Legacy form field wrapper
    const renderFormField = () => (
        <div>
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className={className} ref={dropdownRef}>
                {renderAutocomplete()}
            </div>
            {error && touched && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );

    const renderAutocomplete = () => (
        <div className="relative">
            <input
                type="text"
                value={searchText}
                onChange={handleInputChange}
                placeholder={placeholder}
                className={inputClasses}
                onFocus={() => {
                    // Only show dropdown if there are predictions and no address is selected
                    if (predictions.length > 0 && !selectedAddress) {
                        setShowDropdown(true);
                    }
                }}
            />

            {/* Loading indicator */}
            {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
            )}

            {/* Clear button */}
            {searchText && (
                <button type="button" onClick={handleClear} className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    ×
                </button>
            )}

            {/* Dropdown */}
            {showDropdown && predictions.length > 0 && !selectedAddress && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {predictions.map((prediction) => (
                        <div
                            key={prediction.place_id}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            onClick={() => handleAddressSelect(prediction.place_id, prediction.description)}
                        >
                            <div className="font-medium text-gray-900 dark:text-white">{prediction.structured_formatting?.main_text || prediction.description}</div>
                            {prediction.structured_formatting?.secondary_text && <div className="text-sm text-gray-500 dark:text-gray-400">{prediction.structured_formatting.secondary_text}</div>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // If using legacy form interface, render as form field
    if (name || label || error !== undefined) {
        return (
            <div style={style}>
                {renderFormField()}

                {/* Postcode addresses display for legacy interface */}
                {showPostcodeAddresses && postcodeAddresses.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                            <h6 className="text-sm font-medium text-blue-900 dark:text-blue-100">🏘️ Available Addresses in this Postcode ({postcodeAddresses.length} found)</h6>
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                            {postcodeAddresses.slice(0, 8).map((addr, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                        setSearchText(addr.formatted_address);
                                        if (onChange) {
                                            onChange(addr.formatted_address, undefined, {
                                                address_line1: addr.address_line1 || addr.formatted_address.split(',')[0] || '',
                                                city: addr.city || 'London',
                                                county: '',
                                                postcode: addr.postcode || '',
                                                country: addr.country || 'United Kingdom',
                                            });
                                        }
                                        setPostcodeAddresses([]);
                                    }}
                                    className="text-left p-3 text-sm bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 rounded border border-blue-200 dark:border-blue-600 transition-colors"
                                >
                                    <div className="font-medium text-blue-900 dark:text-blue-100">{addr.formatted_address}</div>
                                    <div className="text-blue-700 dark:text-blue-300 mt-1 text-xs">Source: {addr.source}</div>
                                </button>
                            ))}
                            {postcodeAddresses.length > 8 && (
                                <div className="text-center text-xs text-blue-700 dark:text-blue-300 p-2">... and {postcodeAddresses.length - 8} more addresses (check console for full list)</div>
                            )}
                        </div>
                        <div className="mt-3 text-xs text-blue-700 dark:text-blue-300">💡 Click any address to auto-fill</div>
                    </div>
                )}
            </div>
        );
    }

    // Enhanced interface - return the full component
    return (
        <div style={style} ref={dropdownRef}>
            {renderAutocomplete()}

            {/* Display selected address details */}
            {showDetails && selectedAddress && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                    <div className="flex items-center mb-3">
                        <div className="text-green-600 dark:text-green-400 font-medium">📍 Selected Address Details</div>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">{selectedAddress.formatted_address}</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="font-medium">📍 Coordinates:</span>
                                <div className="font-mono text-xs">
                                    {selectedAddress.coordinates.lat.toFixed(6)}, {selectedAddress.coordinates.lng.toFixed(6)}
                                </div>
                            </div>
                            <div>
                                <span className="font-medium">🏠 Address Line:</span>
                                <div>{selectedAddress.components.address_line1 || 'N/A'}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <span className="font-medium">🏙️ City:</span>
                                <div>{selectedAddress.components.city || 'N/A'}</div>
                            </div>
                            <div>
                                <span className="font-medium">📮 Postcode:</span>
                                <div>{selectedAddress.components.postcode || 'N/A'}</div>
                            </div>
                            <div>
                                <span className="font-medium">🌍 Country:</span>
                                <div>{selectedAddress.components.country || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Postcode addresses display for enhanced interface */}
            {showPostcodeAddresses && postcodeAddresses.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <div className="flex items-center mb-3">
                        <div className="text-blue-600 dark:text-blue-400 font-medium">🏘️ Available Addresses in this Postcode ({postcodeAddresses.length} found)</div>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                        {postcodeAddresses.slice(0, 8).map((addr, index) => (
                            <div
                                key={index}
                                className="p-3 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 rounded border border-blue-200 dark:border-blue-600 cursor-pointer transition-colors"
                                onClick={() => {
                                    if (addr.place_id) {
                                        handleAddressSelect(addr.place_id, addr.formatted_address);
                                    } else {
                                        setSearchText(addr.formatted_address);
                                        const mockCoords = { lat: 51.5074, lng: -0.1278 }; // London coords as fallback
                                        const addressComponents = {
                                            address_line1: addr.address_line1 || addr.formatted_address.split(',')[0] || '',
                                            city: addr.city || 'London',
                                            county: '',
                                            postcode: addr.postcode || '',
                                            country: addr.country || 'United Kingdom',
                                        };

                                        if (onAddressSelect) {
                                            onAddressSelect({
                                                formatted_address: addr.formatted_address,
                                                coordinates: mockCoords,
                                                components: addressComponents,
                                            });
                                        }

                                        if (onChange) {
                                            onChange(addr.formatted_address, mockCoords, addressComponents);
                                        }
                                    }
                                    setPostcodeAddresses([]);
                                }}
                            >
                                <div className="font-medium text-blue-900 dark:text-blue-100">{addr.formatted_address}</div>
                                <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">Source: {addr.source}</div>
                            </div>
                        ))}
                        {postcodeAddresses.length > 8 && (
                            <div className="text-center text-xs text-blue-700 dark:text-blue-300 p-2">... and {postcodeAddresses.length - 8} more addresses (check console for full list)</div>
                        )}
                    </div>
                    <div className="mt-3 text-xs text-blue-700 dark:text-blue-300">💡 Click any address to auto-fill</div>
                </div>
            )}
        </div>
    );
};

export default AddressAutocomplete;
