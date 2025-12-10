import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import useSWR from 'swr';
import axiosInstance from '../../../services/axiosInstance';
import fetcher from '../../../services/fetcher';
import showMessage from '../../../helper/showMessage';
import showRequestError from '../../../helper/showRequestError';
import {
    IconUser,
    IconMapPin,
    IconPackage,
    IconCurrencyPound,
    IconCalendar,
    IconSettings,
    IconPlus,
    IconEdit,
    IconTrash,
    IconDeviceFloppy,
    IconRefresh,
    IconAlertCircle,
    IconCheck,
    IconX,
    IconClock,
    IconTruck,
    IconWeight,
    IconRuler,
    IconPhoto,
    IconFileText,
    IconShield,
    IconRoute
} from '@tabler/icons-react';
import { classNames } from './utils/classNames';
import RequestBasicInfoTab from './tabs/RequestBasicInfoTab';
import RequestItemsTab from './tabs/RequestItemsTab';
import RequestPricingTab from './tabs/RequestPricingTab';
import RequestLocationsTab from './tabs/RequestLocationsTab';
import RequestTimingTab from './tabs/RequestTimingTab';
import RequestAdditionalTab from './tabs/RequestAdditionalTab';
import RequestDocumentsTab from './tabs/RequestDocumentsTab';
import PriceForecastModal from './modals/PriceForecastModal';
import NotificationModal from './modals/NotificationModal';
import EnhancedFeaturesSummary from './components/EnhancedFeaturesSummary';
import { ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';

// Types
interface Request {
    id: string;
    user: string;
    driver?: string;
    provider?: string;
    request_type: 'biddable' | 'instant' | 'journey';
    status: string;
    priority: string;
    service_level: string;
    service_type: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    booking_code: string;
    pickup_location?: any;
    dropoff_location?: any;
    pickup_locations: any[];
    dropoff_locations: any[];
    preferred_pickup_date: string;
    preferred_pickup_time: string;
    preferred_pickup_time_window: any;
    preferred_delivery_date: string;
    preferred_delivery_time: string;
    is_flexible: boolean;
    items_description: string;
    total_weight: number;
    dimensions: any;
    requires_special_handling: boolean;
    special_instructions: string;
    staff_required: number;
    moving_items: any[];
    photo_urls: string[];
    base_price: number;
    final_price: number;
    price_factors: any;
    tracking_number: string;
    insurance_required: boolean;
    insurance_value: number;
    payment_status: string;
    cancellation_reason: string;
    cancellation_time: string;
    cancellation_fee: number;
    route_optimization_data: any;
    weather_conditions: any;
    carbon_footprint: number;
    estimated_fuel_consumption: number;
    estimated_completion_time: string;
    estimated_duration: string;
    estimated_distance: number;
    route_waypoints: any[];
    loading_time: string;
    unloading_time: string;
    price_breakdown: any;
    meta_data: any;
    created_at: string;
    updated_at: string;
}

interface MovingItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
        unit: string;
    };
    fragile: boolean;
    special_handling: boolean;
    notes?: string;
}

interface Location {
    id: string;
    address: string;
    postcode: string;
    city: string;
    country: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    contact_name?: string;
    contact_phone?: string;
    access_instructions?: string;
    type?: string; // Added for API compatibility
}

interface AdminRequestEditorProps {
    requestId?: string;
}

const AdminRequestEditor: React.FC<AdminRequestEditorProps> = ({ requestId }) => {
    const { id: urlId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const id = requestId || urlId;
    const [selectedTab, setSelectedTab] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPriceForecast, setShowPriceForecast] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [pendingChanges, setPendingChanges] = useState(false);
    const [hasBasicChanges, setHasBasicChanges] = useState<boolean>(false);
    const [hasItemsChanges, setHasItemsChanges] = useState<boolean>(false);
    const [hasLocationsChanges, setHasLocationsChanges] = useState<boolean>(false);
    const [hasTimingChanges, setHasTimingChanges] = useState<boolean>(false);
    const [hasPricingChanges, setHasPricingChanges] = useState<boolean>(false);
    const [hasAdditionalChanges, setHasAdditionalChanges] = useState<boolean>(false);

    // Form state
    const [formData, setFormData] = useState<Partial<Request>>({});
    const [movingItems, setMovingItems] = useState<MovingItem[]>([]);
    const [pickupLocations, setPickupLocations] = useState<Location[]>([]);
    const [dropoffLocations, setDropoffLocations] = useState<Location[]>([]);
    const [priceForecast, setPriceForecast] = useState<any>(null);
    const [selectedPriceOption, setSelectedPriceOption] = useState<any>(null);

    // Enhanced state management for item selection (matching InstantRequest/JourneyRequest)
    const [itemQuantities, setItemQuantities] = useState<{[key: string]: number}>({});
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [deletingItems, setDeletingItems] = useState<{[key: string]: boolean}>({});
    
    // Track original state to detect changes
    const [originalSelectedItems, setOriginalSelectedItems] = useState<any[]>([]);
    const [hasChanges, setHasChanges] = useState<boolean>(false);

    // Fetch request data using instant request endpoint
    const { data: requestData, error: requestError, isLoading: requestLoading, mutate } = useSWR(
        id ? `/instant-requests/${id}/` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            keepPreviousData: true,
        }
    );


    // Fetch additional data
    const { data: commonItems } = useSWR('/common-items/categories_with_items/', fetcher);
    const { data: locations } = useSWR('/locations/', fetcher);
    const { data: serviceCategories } = useSWR('/service-categories/', fetcher);
    const { data: services } = useSWR('/services/', fetcher);
    const { data: providers } = useSWR('/providers/', fetcher);
    const { data: drivers } = useSWR('/drivers/', fetcher);

    // Initialize form data when request loads
    useEffect(() => {
        if (requestData) {
            // Ensure service_id is included from service object if available
            const initialFormData = {
                ...requestData,
                service_id: requestData.service_id || requestData.service?.id || null
            };
            setFormData(initialFormData);
            // Initialize with items from requestData
            if (requestData?.items) {
                setMovingItems(requestData?.items);
            }
            
            // Handle locations from the actual API structure
            const allLocations: Location[] = requestData?.all_locations || [];
            const pickupLocs = allLocations.filter((loc: Location) => loc.type === 'pickup');
            const dropoffLocs = allLocations.filter((loc: Location) => loc.type === 'dropoff');
            
            setPickupLocations(pickupLocs);
            setDropoffLocations(dropoffLocs);

            // Initialize simple state
            setItemQuantities({});
            setSelectedItems([]);
            setOriginalSelectedItems([]);
            setHasChanges(false);
            setHasBasicChanges(false);
            setHasItemsChanges(false);
            setHasLocationsChanges(false);
            setHasTimingChanges(false);
            setHasPricingChanges(false);
            setHasAdditionalChanges(false);
        }
    }, [requestData]);

    // Track changes
    useEffect(() => {
        if (requestData && formData) {
            const hasChanges = JSON.stringify(requestData) !== JSON.stringify({
                ...requestData,
                ...formData,
                items: movingItems,
                pickup_locations: pickupLocations,
                dropoff_locations: dropoffLocations
            });
            setPendingChanges(hasChanges);
        }
    }, [formData, movingItems, pickupLocations, dropoffLocations, requestData]);

    // Per-tab change detection
    useEffect(() => {
        if (!requestData) return;
        // Basic tab fields
        const basicKeys = [
            'request_type','status','priority','service_level','service_type','service_id','booking_code',
            'contact_name','contact_phone','contact_email'
        ];
        // Check service_id separately since it might be in service.id
        const currentServiceId = (formData as any)?.service_id || (formData as any)?.service?.id;
        const originalServiceId = (requestData as any)?.service_id || (requestData as any)?.service?.id;
        const hasServiceIdChange = currentServiceId !== originalServiceId;
        const hasOtherBasicChanges = basicKeys.filter(k => k !== 'service_id').some((k) => (formData as any)?.[k] !== (requestData as any)?.[k]);
        setHasBasicChanges(hasServiceIdChange || hasOtherBasicChanges);

        // Items
        const baselineItems = (requestData.items || []).map((i: any) => ({
            name: i.name, quantity: i.quantity, weight: i.weight, dimensions: i.dimensions,
            fragile: i.fragile, needs_disassembly: i.needs_disassembly, special_instructions: i.special_instructions,
            declared_value: i.declared_value, category_id: i.category_id || i.category?.id || null
        }));
        const currentItems = (selectedItems.length > 0 ? selectedItems : movingItems).map((i: any) => ({
            name: i.name, quantity: i.quantity, weight: i.weight, dimensions: i.dimensions,
            fragile: i.fragile, needs_disassembly: i.needs_disassembly, special_instructions: i.special_instructions,
            declared_value: i.declared_value, category_id: i.category_id || i.category?.id || null
        }));
        setHasItemsChanges(JSON.stringify(baselineItems) !== JSON.stringify(currentItems));

        // Locations
        const allLocs: any[] = requestData?.all_locations || [];
        const basePickups = allLocs.filter((l) => l.type === 'pickup');
        const baseDropoffs = allLocs.filter((l) => l.type === 'dropoff');
        const simplify = (arr: any[]) => arr.map(l => ({
            address: l.address, postcode: l.postcode, city: l.city, country: l.country,
            contact_name: l.contact_name || '', contact_phone: l.contact_phone || '', access_instructions: l.access_instructions || ''
        }));
        setHasLocationsChanges(
            JSON.stringify(simplify(basePickups)) !== JSON.stringify(simplify(pickupLocations as any)) ||
            JSON.stringify(simplify(baseDropoffs)) !== JSON.stringify(simplify(dropoffLocations as any))
        );

        // Timing
        const timingKeys = [
            'preferred_pickup_date','preferred_pickup_time','preferred_pickup_time_window',
            'preferred_delivery_date','preferred_delivery_time','is_flexible','staff_required'
        ];
        setHasTimingChanges(timingKeys.some((k) => (formData as any)?.[k] !== (requestData as any)?.[k]));

        // Pricing
        const pricingKeys = ['insurance_required','insurance_value','loading_time','unloading_time'];
        setHasPricingChanges(pricingKeys.some((k) => (formData as any)?.[k] !== (requestData as any)?.[k]));

        // Additional
        const additionalKeys = ['items_description','total_weight','dimensions','requires_special_handling','special_instructions'];
        setHasAdditionalChanges(additionalKeys.some((k) => JSON.stringify((formData as any)?.[k]) !== JSON.stringify((requestData as any)?.[k])));
    }, [formData, selectedItems, movingItems, pickupLocations, dropoffLocations, requestData]);

    // Per-tab reset handlers
    const resetBasicInfo = () => {
        if (!requestData) return;
        setFormData(prev => ({
            ...prev,
            request_type: requestData.request_type,
            status: requestData.status,
            priority: requestData.priority,
            service_level: requestData.service_level,
            service_type: requestData.service_type,
            booking_code: requestData.booking_code,
            contact_name: requestData.contact_name,
            contact_phone: requestData.contact_phone,
            contact_email: requestData.contact_email,
        }));
    };

    const resetItems = () => {
        if (!requestData) return;
        setSelectedItems([]);
        setItemQuantities({});
        setExpandedItems({});
        setMovingItems(requestData.items || []);
    };

    const resetLocations = () => {
        if (!requestData) return;
        const allLocations: any[] = requestData?.all_locations || [];
        setPickupLocations(allLocations.filter((l: any) => l.type === 'pickup'));
        setDropoffLocations(allLocations.filter((l: any) => l.type === 'dropoff'));
    };

    const resetTiming = () => {
        if (!requestData) return;
        setFormData(prev => ({
            ...prev,
            preferred_pickup_date: requestData.preferred_pickup_date,
            preferred_pickup_time: requestData.preferred_pickup_time,
            preferred_pickup_time_window: requestData.preferred_pickup_time_window,
            preferred_delivery_date: requestData.preferred_delivery_date,
            preferred_delivery_time: requestData.preferred_delivery_time,
            is_flexible: requestData.is_flexible,
        }));
    };

    const resetPricing = () => {
        if (!requestData) return;
        setFormData(prev => ({
            ...prev,
            insurance_required: requestData.insurance_required,
            insurance_value: requestData.insurance_value,
            loading_time: requestData.loading_time,
            unloading_time: requestData.unloading_time,
        }));
    };

    const resetAdditional = () => {
        if (!requestData) return;
        setFormData(prev => ({
            ...prev,
            items_description: requestData.items_description,
            total_weight: requestData.total_weight,
            dimensions: requestData.dimensions,
            requires_special_handling: requestData.requires_special_handling,
            special_instructions: requestData.special_instructions,
        }));
    };

    // Track changes in selected items
    useEffect(() => {
        if (originalSelectedItems.length > 0 || selectedItems.length > 0) {
            const itemsChanged = JSON.stringify(originalSelectedItems) !== JSON.stringify(selectedItems);
            setHasChanges(itemsChanged);
        } else if (originalSelectedItems.length === 0 && selectedItems.length === 0) {
            // If both are empty, no changes
            setHasChanges(false);
        }
    }, [selectedItems, originalSelectedItems]);

    const handleFormChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Enhanced item management functions (matching InstantRequest/JourneyRequest patterns)
    const updateQuantity = (itemId: string, change: number, item: any, category: any) => {
        const currentQuantity = itemQuantities[itemId] || 0;
        const newQuantity = Math.max(0, currentQuantity + change);
        
        setItemQuantities(prev => ({
            ...prev,
            [itemId]: newQuantity
        }));

        setSelectedItems(prevItems => {
            if (newQuantity === 0) {
                return prevItems.filter(selectedItem => selectedItem.originalItemId !== itemId);
            } else {
                const existingItemIndex = prevItems.findIndex(selectedItem => selectedItem.originalItemId === itemId);
                
                if (existingItemIndex !== -1) {
                    return prevItems.map((selectedItem, index) => 
                        index === existingItemIndex 
                            ? { ...selectedItem, quantity: newQuantity }
                            : selectedItem
                    );
                } else {
                    const newItem = {
                        id: uuidv4(),
                        originalItemId: itemId,
                        name: item?.name,
                        category: category?.name || 'Unknown',
                        category_id: category?.id || '',
                        quantity: newQuantity,
                        weight: item?.weight || null,
                        dimensions: item?.dimensions || '',
                        description: item?.description || '',
                        fragile: item?.fragile === true || item?.fragile === 'Yes' || item?.fragile === 'yes' || false,
                        needs_disassembly: item?.needs_disassembly === true || item?.needs_disassembly === 'Yes' || item?.needs_disassembly === 'yes' || false,
                        notes: '',
                        photo: null,
                        pickup_stop: null,
                        dropoff_stop: null,
                    };
                    return [...prevItems, newItem];
                }
            }
        });
    };

    const removeItem = (itemId: string) => {
        setItemQuantities(prev => {
            const updated = { ...prev };
            delete updated[itemId];
            return updated;
        });

        setSelectedItems(prevItems => {
            return prevItems.filter(selectedItem => selectedItem.originalItemId !== itemId);
        });
    };

    const toggleItemExpansion = (itemId: string) => {
        setExpandedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    const updateSelectedItem = (itemId: string, field: string, value: any) => {
        setSelectedItems(prevItems => {
            return prevItems.map(item => 
                item.originalItemId === itemId 
                    ? { ...item, [field]: value }
                    : item
            );
        });
    };

    const getTotalItems = () => {
        return Object.values(itemQuantities).reduce((sum, quantity) => sum + quantity, 0);
    };

    // Delete item from request using API
    const deleteItemFromRequest = async (itemId: string) => {
        if (!id) return;

        try {
            // Set loading state for this specific item
            setDeletingItems(prev => ({ ...prev, [itemId]: true }));
            
            // Call the delete item API endpoint
            console.log("the item id", itemId);

            await axiosInstance.delete(`/instant-requests/${id}/delete_item/`, {
                data: { item_id: itemId }
            });

            // Remove from local state
            removeItem(itemId);
            
            showMessage('Item deleted successfully');
            mutate(); // Refresh the request data
        } catch (error) {
            showRequestError(error);
        } finally {
            // Clear loading state for this specific item
            setDeletingItems(prev => ({ ...prev, [itemId]: false }));
        }
    };

    const saveAll = async () => {
        if (!id) return;

        // Don't save if no changes have been made
        if (!hasChanges) {
            showMessage('No changes to save', 'info');
            return;
        }

        try {
            setSaving(true);
            
            // Prepare journey stops from pickup and dropoff locations
            const journeyStops = [
                ...pickupLocations.map((loc, index) => ({
                    type: 'pickup',
                    sequence: index,
                    address: loc.address,
                    address_line1: loc.address,
                    city: loc.city,
                    postcode: loc.postcode,
                    contact_name: loc.contact_name || formData.contact_name,
                    contact_phone: loc.contact_phone || formData.contact_phone,
                    use_main_contact: !loc.contact_name
                })),
                ...dropoffLocations.map((loc, index) => ({
                    type: 'dropoff',
                    sequence: pickupLocations.length + index,
                    address: loc.address,
                    address_line1: loc.address,
                    city: loc.city,
                    postcode: loc.postcode,
                    contact_name: loc.contact_name || formData.contact_name,
                    contact_phone: loc.contact_phone || formData.contact_phone,
                    use_main_contact: !loc.contact_name
                }))
            ];

            // Use selected items if available, otherwise fall back to moving items
            const itemsToUse = selectedItems.length > 0 ? selectedItems : movingItems;

            const payload = {
                ...formData,
                journey_stops: journeyStops,
                items: itemsToUse,
            };

            // Use instant request endpoint for updates
            await axiosInstance.patch(`/instant-requests/${id}/`, payload);
            showMessage('Request updated successfully');
            setIsEditing(false);
            setPendingChanges(false);
            mutate();
        } catch (error) {
            showRequestError(error);
            
        } finally {
            setSaving(false);
        }
    };

    // Per-tab save helpers (scoped PATCH)
    const saveBasicInfo = async () => {
        if (!id) return;
        try {
            setSaving(true);
            const payload = {
                contact_name: formData.contact_name,
                contact_phone: formData.contact_phone,
                contact_email: formData.contact_email,
                request_type: formData.request_type,
                status: formData.status,
                priority: formData.priority,
                service_level: formData.service_level,
                service_type: formData.service_type,
                booking_code: formData.booking_code,
            };
            await axiosInstance.patch(`/instant-requests/${id}/`, payload);
            showMessage('Basic info updated');
            mutate();
        } catch (error) {
            showRequestError(error);
        } finally {
            setSaving(false);
        }
    };

    const saveItems = async () => {
        if (!id) return;
        try {
            setSaving(true);
            const rawItems = selectedItems.length > 0 ? selectedItems : movingItems;
            // Normalize items: ensure category_id present; strip extraneous fields
            const itemsToSend = rawItems.map((it: any) => ({
                name: it.name,
                quantity: it.quantity ?? 1,
                weight: it.weight ?? null,
                dimensions: it.dimensions ?? '',
                fragile: it.fragile ?? false,
                needs_disassembly: it.needs_disassembly ?? false,
                special_instructions: it.special_instructions ?? it.notes ?? '',
                declared_value: it.declared_value ?? it.value ?? null,
                category_id: it.category_id || it.category?.id || it.category_id || null,
            }));
            await axiosInstance.patch(`/instant-requests/${id}/update-items/`, { items: itemsToSend });
            showMessage('Items updated');
            mutate();
        } catch (error) {
            showRequestError(error);
        } finally {
            setSaving(false);
        }
    };

    const saveLocations = async () => {
        if (!id) return;
        try {
            setSaving(true);
            const journeyStops = [
                ...pickupLocations.map((loc, index) => ({
                    type: 'pickup',
                    sequence: index,
                    address: loc.address,
                    address_line1: loc.address,
                    city: loc.city,
                    postcode: loc.postcode,
                    contact_name: loc.contact_name || formData.contact_name,
                    contact_phone: loc.contact_phone || formData.contact_phone,
                    use_main_contact: !loc.contact_name
                })),
                ...dropoffLocations.map((loc, index) => ({
                    type: 'dropoff',
                    sequence: pickupLocations.length + index,
                    address: loc.address,
                    address_line1: loc.address,
                    city: loc.city,
                    postcode: loc.postcode,
                    contact_name: loc.contact_name || formData.contact_name,
                    contact_phone: loc.contact_phone || formData.contact_phone,
                    use_main_contact: !loc.contact_name
                }))
            ];
            await axiosInstance.patch(`/instant-requests/${id}/`, { journey_stops: journeyStops });
            showMessage('Locations updated');
            mutate();
        } catch (error) {
            showRequestError(error);
        } finally {
            setSaving(false);
        }
    };

    const saveTiming = async () => {
        if (!id) return;
        try {
            setSaving(true);
            const payload = {
                preferred_pickup_date: formData.preferred_pickup_date,
                preferred_pickup_time: formData.preferred_pickup_time,
                preferred_pickup_time_window: formData.preferred_pickup_time_window,
                preferred_delivery_date: formData.preferred_delivery_date,
                preferred_delivery_time: formData.preferred_delivery_time,
                is_flexible: formData.is_flexible,
            };
            await axiosInstance.patch(`/instant-requests/${id}/`, payload);
            showMessage('Timing updated');
            mutate();
        } catch (error) {
            showRequestError(error);
        } finally {
            setSaving(false);
        }
    };

    const savePricing = async () => {
        if (!id) return;
        try {
            setSaving(true);
            const payload = {
                service_level: formData.service_level,
                service_type: formData.service_type,
                insurance_required: formData.insurance_required,
                insurance_value: formData.insurance_value,
                loading_time: formData.loading_time,
                unloading_time: formData.unloading_time,
            };
            await axiosInstance.patch(`/instant-requests/${id}/`, payload);
            showMessage('Pricing updated');
            mutate();
        } catch (error) {
            showRequestError(error);
        } finally {
            setSaving(false);
        }
    };

    const saveAdditional = async () => {
        if (!id) return;
        try {
            setSaving(true);
            await axiosInstance.patch(`/instant-requests/${id}/`, {
                special_instructions: formData.special_instructions,
            });
            showMessage('Additional info updated');
            mutate();
        } catch (error) {
            showRequestError(error);
        } finally {
            setSaving(false);
        }
    };

    const handleGetNewPrices = async () => {
        try {
            setSaving(true);
            
            // Prepare journey stops for price forecast
            const journeyStops = [
                ...pickupLocations.map((loc, index) => ({
                    type: 'pickup',
                    sequence: index,
                    address: loc.address,
                    address_line1: loc.address,
                    city: loc.city,
                    postcode: loc.postcode,
                    contact_name: loc.contact_name || formData.contact_name,
                    contact_phone: loc.contact_phone || formData.contact_phone,
                    use_main_contact: !loc.contact_name
                })),
                ...dropoffLocations.map((loc, index) => ({
                    type: 'dropoff',
                    sequence: pickupLocations.length + index,
                    address: loc.address,
                    address_line1: loc.address,
                    city: loc.city,
                    postcode: loc.postcode,
                    contact_name: loc.contact_name || formData.contact_name,
                    contact_phone: loc.contact_phone || formData.contact_phone,
                    use_main_contact: !loc.contact_name
                }))
            ];

            // Calculate total weight and item count from selected items (new system) or moving items (legacy)
            const totalWeight = selectedItems.length > 0 
                ? selectedItems.reduce((sum, item) => sum + (parseFloat(item.weight) || 0) * item.quantity, 0)
                : movingItems.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0);
            
            const totalItems = selectedItems.length > 0 
                ? selectedItems.reduce((sum, item) => sum + item.quantity, 0)
                : movingItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

            // Use selected items if available, otherwise fall back to moving items
            const itemsToUse = selectedItems.length > 0 ? selectedItems : movingItems;

            // Prepare request data for price forecast
            const priceRequestData = {
                ...formData,
                journey_stops: journeyStops,
                items: itemsToUse,
                pickup_locations: pickupLocations,
                dropoff_locations: dropoffLocations,
                total_weight: totalWeight,
                total_items: totalItems,
                // Include the original request data for distance calculation
                estimated_distance: formData.estimated_distance,
            };

            // Call price forecast API using instant request endpoint
            const response = await axiosInstance.post(`/instant-requests/${id}/get_price_forecast/`, priceRequestData);
            
            // Pass the entire response data along with calculated values from frontend
            const forecastData = {
                ...response.data,
                frontend_calculated: {
                    total_items: totalItems,
                    total_weight: totalWeight,
                    estimated_distance: formData.estimated_distance || 0
                }
            };
            
            setPriceForecast(forecastData);
            setShowPriceForecast(true);
        } catch (error) {
            showRequestError(error);
        } finally {
            setSaving(false);
        }
    };

    const handlePriceSelection = (priceOption: any) => {
        setSelectedPriceOption(priceOption);
        setShowPriceForecast(false);
        setShowNotification(true);
    };

    const handleConfirmPriceChange = async () => {
        if (!selectedPriceOption || !id) return;

        try {
            setSaving(true);
            
            // Update request with new price using instant request endpoint
            await axiosInstance.post(`/instant-requests/${id}/accept_price/`, {
                total_price: selectedPriceOption.total_price,
                staff_count: selectedPriceOption.staff_count,
                selected_date: selectedPriceOption.selected_date
            });

            showMessage('Price updated and user notified successfully');
            setShowNotification(false);
            setSelectedPriceOption(null);
            mutate();
        } catch (error) {
            showRequestError(error);
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'basic', label: 'Basic Info', icon: IconUser },
        { id: 'items', label: 'Items', icon: IconPackage },
        { id: 'locations', label: 'Locations', icon: IconMapPin },
        { id: 'timing', label: 'Timing', icon: IconCalendar },
        { id: 'pricing', label: 'Pricing', icon: IconCurrencyPound },
        { id: 'documents', label: 'Documents', icon: IconFileText },
    ];


    if (requestLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Loading Request</h2>
                    <p className="text-gray-600 dark:text-gray-400">Fetching request details...</p>
                </div>
            </div>
        );
    }

    if (requestError) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <IconAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Loading Request</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">Failed to load request details. Please try again.</p>
                    <button onClick={() => mutate()} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!requestData) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Request Not Found</h2>
                    <p className="text-gray-600 dark:text-gray-400">The requested request could not be found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex flex-row items-center gap-2">
                                <ArrowLeft className="w-4 h-4 cursor-pointer text-gray-600 dark:text-gray-400" onClick={() => navigate(-1)}/>
                                Edit Request #{requestData.tracking_number || requestData.id.slice(-8)}
                            </h1>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">
                                {requestData.request_type.charAt(0).toUpperCase() + requestData.request_type.slice(1)} Request • 
                                Status: <span className={`font-medium ${
                                    requestData.status === 'completed' ? 'text-green-600' :
                                    requestData.status === 'cancelled' ? 'text-red-600' :
                                    requestData.status === 'in_transit' ? 'text-blue-600' :
                                    'text-yellow-600'
                                }`}>
                                    {requestData.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </p>
                        </div>
                        <div className="mt-4 md:mt-0 flex items-center space-x-3">
                            
                            <button
                                onClick={() => mutate()}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                                <IconRefresh className="w-4 h-4" />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Enhanced Features Summary */}
                <EnhancedFeaturesSummary
                    totalItems={formData.items?.length || 0}
                    totalWeight={formData.total_weight || 0	}
                    selectedCategories={new Set(selectedItems.map(item => item?.category)).size}
                    hasLocations={pickupLocations.length > 0 && dropoffLocations.length > 0}
                    hasPriceForecast={!!priceForecast}
                />

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow mt-6"
                >
                    <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                        <Tab.List className="flex flex-wrap gap-2 border-b dark:border-gray-700 p-4">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <Tab key={tab.id} className={({ selected }) =>
                                        classNames(
                                            'px-4 py-2 rounded-md text-sm font-medium outline-none flex items-center gap-2 transition-colors',
                                            selected
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        )
                                    }>
                                        <Icon className="w-4 h-4" />
                                        {tab.label}
                                    </Tab>
                                );
                            })}
                        </Tab.List>

                        <Tab.Panels className="p-6">
                            <Tab.Panel>
                                <RequestBasicInfoTab
                                    formData={formData}
                                    isEditing={isEditing}
                                    onFormChange={handleFormChange}
                                    serviceCategories={serviceCategories || []}
                                    services={services || []}
                                    providers={providers || []}
                                    drivers={drivers || []}
                                    saving={saving}
                                    hasChanges={hasBasicChanges}
                                    requestId={id as string}
                                    onRefetch={() => mutate()}
                                    onCancelTab={() => { resetBasicInfo(); setIsEditing(false); }}
                                    setIsEditing={setIsEditing}
                                />
                            </Tab.Panel>
                            <Tab.Panel>
                                <RequestItemsTab
                                    requestData={requestData}
                                    isEditing={isEditing}
                                    onDeleteItem={deleteItemFromRequest}
                                    deletingItems={deletingItems}
                                    saving={saving}
                                    hasChanges={hasItemsChanges}
                                    onCancelTab={() => { resetItems(); setIsEditing(false); }}
                                    setIsEditing={setIsEditing}
                                    requestId={id as string}
                                    onRefetch={() => mutate()}
                                />
                            </Tab.Panel>
                            <Tab.Panel>
                                <RequestLocationsTab
                                    pickupLocations={pickupLocations}
                                    setPickupLocations={setPickupLocations}
                                    dropoffLocations={dropoffLocations}
                                    setDropoffLocations={setDropoffLocations}
                                    locations={locations}
                                    isEditing={isEditing}
                                    saving={saving}
                                    hasChanges={hasLocationsChanges}
                                    requestId={id as string}
                                    onRefetch={() => mutate()}
                                    onSaveTab={undefined}
                                    onCancelTab={() => { resetLocations(); setIsEditing(false); }}
                                    setIsEditing={setIsEditing}
                                    requestType={formData.request_type || requestData?.request_type || ''}
                                    requestData={requestData ? {
                                        contact_name: requestData.contact_name,
                                        contact_phone: requestData.contact_phone,
                                        contact_email: requestData.contact_email,
                                        estimated_distance: requestData.estimated_distance
                                    } : undefined}
                                />
                            </Tab.Panel>
                            <Tab.Panel>
                                <RequestTimingTab
                                    formData={formData}
                                    isEditing={isEditing}
                                    onFormChange={handleFormChange}
                                    saving={saving}
                                    hasChanges={hasTimingChanges}
                                    requestId={id as string}
                                    onRefetch={() => mutate()}
                                    onCancelTab={() => { resetTiming(); setIsEditing(false); }}
                                    setIsEditing={setIsEditing}
                                />
                            </Tab.Panel>
                            <Tab.Panel>
                                <RequestPricingTab
                                    formData={formData}
                                    isEditing={isEditing}
                                    onFormChange={handleFormChange}
                                    onGetNewPrices={handleGetNewPrices}
                                    saving={saving}
                                    hasChanges={hasPricingChanges}
                                    requestId={id as string}
                                    onRefetch={() => mutate()}
                                    onCancelTab={() => { resetPricing(); setIsEditing(false); }}
                                    setIsEditing={setIsEditing}
                                />
                            </Tab.Panel>
                           
                            <Tab.Panel>
                                <RequestDocumentsTab
                                    requestId={id as string}
                                    requestData={requestData}
                                    onRefetch={() => mutate()}
                                />
                            </Tab.Panel>
                        </Tab.Panels>
                    </Tab.Group>
                </motion.div>
            </div>

            {/* Modals */}
            {showPriceForecast && (
                <PriceForecastModal
                    isOpen={showPriceForecast}
                    onClose={() => setShowPriceForecast(false)}
                    priceForecast={priceForecast}
                    onPriceSelect={handlePriceSelection}
                />
            )}

            {showNotification && (
                <NotificationModal
                    isOpen={showNotification}
                    onClose={() => setShowNotification(false)}
                    onConfirm={handleConfirmPriceChange}
                    selectedPrice={selectedPriceOption}
                    saving={saving}
                />
            )}
        </div>
    );
};

export default AdminRequestEditor;

