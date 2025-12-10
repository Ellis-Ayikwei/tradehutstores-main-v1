import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatCurrency } from '../../helper/formatCurrency';
import { UserIcon, MapPinIcon, PhoneIcon, EnvelopeIcon, BuildingOfficeIcon, ArrowLeftIcon, TruckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../services/axiosInstance';
import { Autocomplete } from '@react-google-maps/api';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, IRootState } from '../../store';
import { setBookingDetails, updateBookingDetails } from '../../store/slices/createRequestSlice';
import AddressAutocomplete from '../AddressAutocomplete';
import paymentService from '../../services/paymentService';
import IconLoader from '../Icon/IconLoader';

interface Stop {
    type: 'pickup' | 'dropoff' | 'stop';
    location: string;
    unit_number?: string;
    floor?: string;
    instructions?: string;
    postcode?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    county?: string;
    contact_name?: string;
    contact_phone?: string;
    use_main_contact?: boolean;
}

interface AddressOption {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    organisation_name?: string;
    building_number?: string;
    building_name?: string;
    thoroughfare?: string;
    displayText: string;
    place_id?: string;
}

interface AddressState {
    isSearching: boolean;
    availableAddresses: AddressOption[];
    selectedAddress: AddressOption | null;
    postcodeInput: string;
    showAddressSelect: boolean;
    showManualEntry: boolean;
    error: string | null;
    postcodeOptions: string[];
    showPostcodeDropdown: boolean;
    isPostcodeSelected: boolean;
    searchTimeoutId: NodeJS.Timeout | null;
}

interface BookingDetailsFormProps {
    selectedPrice: {
        price: number;
        staff_count: number;
        date: string;
    };
    requestId: string;
    onBack: () => void;
    initialPostcode?: string;
    isVisible: boolean;
    onComplete: (details: any) => void;
}

const BookingDetailsForm: React.FC<BookingDetailsFormProps> = ({ selectedPrice, requestId, onBack, initialPostcode, onComplete }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch<AppDispatch>();
    const bookingDetails = useSelector((state: IRootState) => state.serviceRequest.bookingDetails);

    const [stops, setStops] = useState<Stop[]>([
        { type: 'pickup', location: '', postcode: initialPostcode, use_main_contact: true },
        { type: 'dropoff', location: '', postcode: initialPostcode, use_main_contact: true },
    ]);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        user_id: '',
        staffCount: selectedPrice.staff_count,
        isBusinessCustomer: false,
    });

    const [isLoading, setIsLoading] = useState(true);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    const [addressStates, setAddressStates] = useState<{
        [key: number]: AddressState;
    }>({});

    const [autoSelectNotification, setAutoSelectNotification] = useState({
        show: false,
        message: '',
    });

    const postcodeRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    // Add new state for request data
    const [requestData, setRequestData] = useState<any>(null);

    // Helper function to get guest user data from localStorage
    const getGuestUserData = () => {
        // Check for enhanced guest user details first
        const storedDetails = localStorage.getItem('guestUserDetails');
        if (storedDetails) {
            try {
                const parsedDetails = JSON.parse(storedDetails);
                // Check if the data is not too old (30 days)
                const savedAt = new Date(parsedDetails.savedAt);
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

                if (savedAt > thirtyDaysAgo) {
                    return {
                        name: parsedDetails.name,
                        email: parsedDetails.email,
                        phone: parsedDetails.phone,
                        user_id: parsedDetails.user_id,
                    };
                } else {
                    // Remove old data
                    localStorage.removeItem('guestUserDetails');
                }
            } catch (error) {
                console.error('Error parsing stored guest details:', error);
                localStorage.removeItem('guestUserDetails');
            }
        }

        // Fall back to legacy guest user data
        const legacyData = localStorage.getItem('guestUserData');
        if (legacyData) {
            try {
                return JSON.parse(legacyData);
            } catch (error) {
                localStorage.removeItem('guestUserData');
            }
        }

        return null;
    };

    const toggleManualEntry = useCallback((stopIndex: number) => {
        setAddressStates((prev) => ({
            ...prev,
            [stopIndex]: {
                ...prev[stopIndex],
                showManualEntry: !prev[stopIndex].showManualEntry,
                showAddressSelect: false,
                selectedAddress: null,
                availableAddresses: [],
            },
        }));
    }, []);

    const selectAddress = useCallback(
        async (address: AddressOption, stopIndex: number) => {
            console.log(`🎯 Address selected:`, address);

            // Set loading state if we're going to fetch place details
            if (address.place_id) {
                setAddressStates((prev) => ({
                    ...prev,
                    [stopIndex]: {
                        ...prev[stopIndex],
                        isSearching: true,
                    },
                }));
            }

            let finalAddress = address;

            // If we have a place_id, get detailed address information
            if (address.place_id) {
                console.log(`🔍 Fetching detailed address information for place_id: ${address.place_id}`);

                const detailedAddress = await getPlaceDetails(address.place_id);
                if (detailedAddress) {
                    // Merge with original address, prioritizing detailed information
                    finalAddress = {
                        ...address,
                        ...detailedAddress,
                        displayText: detailedAddress.displayText || address.displayText,
                        place_id: address.place_id, // Keep original place_id
                    };

                    console.log(`✅ Enhanced address with detailed information:`, finalAddress);
                } else {
                    console.warn(`⚠️ Could not get detailed address, using original:`, address);
                }
            }

            // Update the stops array with complete address information
            const newStops = [...stops];
            newStops[stopIndex] = {
                ...newStops[stopIndex],
                address_line1: finalAddress.line1,
                address_line2: finalAddress.line2 || '',
                city: finalAddress.city,
                county: finalAddress.county || '',
                location: finalAddress.displayText,
                postcode: finalAddress.postcode,
            };
            setStops(newStops);

            // Update address state (turn off loading)
            setAddressStates((prev) => ({
                ...prev,
                [stopIndex]: {
                    ...prev[stopIndex],
                    selectedAddress: finalAddress,
                    showAddressSelect: false,
                    showManualEntry: false,
                    isSearching: false, // Turn off loading
                },
            }));

            // Enhanced console logging when address is selected
            console.log('\n🏠 Final Selected Address Details:');
            console.log(`   - Address: ${finalAddress.displayText}`);
            console.log(`   - Line 1: ${finalAddress.line1}`);
            if (finalAddress.line2) console.log(`   - Line 2: ${finalAddress.line2}`);
            console.log(`   - City: ${finalAddress.city}`);
            console.log(`   - Postcode: ${finalAddress.postcode}`);
            if (finalAddress.county) console.log(`   - County: ${finalAddress.county}`);
            if (finalAddress.organisation_name) console.log(`   - Organisation: ${finalAddress.organisation_name}`);
            console.log(`   - Source: ${finalAddress.place_id ? 'Google Place Details API' : 'Google Places Autocomplete'}`);
            console.log(''); // Empty line for readability
        },
        [stops]
    );

    // Auto-selection notification component
    const AutoSelectNotification = ({ show, message, onDismiss }: { show: boolean; message: string; onDismiss: () => void }) => {
        useEffect(() => {
            if (show) {
                const timer = setTimeout(onDismiss, 3000);
                return () => clearTimeout(timer);
            }
        }, [show, onDismiss]);

        if (!show) return null;

        return (
            <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <span>✨</span>
                <span className="text-sm">{message}</span>
                <button onClick={onDismiss} className="ml-2 text-white/80 hover:text-white">
                    ×
                </button>
            </div>
        );
    };

    // Generate session token for Google Places API billing optimization
    const generateSessionToken = () => {
        return 'session_' + Math.random().toString(36).substr(2, 20);
    };

    // Get detailed address information using Google Place Details API via backend
    const getPlaceDetails = async (placeId: string): Promise<AddressOption | null> => {
        try {
            const sessionToken = generateSessionToken();
            console.log(`🔍 Getting place details for place_id: ${placeId} with session: ${sessionToken}`);

            const response = await fetch(`http://localhost:8000/geocoding/google-place-details/?place_id=${encodeURIComponent(placeId)}&sessiontoken=${encodeURIComponent(sessionToken)}`);

            if (response.ok) {
                const data = await response.json();
                console.log('🏠 Place Details Response:', data);

                if (data.result) {
                    const result = data.result;
                    const addressComponents = result.address_components || [];

                    // Extract address components
                    const getComponent = (type: string) => {
                        const component = addressComponents.find((comp: any) => comp.types.includes(type));
                        return component?.long_name || '';
                    };

                    const getShortComponent = (type: string) => {
                        const component = addressComponents.find((comp: any) => comp.types.includes(type));
                        return component?.short_name || '';
                    };

                    // Build structured address
                    const streetNumber = getComponent('street_number');
                    const route = getComponent('route');
                    const line1 = `${streetNumber} ${route}`.trim();

                    const addressOption: AddressOption = {
                        line1: line1 || getComponent('premise') || result.formatted_address?.split(',')[0] || '',
                        line2: getComponent('subpremise') || getComponent('floor') || '',
                        city: getComponent('postal_town') || getComponent('locality') || getComponent('administrative_area_level_2') || '',
                        county: getComponent('administrative_area_level_1') || '',
                        postcode: getComponent('postal_code'),
                        organisation_name: getComponent('establishment') || getComponent('point_of_interest') || '',
                        building_name: getComponent('premise'),
                        building_number: streetNumber,
                        thoroughfare: route,
                        displayText: result.formatted_address || '',
                    };

                    console.log('✅ Structured Address Details:', addressOption);
                    return addressOption;
                }
            }

            console.warn('Failed to get place details');
            return null;
        } catch (error) {
            console.error('Error getting place details:', error);
            return null;
        }
    };

    // Backend API functions - Using only our backend
    const searchPostcodeSuggestions = async (query: string, stopIndex: number) => {
        if (query.length < 2) {
            setAddressStates((prev) => ({
                ...prev,
                [stopIndex]: {
                    ...prev[stopIndex],
                    postcodeOptions: [],
                    showPostcodeDropdown: false,
                },
            }));
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/geocoding/postcode-suggestions/?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.suggestions && data.suggestions.length > 0) {
                    setAddressStates((prev) => ({
                        ...prev,
                        [stopIndex]: {
                            ...prev[stopIndex],
                            postcodeOptions: data.suggestions,
                            showPostcodeDropdown: true,
                            error: null,
                        },
                    }));
                } else {
                    setAddressStates((prev) => ({
                        ...prev,
                        [stopIndex]: {
                            ...prev[stopIndex],
                            postcodeOptions: [],
                            showPostcodeDropdown: false,
                        },
                    }));
                }
            } else {
                setAddressStates((prev) => ({
                    ...prev,
                    [stopIndex]: {
                        ...prev[stopIndex],
                        postcodeOptions: [],
                        showPostcodeDropdown: false,
                        error: 'Unable to search postcodes. Please enter manually.',
                    },
                }));
            }
        } catch (error) {
            console.error('Error searching postcodes:', error);
            setAddressStates((prev) => ({
                ...prev,
                [stopIndex]: {
                    ...prev[stopIndex],
                    postcodeOptions: [],
                    showPostcodeDropdown: false,
                    error: 'Unable to search postcodes. Please enter manually.',
                },
            }));
        }
    };

    // Fetch addresses for a specific postcode using backend API only
    const fetchAddressesForPostcode = async (postcode: string): Promise<AddressOption[]> => {
        try {
            console.log(`🔍 Fetching addresses for postcode: ${postcode}`);

            // Use our backend API endpoint for postcode address lookup
            const response = await fetch(`http://localhost:8000/geocoding/postcode-addresses-demo/?postcode=${encodeURIComponent(postcode)}`);

            if (response.ok) {
                const data = await response.json();
                console.log('🏠 Backend API Response:', data);

                if (data.addresses && data.addresses.length > 0) {
                    // Transform backend response to our AddressOption format, preserving place_id
                    const addresses: AddressOption[] = data.addresses.map((addr: any) => ({
                        line1: addr.main_text || addr.formatted_address?.split(',')[0] || '',
                        line2: '',
                        city: addr.secondary_text?.split(',')[0] || 'London',
                        county: '',
                        postcode: postcode,
                        organisation_name: '',
                        displayText: addr.formatted_address || `${addr.main_text}, ${addr.secondary_text}`,
                        place_id: addr.place_id, // Preserve place_id for place details lookup
                    }));

                    // Enhanced console logging
                    console.log('\n🏠 Selected Address Details:');
                    console.log(`   - Postcode: ${postcode}`);
                    console.log(`   - Found via: Backend API (Google Places Autocomplete)`);
                    console.log(`   - Search patterns used: ${data.search_patterns_used?.join(', ') || 'multiple'}`);

                    console.log(`\n🏘️ Available Addresses in ${postcode}:`);
                    console.log(`   - Found ${addresses.length} addresses`);
                    addresses.forEach((addr, index) => {
                        console.log(`   ${index + 1}. ${addr.displayText} (place_id: ${addr.place_id || 'N/A'})`);
                    });
                    console.log(''); // Empty line for readability

                    return addresses;
                }
            }

            console.warn('No addresses found via backend API');
            return [];
        } catch (error) {
            console.error('Error fetching addresses from backend:', error);
            return [];
        }
    };

    // Validate postcode using backend API only
    const validatePostcode = async (postcode: string): Promise<{ isValid: boolean; message?: string }> => {
        try {
            const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();

            // Basic UK postcode validation on frontend
            const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
            if (!ukPostcodeRegex.test(cleanPostcode)) {
                return { isValid: false, message: 'Please enter a valid UK postcode' };
            }

            // We could add backend validation here if needed, but for now just return valid for properly formatted postcodes
            return { isValid: true };
        } catch (error) {
            console.error('Error validating postcode:', error);
            return { isValid: false, message: 'Error validating postcode' };
        }
    };

    // Utility functions for address handling
    const formatPostcode = (postcode: string): string => {
        const clean = postcode.replace(/\s+/g, '').toUpperCase();
        if (clean.length > 3) {
            return clean.slice(0, -3) + ' ' + clean.slice(-3);
        }
        return clean;
    };

    // Initialize component data
    useEffect(() => {
        const fetchRequestDetails = async () => {
            try {
                setIsLoading(true);
                const response = await axiosInstance.get(`/requests/${requestId}/`);
                const data = response.data;
                setRequestData(data);
                console.log(' the req data ', data);

                // Get guest user data from localStorage
                const guestData = getGuestUserData();
                console.log('Guest user data from localStorage:', guestData);

                setFormData({
                    name: data.contact_name || guestData?.name || '',
                    email: data.contact_email || guestData?.email || '',
                    phone: data.contact_phone || guestData?.phone || '',
                    user_id: guestData?.user_id || '',
                    staffCount: data.staff_required || selectedPrice.staff_count,
                    isBusinessCustomer: data.is_business || false,
                });

                // Initialize stops based on request type
                const initialStops: Stop[] = [];
                if (data.request_type === 'instant') {
                    console.log('🚚 Processing INSTANT request data:', {
                        journey_stops: data.journey_stops,
                        stops: data.stops,
                        all_locations: data.all_locations,
                        request_type: data.request_type,
                        full_data: data,
                    });

                    // For instant requests, the address data is in journey_stops or stops with location objects
                    const stopsData = data.stops || data.journey_stops || [];

                    if (stopsData.length >= 2) {
                        // Find pickup and dropoff stops
                        const pickupStop = stopsData.find((stop: any) => stop.type === 'pickup');
                        const dropoffStop = stopsData.find((stop: any) => stop.type === 'dropoff');

                        console.log('🚚 Found pickup stop:', pickupStop);
                        console.log('🚚 Found dropoff stop:', dropoffStop);

                        if (pickupStop?.location) {
                            const pickupData = {
                                type: 'pickup' as const,
                                location: pickupStop.location.address || pickupStop.location.address_line1 || '',
                                postcode: pickupStop.location.postcode || '',
                                address_line1: pickupStop.location.address_line1 || '',
                                address_line2: pickupStop.location.address_line2 || '',
                                city: pickupStop.location.city || '',
                                county: pickupStop.location.county || '',
                                use_main_contact: true,
                            };
                            console.log('🚚 Mapped pickup data:', pickupData);
                            initialStops.push(pickupData);
                        }

                        if (dropoffStop?.location) {
                            const dropoffData = {
                                type: 'dropoff' as const,
                                location: dropoffStop.location.address || dropoffStop.location.address_line1 || '',
                                postcode: dropoffStop.location.postcode || '',
                                address_line1: dropoffStop.location.address_line1 || '',
                                address_line2: dropoffStop.location.address_line2 || '',
                                city: dropoffStop.location.city || '',
                                county: dropoffStop.location.county || '',
                                use_main_contact: true,
                            };
                            console.log('🚚 Mapped dropoff data:', dropoffData);
                            initialStops.push(dropoffData);
                        }
                    } else {
                        console.warn('🚚 No stops found in instant request, creating empty stops');
                        // Fallback: create empty stops
                        initialStops.push(
                            {
                                type: 'pickup',
                                location: '',
                                postcode: '',
                                use_main_contact: true,
                            },
                            {
                                type: 'dropoff',
                                location: '',
                                postcode: '',
                                use_main_contact: true,
                            }
                        );
                    }
                } else {
                    console.log('🛣️ Processing JOURNEY request data:', {
                        journey_stops: data.journey_stops,
                        stops: data.stops,
                    });

                    // For journey requests, use journey_stops and properly map to Stop interface
                    const journeyStops = data.journey_stops || [];
                    journeyStops.forEach((stop: any) => {
                        console.log('🛣️ Processing journey stop:', stop);

                        // Handle location - it might be an object or a string
                        let locationString = '';
                        let postcodeString = '';
                        let addressLine1String = '';
                        let addressLine2String = '';
                        let cityString = '';
                        let countyString = '';

                        if (typeof stop.location === 'object' && stop.location !== null) {
                            // Location is an object, extract address details
                            locationString = stop.location.address || stop.location.address_line1 || '';
                            postcodeString = stop.location.postcode || stop.postcode || '';
                            addressLine1String = stop.location.address_line1 || stop.location.address || '';
                            addressLine2String = stop.location.address_line2 || '';
                            cityString = stop.location.city || '';
                            countyString = stop.location.county || '';
                        } else {
                            // Location is a string or fallback to stop properties
                            locationString = stop.location || stop.address || '';
                            postcodeString = stop.postcode || '';
                            addressLine1String = stop.address_line1 || stop.address || '';
                            addressLine2String = stop.address_line2 || '';
                            cityString = stop.city || '';
                            countyString = stop.county || '';
                        }

                        const mappedStop: Stop = {
                            type: stop.type || (initialStops.length === 0 ? 'pickup' : initialStops.length === 1 ? 'dropoff' : 'stop'),
                            location: locationString,
                            postcode: postcodeString,
                            address_line1: addressLine1String,
                            address_line2: addressLine2String,
                            city: cityString,
                            county: countyString,
                            contact_name: stop.contact_name || '',
                            contact_phone: stop.contact_phone || '',
                            instructions: stop.special_instructions || stop.instructions || '',
                            use_main_contact: stop.use_main_contact ?? true,
                        };

                        console.log('🛣️ Mapped journey stop:', mappedStop);
                        initialStops.push(mappedStop);
                    });

                    // Ensure we have at least pickup and dropoff stops
                    if (initialStops.length === 0) {
                        console.log('🛣️ No journey stops found, creating default stops');
                        initialStops.push(
                            {
                                type: 'pickup',
                                location: '',
                                postcode: '',
                                use_main_contact: true,
                            },
                            {
                                type: 'dropoff',
                                location: '',
                                postcode: '',
                                use_main_contact: true,
                            }
                        );
                    }
                }
                setStops(initialStops);

                console.log('🎯 Final initialized stops:', initialStops);

                // Initialize address states with postcodes and auto-fetch addresses if postcode exists
                const initialAddressStates: any = {};
                initialStops.forEach((stop: Stop, index: number) => {
                    initialAddressStates[index] = {
                        isSearching: false,
                        availableAddresses: [],
                        selectedAddress: null,
                        postcodeInput: stop.postcode || '',
                        showAddressSelect: false,
                        showManualEntry: false,
                        error: null,
                        postcodeOptions: [],
                        showPostcodeDropdown: false,
                        isPostcodeSelected: !!stop.postcode,
                        searchTimeoutId: null,
                    };
                });
                setAddressStates(initialAddressStates);

                console.log('🎯 Initialized address states:', initialAddressStates);

                // Auto-fetch addresses if postcodes exist in the request
                for (let index = 0; index < initialStops.length; index++) {
                    const stop = initialStops[index];
                    if (stop.postcode) {
                        console.log(`🔄 Auto-fetching addresses for existing postcode: ${stop.postcode} (Stop ${index + 1}: ${stop.type})`);
                        await validateAndSearchPostcode(stop.postcode, index);
                    } else {
                        console.log(`ℹ️ No postcode for Stop ${index + 1} (${stop.type}), skipping auto-fetch`);
                    }
                }

                dispatch(
                    setBookingDetails({
                        name: data.contact_name || guestData?.name || '',
                        email: data.contact_email || guestData?.email || '',
                        phone: data.contact_phone || guestData?.phone || '',
                        staffCount: data.staff_required || selectedPrice.staff_count,
                        stops: initialStops,
                        request_type: data.request_type || 'journey',
                    })
                );
            } catch (error) {
                console.error('Error fetching request details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRequestDetails();
    }, [requestId, initialPostcode, selectedPrice.staff_count, dispatch]);

    // Initialize address states when stops change
    useEffect(() => {
        const newAddressStates: any = {};
        stops.forEach((stop, index) => {
            if (!addressStates[index]) {
                newAddressStates[index] = {
                    isSearching: false,
                    availableAddresses: [],
                    selectedAddress: null,
                    postcodeInput: stop.postcode || '',
                    showAddressSelect: false,
                    showManualEntry: false,
                    error: null,
                    postcodeOptions: [],
                    showPostcodeDropdown: false,
                    isPostcodeSelected: !!stop.postcode,
                    searchTimeoutId: null,
                };
            } else {
                newAddressStates[index] = addressStates[index];
            }
        });
        if (Object.keys(newAddressStates).length > 0) {
            setAddressStates((prev) => ({ ...prev, ...newAddressStates }));
        }
    }, [stops]);

    // Handle clicks outside postcode dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            Object.keys(postcodeRefs.current).forEach((key) => {
                const index = parseInt(key);
                const ref = postcodeRefs.current[index];
                if (ref && !ref.contains(event.target as Node)) {
                    setAddressStates((prev) => ({
                        ...prev,
                        [index]: {
                            ...prev[index],
                            showPostcodeDropdown: false,
                        },
                    }));
                }
            });
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Handle postcode input changes with debouncing
    const handlePostcodeInputChange = useCallback(
        (value: string, stopIndex: number) => {
            const addressState = addressStates[stopIndex];

            // Clear existing timeout
            if (addressState?.searchTimeoutId) {
                clearTimeout(addressState.searchTimeoutId);
            }

            setAddressStates((prev) => ({
                ...prev,
                [stopIndex]: {
                    ...prev[stopIndex],
                    postcodeInput: value,
                    isPostcodeSelected: false,
                    error: null,
                    showAddressSelect: false,
                    selectedAddress: null,
                    availableAddresses: [],
                },
            }));

            // Set new timeout for search
            const timeoutId = setTimeout(() => {
                searchPostcodeSuggestions(value, stopIndex);
            }, 300);

            setAddressStates((prev) => ({
                ...prev,
                [stopIndex]: {
                    ...prev[stopIndex],
                    searchTimeoutId: timeoutId,
                },
            }));
        },
        [addressStates]
    );

    // Handle postcode selection from dropdown
    const selectPostcode = async (postcode: string, stopIndex: number) => {
        setAddressStates((prev) => ({
            ...prev,
            [stopIndex]: {
                ...prev[stopIndex],
                postcodeInput: postcode,
                showPostcodeDropdown: false,
                isPostcodeSelected: true,
                isSearching: true,
                error: null,
            },
        }));

        // Update stop with selected postcode
        const newStops = [...stops];
        newStops[stopIndex] = {
            ...newStops[stopIndex],
            postcode: postcode,
        };
        setStops(newStops);

        // Fetch addresses for this postcode
        await validateAndSearchPostcode(postcode, stopIndex);
    };

    // Updated postcode validation and address fetching using backend API only
    const validateAndSearchPostcode = async (postcode: string, stopIndex: number) => {
        if (!postcode.trim()) return;

        const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
        const formattedPostcode = formatPostcode(cleanPostcode);

        console.log(`🔍 Validating and searching postcode: ${formattedPostcode} for stop ${stopIndex + 1}`);

        setAddressStates((prev) => ({
            ...prev,
            [stopIndex]: {
                ...prev[stopIndex],
                isSearching: true,
                error: null,
                showAddressSelect: false,
            },
        }));

        try {
            // Validate postcode format
            const validation = await validatePostcode(formattedPostcode);

            if (!validation.isValid) {
                setAddressStates((prev) => ({
                    ...prev,
                    [stopIndex]: {
                        ...prev[stopIndex],
                        error: validation.message || 'Invalid postcode format',
                        showAddressSelect: false,
                        availableAddresses: [],
                        isSearching: false,
                    },
                }));
                return;
            }

            // Update stop with formatted postcode
            const newStops = [...stops];
            newStops[stopIndex] = {
                ...newStops[stopIndex],
                postcode: formattedPostcode,
            };
            setStops(newStops);

            // Fetch addresses from backend
            const addresses = await fetchAddressesForPostcode(formattedPostcode);

            if (addresses && addresses.length > 0) {
                // Show address selection
                setAddressStates((prev) => ({
                    ...prev,
                    [stopIndex]: {
                        ...prev[stopIndex],
                        isSearching: false,
                        availableAddresses: addresses,
                        showAddressSelect: true,
                        postcodeInput: formattedPostcode,
                        error: null,
                        isPostcodeSelected: true,
                    },
                }));

                console.log(`✅ Successfully loaded ${addresses.length} addresses for postcode: ${formattedPostcode}`);
            } else {
                // No addresses found - show manual entry option
                setAddressStates((prev) => ({
                    ...prev,
                    [stopIndex]: {
                        ...prev[stopIndex],
                        isSearching: false,
                        availableAddresses: [],
                        showAddressSelect: false,
                        error: 'No addresses found for this postcode. You can enter your address manually.',
                        showManualEntry: false,
                    },
                }));

                console.log(`⚠️ No addresses found for postcode: ${formattedPostcode}`);
            }
        } catch (error: any) {
            console.error('Error validating postcode or fetching addresses:', error);
            setAddressStates((prev) => ({
                ...prev,
                [stopIndex]: {
                    ...prev[stopIndex],
                    isSearching: false,
                    availableAddresses: [],
                    showAddressSelect: false,
                    error: 'Error loading addresses from backend. You can enter your address manually.',
                },
            }));
        }
    };

    // Enhanced address selection UI component
    const renderAddressSelection = (stopIndex: number) => {
        const addressState = addressStates[stopIndex];

        if (!addressState?.showAddressSelect || addressState.selectedAddress) return null;

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="block text-sm text-gray-600 dark:text-gray-400">
                        Select Address ({stops[stopIndex].postcode}) - {addressState.availableAddresses.length} found
                        {addressState.isSearching && <span className="ml-2 text-blue-600">🔄 Getting details...</span>}
                    </label>
                    <button type="button" onClick={() => editPostcode(stopIndex)} className="text-sm text-blue-600 hover:text-blue-800 underline">
                        Change Postcode
                    </button>
                </div>

                {/* Enhanced info banner */}
                <div className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded flex items-center gap-2">
                    <span>🏘️</span>
                    <span>We found multiple addresses for your postcode - choose the one that matches your location</span>
                </div>

                {/* Address dropdown */}
                <div className="space-y-2">
                    <select
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        onChange={async (e) => {
                            if (e.target.value) {
                                const addressIndex = parseInt(e.target.value);
                                const address = addressState.availableAddresses[addressIndex];
                                await selectAddress(address, stopIndex);

                                // Enhanced console logging when address is selected
                                console.log('\n🏠 Address Selected from Dropdown:');
                                console.log(`   - Selected: ${address.displayText}`);
                                console.log(`   - Has place_id: ${address.place_id ? 'Yes' : 'No'}`);
                                if (address.place_id) {
                                    console.log(`   - Will fetch detailed information from Google Place Details API`);
                                }
                                console.log(''); // Empty line for readability
                            }
                        }}
                        value=""
                    >
                        <option value="">📋 Select an address...</option>
                        {addressState.availableAddresses.map((address, addrIndex) => {
                            const typeIndicator = address.organisation_name ? '🏢' : '🏠';
                            const orgText = address.organisation_name ? ` (${address.organisation_name})` : '';

                            return (
                                <option key={addrIndex} value={addrIndex}>
                                    {typeIndicator} {address.displayText}
                                    {orgText}
                                </option>
                            );
                        })}
                    </select>

                    {/* Address previews */}
                    <div className="max-h-40 overflow-y-auto space-y-1">
                        {addressState.availableAddresses.map((address, addrIndex) => (
                            <button
                                key={addrIndex}
                                type="button"
                                onClick={async () => {
                                    await selectAddress(address, stopIndex);

                                    // Enhanced console logging when address is clicked
                                    console.log('\n🏠 Address Selected from Click:');
                                    console.log(`   - Selected: ${address.displayText}`);
                                    console.log(`   - Has place_id: ${address.place_id ? 'Yes' : 'No'}`);
                                    if (address.place_id) {
                                        console.log(`   - Will fetch detailed information from Google Place Details API`);
                                    }
                                    console.log(''); // Empty line for readability
                                }}
                                className="w-full text-left p-3 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded border border-gray-200 dark:border-gray-600 transition-colors"
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-lg mt-0.5">{address.organisation_name ? '🏢' : '🏠'}</span>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white">{address.line1}</div>
                                        {address.line2 && <div className="text-gray-600 dark:text-gray-400">{address.line2}</div>}
                                        <div className="text-gray-600 dark:text-gray-400">{address.city}</div>
                                        {address.organisation_name && <div className="text-blue-600 dark:text-blue-400 font-medium mt-1">{address.organisation_name}</div>}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Manual Entry Option */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button type="button" onClick={() => toggleManualEntry(stopIndex)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline">
                        ✏️ Can't find your address? Enter it manually
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">You can type your full address if it's not listed above.</p>
                </div>
            </div>
        );
    };

    const editPostcode = useCallback(
        (stopIndex: number) => {
            // Reset address state to allow new postcode entry
            setAddressStates((prev) => ({
                ...prev,
                [stopIndex]: {
                    ...prev[stopIndex],
                    showAddressSelect: false,
                    showManualEntry: false,
                    selectedAddress: null,
                    availableAddresses: [],
                    error: null,
                    isPostcodeSelected: false,
                    postcodeOptions: [],
                    showPostcodeDropdown: false,
                },
            }));

            // Clear address fields but keep postcode for editing
            const newStops = [...stops];
            newStops[stopIndex] = {
                ...newStops[stopIndex],
                address_line1: '',
                address_line2: '',
                city: '',
                county: '',
                location: '',
            };
            setStops(newStops);
        },
        [stops]
    );

    const toggleUseMainContact = useCallback(
        (stopIndex: number) => {
            const newStops = [...stops];
            newStops[stopIndex] = {
                ...newStops[stopIndex],
                use_main_contact: !newStops[stopIndex].use_main_contact,
                contact_name: newStops[stopIndex].use_main_contact ? '' : formData.name,
                contact_phone: newStops[stopIndex].use_main_contact ? '' : formData.phone,
            };
            setStops(newStops);
        },
        [stops, formData.name, formData.phone]
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setPaymentLoading(true);
            setPaymentError(null);

            // Step 1: Update booking details on the backend
            const requestData = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                user_id: formData.user_id,
                is_business: formData.isBusinessCustomer,
                journey_stops: stops.map((stop, index) => ({
                    ...stop,
                    sequence: index,
                    type: stop.type,
                    location: typeof stop.location === 'string' ? stop.location : '',
                    address: typeof stop.location === 'string' ? stop.location : '', // Map location to address for backend
                    postcode: typeof stop.postcode === 'string' ? stop.postcode : '',
                    address_line1: typeof stop.address_line1 === 'string' ? stop.address_line1 : '',
                    address_line2: typeof stop.address_line2 === 'string' ? stop.address_line2 : '',
                    city: typeof stop.city === 'string' ? stop.city : '',
                    county: typeof stop.county === 'string' ? stop.county : '',
                    contact_name: stop.use_main_contact ? formData.name : typeof stop.contact_name === 'string' ? stop.contact_name : '',
                    contact_phone: stop.use_main_contact ? formData.phone : typeof stop.contact_phone === 'string' ? stop.contact_phone : '',
                    // Only include items for journey type requests in step 2
                    items: bookingDetails?.request_type === 'journey' ? bookingDetails.moving_items : undefined,
                })),
                staff_count: formData.staffCount,
                request_type: bookingDetails?.request_type || 'journey',
                // Only include moving_items for instant type requests in step 3
                moving_items: bookingDetails?.request_type === 'instant' ? bookingDetails.moving_items : undefined,
                // Add payment status
                status: 'confirmed',
                confirmed_at: new Date().toISOString(),
            };

            console.log('📋 Updating booking details before payment:', requestData);

            const response = await axiosInstance.post(`/requests/${requestId}/update_details/`, requestData);

            if (response.status === 200) {
                console.log('✅ Booking details updated successfully');

                // Step 2: Update Redux store
                const bookingDetailsAction = setBookingDetails({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    staffCount: formData.staffCount,
                    stops: stops,
                    request_type: bookingDetails?.request_type || 'journey',
                    moving_items: bookingDetails?.moving_items,
                });

                dispatch(bookingDetailsAction);

                // Step 3: Create Stripe Checkout session and redirect
                console.log('💳 Creating Stripe Checkout session...');

                const session = await paymentService.createCheckoutSession({
                    request_id: requestId,
                    amount: selectedPrice.price,
                    currency: 'USD', // You can make this dynamic based on your requirements
                    success_url: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${requestId}`,
                    cancel_url: `${window.location.origin}/payment/cancel?booking_id=${requestId}`,
                    description: `Book & Pay for ${bookingDetails?.request_type || 'Moving Service'} - Booking ${requestId}`,
                });

                console.log('🚀 Redirecting to Stripe Checkout:', session.url);

                // Immediately redirect to Stripe Checkout
                window.location.href = session.url;
            } else {
                throw new Error('Failed to update booking details');
            }
        } catch (error) {
            console.error('❌ Error in booking process:', error);
            setPaymentLoading(false);

            if (error instanceof Error) {
                setPaymentError(error.message);
            } else {
                setPaymentError('Failed to process booking and payment. Please try again.');
            }
        }
    };

    const renderStopForm = (stop: Stop, index: number) => {
        const addressState = addressStates[index] || {
            isSearching: false,
            availableAddresses: [],
            selectedAddress: null,
            postcodeInput: '',
            showAddressSelect: false,
            showManualEntry: false,
            error: null,
            postcodeOptions: [],
            showPostcodeDropdown: false,
            isPostcodeSelected: false,
            searchTimeoutId: null,
        };

        const isPickup = stop.type === 'pickup';
        const stopTitle = isPickup ? 'Pickup Details' : 'Delivery Details';

        // Format address preview
        const getAddressPreview = () => {
            if (addressState.selectedAddress) {
                return addressState.selectedAddress.displayText;
            }
            if (stop.address_line1 && stop.city) {
                return `${stop.address_line1}${stop.address_line2 ? `, ${stop.address_line2}` : ''}, ${stop.city}`;
            }
            // Ensure we always return a string, not an object
            const location = typeof stop.location === 'string' ? stop.location : '';
            return location || 'No address selected';
        };

        return (
            <div key={index} className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{stopTitle}</h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400 max-w-md truncate">{getAddressPreview()}</div>
                    </div>

                    {/* Address Section */}
                    <div className="space-y-4 mb-6">
                        <h5 className="font-medium text-gray-900 dark:text-white">Address</h5>

                        {/* Postcode Input - only show if no address selected and not in manual entry mode */}
                        {!addressState.selectedAddress && !addressState.showManualEntry && !(stop.address_line1 && stop.city && addressState.isPostcodeSelected) && (
                            <div className="space-y-2">
                                <label className="block text-sm text-gray-600 dark:text-gray-400">{addressState.isPostcodeSelected ? 'Selected Postcode' : 'Enter Postcode'}</label>
                                <div className="relative" ref={(el) => (postcodeRefs.current[index] = el)}>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                            placeholder="Start typing postcode (e.g. SW1A)"
                                            value={addressState.postcodeInput}
                                            onChange={(e) => handlePostcodeInputChange(e.target.value, index)}
                                            onFocus={() => {
                                                if (!addressState.isPostcodeSelected && addressState.postcodeInput.length >= 2) {
                                                    searchPostcodeSuggestions(addressState.postcodeInput, index);
                                                }
                                            }}
                                            disabled={addressState.isPostcodeSelected}
                                        />

                                        {addressState.isPostcodeSelected && (
                                            <button
                                                type="button"
                                                onClick={() => editPostcode(index)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 text-sm underline"
                                            >
                                                Edit
                                            </button>
                                        )}

                                        {addressState.isSearching && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Postcode Suggestions Dropdown */}
                                    {addressState.showPostcodeDropdown && addressState.postcodeOptions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                            {addressState.postcodeOptions.map((postcode, optionIndex) => (
                                                <button
                                                    key={optionIndex}
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-white first:rounded-t-md last:rounded-b-md"
                                                    onClick={() => selectPostcode(postcode, index)}
                                                >
                                                    {postcode}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {addressState.error && <p className="text-sm text-red-600 dark:text-red-400">{addressState.error}</p>}
                            </div>
                        )}

                        {/* Address Selection */}
                        {renderAddressSelection(index)}

                        {/* Manual Address Entry */}
                        {addressState.showManualEntry && !addressState.selectedAddress && (
                            <div className="space-y-3 border border-gray-200 dark:border-gray-600 p-4 rounded-md">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">Manual Address Entry ({stop.postcode})</span>
                                    <button type="button" onClick={() => toggleManualEntry(index)} className="text-sm text-gray-600 hover:text-gray-800 underline">
                                        ← Back to Address Selection
                                    </button>
                                </div>

                                {/* Enhanced AddressAutocomplete option */}
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                    <h6 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">🌍 Search Any Address Worldwide</h6>
                                    <AddressAutocomplete
                                        name={`manual_address_${index}`}
                                        placeholder="Search worldwide addresses..."
                                        value={stop.location || ''}
                                        onChange={(value, coords, addressDetails) => {
                                            console.log(`🌍 Enhanced Address Selected for ${isPickup ? 'Pickup' : 'Delivery'}:`, { value, coords, addressDetails });

                                            // Update the stop with enhanced address information
                                            const newStops = [...stops];
                                            newStops[index] = {
                                                ...newStops[index],
                                                location: value,
                                                address_line1: addressDetails?.address_line1 || value.split(',')[0] || '',
                                                address_line2: '', // Enhanced autocomplete handles full address
                                                city: addressDetails?.city || '',
                                                county: addressDetails?.county || '',
                                                postcode: addressDetails?.postcode || stop.postcode,
                                            };
                                            setStops(newStops);

                                            // Exit manual entry mode
                                            setAddressStates((prev) => ({
                                                ...prev,
                                                [index]: {
                                                    ...prev[index],
                                                    showManualEntry: false,
                                                },
                                            }));
                                        }}
                                        showPostcodeAddresses={true}
                                        onPostcodeAddressesFound={(addresses) => {
                                            console.log(`🏘️ Enhanced: Found ${addresses.length} additional addresses for ${isPickup ? 'Pickup' : 'Delivery'} via worldwide search`);
                                        }}
                                    />
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Start typing any address and we'll help you find it</p>
                                </div>

                                <div className="text-center text-sm text-gray-500 dark:text-gray-400 my-3">
                                    <span>OR</span>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Address Line 1 *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. 123 High Street"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                            value={typeof stop.address_line1 === 'string' ? stop.address_line1 : ''}
                                            onChange={(e) => {
                                                const newStops = [...stops];
                                                newStops[index].address_line1 = e.target.value;
                                                // Update location display
                                                const locationParts = [];
                                                if (e.target.value) locationParts.push(e.target.value);
                                                if (newStops[index].address_line2) locationParts.push(newStops[index].address_line2);
                                                if (newStops[index].city) locationParts.push(newStops[index].city);
                                                newStops[index].location = locationParts.join(', ');
                                                setStops(newStops);
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Address Line 2</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Flat 2, Building name"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                            value={typeof stop.address_line2 === 'string' ? stop.address_line2 : ''}
                                            onChange={(e) => {
                                                const newStops = [...stops];
                                                newStops[index].address_line2 = e.target.value;
                                                // Update location display
                                                const locationParts = [];
                                                if (newStops[index].address_line1) locationParts.push(newStops[index].address_line1);
                                                if (e.target.value) locationParts.push(e.target.value);
                                                if (newStops[index].city) locationParts.push(newStops[index].city);
                                                newStops[index].location = locationParts.join(', ');
                                                setStops(newStops);
                                            }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">City/Town *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. London"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                                value={typeof stop.city === 'string' ? stop.city : ''}
                                                onChange={(e) => {
                                                    const newStops = [...stops];
                                                    newStops[index].city = e.target.value;
                                                    // Update location display
                                                    const locationParts = [];
                                                    if (newStops[index].address_line1) locationParts.push(newStops[index].address_line1);
                                                    if (newStops[index].address_line2) locationParts.push(newStops[index].address_line2);
                                                    if (e.target.value) locationParts.push(e.target.value);
                                                    newStops[index].location = locationParts.join(', ');
                                                    setStops(newStops);
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">County</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Greater London"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                                value={typeof stop.county === 'string' ? stop.county : ''}
                                                onChange={(e) => {
                                                    const newStops = [...stops];
                                                    newStops[index].county = e.target.value;
                                                    setStops(newStops);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                    💡 Tip: Your postcode ({stop.postcode}) is valid. Use the search above or complete your address details manually.
                                </div>
                            </div>
                        )}

                        {/* Manual Entry Display (when completed) */}
                        {!addressState.selectedAddress && !addressState.showManualEntry && !addressState.showAddressSelect && stop.address_line1 && stop.city && addressState.isPostcodeSelected && (
                            <div className="space-y-3 bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        <span className="text-lg">✏️</span>
                                        Manual Address Entry
                                    </span>
                                    <button type="button" onClick={() => editPostcode(index)} className="text-sm text-blue-600 hover:text-blue-800 underline">
                                        Change
                                    </button>
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                    <p className="font-medium">{stop.address_line1}</p>
                                    {stop.address_line2 && <p>{stop.address_line2}</p>}
                                    <p>
                                        {stop.city}, {stop.postcode}
                                    </p>
                                    {stop.county && <p>{stop.county}</p>}
                                </div>

                                <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">✓ Address confirmed and saved</div>
                            </div>
                        )}

                        {/* No addresses found or API error - show manual entry option */}
                        {addressState.error &&
                            !addressState.showManualEntry &&
                            !addressState.selectedAddress &&
                            (addressState.error.includes('No addresses found') || addressState.error.includes('Error loading addresses')) && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">{addressState.error}</p>
                                    <button
                                        type="button"
                                        onClick={() => toggleManualEntry(index)}
                                        className="text-sm bg-yellow-100 text-yellow-800 px-3 py-2 rounded hover:bg-yellow-200 transition-colors flex items-center gap-2"
                                    >
                                        ✏️ Enter Address Manually
                                    </button>
                                </div>
                            )}

                        {/* Other errors */}
                        {addressState.error &&
                            !addressState.showManualEntry &&
                            !addressState.selectedAddress &&
                            !addressState.error.includes('No addresses found') &&
                            !addressState.error.includes('Error loading addresses') && (
                                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                                    <p className="text-sm text-red-600 dark:text-red-400">{addressState.error}</p>
                                </div>
                            )}

                        {/* Selected Address Display */}
                        {addressState.selectedAddress && (
                            <div className="space-y-3 bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        <span className="text-lg">{addressState.selectedAddress.organisation_name ? '🏢' : '🏠'}</span>
                                        Selected Address
                                    </span>
                                    <button type="button" onClick={() => editPostcode(index)} className="text-sm text-blue-600 hover:text-blue-800 underline">
                                        Change
                                    </button>
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                    <p className="font-medium">{addressState.selectedAddress.line1}</p>
                                    {addressState.selectedAddress.line2 && <p>{addressState.selectedAddress.line2}</p>}
                                    <p>
                                        {addressState.selectedAddress.city}, {addressState.selectedAddress.postcode}
                                    </p>
                                    {addressState.selectedAddress.organisation_name && (
                                        <p className="text-blue-600 dark:text-blue-400 font-medium mt-1">📍 {addressState.selectedAddress.organisation_name}</p>
                                    )}
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">✓ Address confirmed and saved</div>
                            </div>
                        )}
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-4">
                        <h5 className="font-medium text-gray-900 dark:text-white">Contact Details</h5>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id={`use-main-contact-${index}`}
                                checked={stop.use_main_contact}
                                onChange={() => toggleUseMainContact(index)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`use-main-contact-${index}`} className="text-sm text-gray-700 dark:text-gray-300">
                                Use my contact details
                            </label>
                        </div>

                        {!stop.use_main_contact && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Contact Name at {isPickup ? 'Pickup' : 'Delivery'}</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                        value={typeof stop.contact_name === 'string' ? stop.contact_name : ''}
                                        onChange={(e) => {
                                            const newStops = [...stops];
                                            newStops[index].contact_name = e.target.value;
                                            setStops(newStops);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{isPickup ? 'Pickup' : 'Delivery'} Contact Number</label>
                                    <input
                                        type="tel"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                        value={typeof stop.contact_phone === 'string' ? stop.contact_phone : ''}
                                        onChange={(e) => {
                                            const newStops = [...stops];
                                            newStops[index].contact_phone = e.target.value;
                                            setStops(newStops);
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {!stop.use_main_contact && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md">
                                It is your responsibility to make this person aware that MoreVan and a driver will contact them during the course of the job. By clicking 'Book Now' you are authorising
                                AnyVan to share essential booking information with this person and a driver.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 flex items-center justify-center">
                <div className="text-center">
                    <IconLoader />
                    <p className="text-gray-600 dark:text-gray-400">Loading booking details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Confirm your details</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">Quote ref: {requestId}</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(selectedPrice.price)}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Your Booking Details */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Booking Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">First and Last Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="business-customer"
                                    checked={formData.isBusinessCustomer}
                                    onChange={(e) => setFormData({ ...formData, isBusinessCustomer: e.target.checked })}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="business-customer" className="text-sm text-gray-700 dark:text-gray-300">
                                    I am a business customer
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Stops */}
                    {stops.map((stop, index) => renderStopForm(stop, index))}

                    {/* Payment Error Display */}
                    {paymentError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Booking Error</h3>
                                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">{paymentError}</div>
                                    <div className="mt-3">
                                        <button type="button" onClick={() => setPaymentError(null)} className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors">
                                            Try Again
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-6">
                        <motion.button
                            whileHover={!paymentLoading ? { scale: 1.02 } : {}}
                            whileTap={!paymentLoading ? { scale: 0.98 } : {}}
                            type="submit"
                            disabled={paymentLoading}
                            className={`px-8 py-3 rounded-lg font-medium transition-colors shadow-lg flex items-center gap-2 ${
                                paymentLoading ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            {paymentLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <span>💳</span>
                                    <span>Book & Pay {formatCurrency(selectedPrice.price)}</span>
                                </>
                            )}
                        </motion.button>
                    </div>

                    {/* Payment Info */}
                    {!paymentLoading && (
                        <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
                            <p>🔒 Secure payment powered by Stripe</p>
                            <p>You'll be redirected to complete your payment securely</p>
                        </div>
                    )}
                </form>
            </div>

            {/* Auto-selection notification */}
            <AutoSelectNotification show={autoSelectNotification.show} message={autoSelectNotification.message} onDismiss={() => setAutoSelectNotification({ show: false, message: '' })} />
        </div>
    );
};

export default BookingDetailsForm;
