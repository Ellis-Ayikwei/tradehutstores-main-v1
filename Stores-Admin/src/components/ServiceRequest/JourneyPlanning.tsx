import React, { useState, useEffect } from 'react';
import { ErrorMessage, Field, FieldArray } from 'formik';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMapMarkerAlt,
    faPlus,
    faTimes,
    faGripLines,
    faRoute,
    faChevronUp,
    faChevronDown,
    faCar,
    faElevator,
    faLocationDot,
    faBox,
    faCouch,
    faWarehouse,
    faCamera,
    faTrash,
    faBuilding,
    faRulerCombined,
    faInfoCircle,
    faTags,
    faBoxes,
    faHome,
    faHandHolding,
    faClipboardList,
    faTools,
    faWeightHanging,
    faMusic,
    faHistory,
    faTruck,
    faGlobe,
    faPalette,
    faIndustry,
    faLaptop,
    faPlug,
    faBoxOpen,
    faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { commonItems } from '../../data/commonItems';
import { getItemIcon } from '../../utilities/getItemIcon';
import CommonItemsModal from './CommonItemsModal';
import AddressAutocomplete from './AddressAutocomplete';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

interface JourneyStop {
    id: string;
    type: 'pickup' | 'dropoff' | 'stop';
    location: {
        address: string;
        postcode: string;
        latitude: number | null;
        longitude: number | null;
        contact_name: string;
        contact_phone: string;
        special_instructions: string;
    };
    coordinates: [number, number] | null;
    floor: string;
    unit_number: string;
    parking_info: string;
    items: string[];
    linked_items?: Item[];
    service_type: string;
    property_type: string;
    number_of_rooms: number;
    number_of_floors: number;
    needs_disassembly?: boolean;
    is_fragile?: boolean;
    dimensions?: string;
    weight?: string;
    value?: string;
    address_line1?: string;
    city?: string;
    county?: string;
    postcode?: string;
}

interface Item {
    id: string;
    name: string;
    category: string;
    quantity: number;
    weight?: string;
    dimensions?: string;
    value?: string;
    fragile?: boolean;
    needs_disassembly?: boolean;
    notes?: string;
    photo?: string | null;
    special_instructions?: string;
    requires_special_handling?: boolean;
    insurance_required?: boolean;
    declared_value?: string;
    dimensions_length?: string;
    dimensions_width?: string;
    dimensions_height?: string;
}

interface JourneyPlanningProps {
    values: {
        journey_stops: JourneyStop[];
    };
    setFieldValue: (field: string, value: any) => void;
    errors?: any;
    touched?: any;
}

export const JourneyPlanning: React.FC<JourneyPlanningProps> = ({ values, setFieldValue, errors, touched }) => {
    const [expandedStopIndex, setExpandedStopIndex] = useState<number | null>(null);
    const [expandedItemIndex, setExpandedItemIndex] = useState<{ [stopIndex: number]: number | null }>({});
    const [showCommonItems, setShowCommonItems] = useState<number | null>(null);
    const [showCustomItemModal, setShowCustomItemModal] = useState<number | null>(null);
    const [expandedServiceSection, setExpandedServiceSection] = useState<{ [stopIndex: number]: boolean }>({});

    // Initialize journey_stops if it doesn't exist
    useEffect(() => {
        if (!values.journey_stops) {
            setFieldValue('journey_stops', []);
        }
    }, []); // Empty dependency array means this runs once on mount

    const propertyTypes = ['house', 'apartment', 'office', 'storage'];

    const getOrdinalSuffix = (n: number): string => {
        const s: string[] = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };

    const floorLevelOptions = [
        { value: 'basement', label: 'Basement' },
        { value: 'ground', label: 'Ground Floor' },
        ...Array.from({ length: 100 }, (_, i) => ({
            value: `${i + 1}`,
            label: `${i + 1}${getOrdinalSuffix(i + 1)} Floor`,
        })),
    ];

    // Define service types
    const serviceTypes = [
        { id: 'residential_moving', name: 'Residential Moving', icon: faHome },
        { id: 'office_relocation', name: 'Office Relocation', icon: faBuilding },
        { id: 'piano_moving', name: 'Piano Moving', icon: faMusic },
        { id: 'antique_moving', name: 'Antique Moving', icon: faHistory },
        { id: 'storage_services', name: 'Storage Services', icon: faWarehouse },
        { id: 'packing_services', name: 'Packing Services', icon: faBoxes },
        { id: 'vehicle_transportation', name: 'Vehicle Transportation', icon: faTruck },
        { id: 'international_moving', name: 'International Moving', icon: faGlobe },
        { id: 'furniture_assembly', name: 'Furniture Assembly', icon: faTools },
        { id: 'fragile_items', name: 'Fragile Items', icon: faBox },
        { id: 'artwork_moving', name: 'Artwork Moving', icon: faPalette },
        { id: 'industrial_equipment', name: 'Industrial Equipment', icon: faIndustry },
        { id: 'electronics', name: 'Electronics', icon: faLaptop },
        { id: 'appliances', name: 'Appliances', icon: faPlug },
        { id: 'boxes_parcels', name: 'Boxes/Parcels', icon: faBoxOpen },
    ];

    // Helper to check if a service type requires property details
    const requiresPropertyDetails = (serviceType: string) => {
        return ['house_removal', 'office_removal', 'storage'].includes(serviceType);
    };

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        const items = Array.from(values.journey_stops || []);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setFieldValue('journey_stops', items);
    };

    const getStopColor = (type: string) => {
        switch (type) {
            case 'pickup':
                return 'bg-blue-600 dark:bg-blue-500';
            case 'dropoff':
                return 'bg-green-600 dark:bg-green-500';
            case 'stop':
                return 'bg-orange-600 dark:bg-orange-500';
            default:
                return 'bg-gray-600 dark:bg-gray-500';
        }
    };

    const getStopTypeLabel = (type: string) => {
        switch (type) {
            case 'pickup':
                return 'Pickup';
            case 'dropoff':
                return 'Dropoff';
            case 'stop':
                return 'Stop';
            default:
                return 'Unknown';
        }
    };

    const toggleServiceSection = (stopIndex: number) => {
        setExpandedServiceSection({
            ...expandedServiceSection,
            [stopIndex]: !expandedServiceSection[stopIndex],
        });
    };

    const addItemToPickup = (stopIndex: number, item: any) => {
        const currentItems = values.journey_stops[stopIndex].items || [];

        // Add the new item with all properties from the common item
        setFieldValue(`journey_stops.${stopIndex}.items`, [
            ...currentItems,
            {
                id: uuidv4(),
                name: item.name || '',
                category: item.category || 'furniture',
                category_id: item.category_id || null,
                quantity: item.quantity || 1,
                weight: item.weight || '',
                dimensions: item.dimensions || '',
                value: item.value || '',
                fragile: item.fragile || false,
                needs_disassembly: item.needs_disassembly || false,
                notes: item.notes || '',
                photo: item.photo || null,
                special_instructions: item.special_instructions || '',
                requires_special_handling: item.requires_special_handling || false,
                insurance_required: item.insurance_required || false,
                declared_value: item.declared_value || '',
                dimensions_length: item.dimensions_length || '',
                dimensions_width: item.dimensions_width || '',
                dimensions_height: item.dimensions_height || '',
            },
        ]);

        // Expand the newly added item
        const newItemIndex = currentItems.length;
        setExpandedItemIndex({
            ...expandedItemIndex,
            [stopIndex]: newItemIndex,
        });
    };

    const toggleItemExpansion = (stopIndex: number, itemIndex: number) => {
        setExpandedItemIndex({
            ...expandedItemIndex,
            [stopIndex]: expandedItemIndex[stopIndex] === itemIndex ? null : itemIndex,
        });
    };

    // Add a new stop with proper initialization
    const addNewStop = (type: string) => {
        const newStop = {
            id: uuidv4(),
            type,
            location: {
                address: '',
                postcode: '',
                latitude: null,
                longitude: null,
                contact_name: '',
                contact_phone: '',
                special_instructions: '',
            },
            coordinates: null,
            floor: 'ground',
            unit_number: '',
            parking_info: '',
            items: [],
            service_type: '',
            property_type: 'house',
            number_of_rooms: 1,
            number_of_floors: 1,
        };

        setFieldValue('journey_stops', [...(values.journey_stops || []), newStop]);
        setExpandedStopIndex((values.journey_stops || []).length);
    };

    // Get available items for a dropoff stop (items that haven't been assigned to any dropoff yet)
    const getAvailableItemsForDropoff = (dropoffIndex: number) => {
        // Get all pickup items
        const pickupStops = values.journey_stops.filter((s: any) => s.type === 'pickup');
        const allItems = pickupStops.flatMap((s: any) => s.items || []);

        // Get items that are already assigned to other dropoffs (excluding current dropoff)
        const assignedItems = values.journey_stops.filter((s: any, idx: number) => s.type === 'dropoff' && idx !== dropoffIndex).flatMap((s: any) => s.linked_items || []);

        // Return items that either:
        // 1. Haven't been assigned to any dropoff, or
        // 2. Are already assigned to this dropoff
        return allItems.filter((item: any) => !assignedItems.includes(item.id) || (values.journey_stops[dropoffIndex].linked_items || []).includes(item.id));
    };

    // Handle linking an item to a dropoff stop
    const handleItemLink = (dropoffIndex: number, itemId: string) => {
        const currentLinkedItems = values.journey_stops[dropoffIndex].linked_items || [];
        setFieldValue(`journey_stops.${dropoffIndex}.linked_items`, [...currentLinkedItems, itemId]);
    };

    // Handle unlinking an item from a dropoff stop
    const handleItemUnlink = (dropoffIndex: number, itemId: string) => {
        const currentLinkedItems = values.journey_stops[dropoffIndex].linked_items || [];
        setFieldValue(
            `journey_stops.${dropoffIndex}.linked_items`,
            currentLinkedItems.filter((item: any) => item.id !== itemId)
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                    <FontAwesomeIcon icon={faRoute} className="mr-2 text-purple-600 dark:text-purple-400" />
                    Journey Planning
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add multiple stops to your journey. For pickup points, specify what items will be collected.</p>
            </div>

            <div className="p-2">
                <FieldArray
                    name="journey_stops"
                    render={(arrayHelpers) => (
                        <div>
                            {(values.journey_stops || []).length > 0 ? (
                                <DragDropContext onDragEnd={handleDragEnd}>
                                    <Droppable droppableId="journey-stops">
                                        {(provided) => (
                                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 mb-6">
                                                {(values.journey_stops || []).map((stop: JourneyStop, stopIndex: number) => (
                                                    <Draggable key={stop.id} draggableId={stop.id} index={stopIndex}>
                                                        {(provided) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className={`border ${
                                                                    stop.type === 'pickup'
                                                                        ? 'border-blue-200 dark:border-blue-800'
                                                                        : stop.type === 'dropoff'
                                                                        ? 'border-green-200 dark:border-green-800'
                                                                        : 'border-orange-200 dark:border-orange-800'
                                                                } rounded-lg ${
                                                                    expandedStopIndex === stopIndex
                                                                        ? stop.type === 'pickup'
                                                                            ? 'bg-blue-50 dark:bg-blue-900/20'
                                                                            : stop.type === 'dropoff'
                                                                            ? 'bg-green-50 dark:bg-green-900/20'
                                                                            : 'bg-orange-50 dark:bg-orange-900/20'
                                                                        : 'bg-white dark:bg-gray-800'
                                                                }`}
                                                            >
                                                                <div className="flex justify-between items-center p-3">
                                                                    <div className="flex items-center">
                                                                        <div {...provided.dragHandleProps} className="mr-3 cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                                                            <FontAwesomeIcon icon={faGripLines} />
                                                                        </div>
                                                                        <div className={`h-7 w-7 rounded-full ${getStopColor(stop.type)} flex items-center justify-center text-white text-xs mr-3`}>
                                                                            {String.fromCharCode(65 + stopIndex)}
                                                                        </div>
                                                                        <h4 className="font-medium text-gray-800 dark:text-gray-200">
                                                                            {getStopTypeLabel(stop.type)}:{(stop.location as any)?.address || '(No address)'}
                                                                            {(stop.location as any)?.postcode && (
                                                                                <span className="text-gray-500 dark:text-gray-400 ml-2">({(stop.location as any).postcode})</span>
                                                                            )}
                                                                        </h4>

                                                                        {/* Show item count badge for pickup points */}
                                                                        {stop.items && stop.items.length > 0 && (
                                                                            <div className="ml-3 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                                                                                {stop.items.length} {stop.items.length === 1 ? 'item' : 'items'}
                                                                            </div>
                                                                        )}

                                                                        {/* Show linked items count for dropoff points */}
                                                                        {stop.type === 'dropoff' && stop.linked_items && stop.linked_items.length > 0 && (
                                                                            <div className="ml-3 px-2 py-0.5 bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200 text-xs rounded-full">
                                                                                {stop.linked_items.length} {stop.linked_items.length === 1 ? 'item' : 'items'}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center space-x-3">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setExpandedStopIndex(expandedStopIndex === stopIndex ? null : stopIndex)}
                                                                            className={`text-gray-500 dark:text-gray-400 hover:${
                                                                                stop.type === 'pickup' ? 'text-blue-500' : stop.type === 'dropoff' ? 'text-green-500' : 'text-orange-500'
                                                                            } p-1`}
                                                                        >
                                                                            <FontAwesomeIcon icon={expandedStopIndex === stopIndex ? faChevronUp : faChevronDown} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => arrayHelpers.remove(stopIndex)}
                                                                            className="text-gray-500 dark:text-gray-400 hover:text-red-500 p-1"
                                                                        >
                                                                            <FontAwesomeIcon icon={faTimes} />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {expandedStopIndex === stopIndex && (
                                                                    <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700">
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stop Type</label>
                                                                                <Field
                                                                                    as="select"
                                                                                    name={`journey_stops.${stopIndex}.type`}
                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                >
                                                                                    <option value="pickup">Pickup Point</option>
                                                                                    <option value="dropoff">Dropoff Point</option>
                                                                                    <option value="stop">Intermediate Stop</option>
                                                                                </Field>
                                                                            </div>

                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                                    Street Address <span className="text-red-500">*</span>
                                                                                </label>
                                                                                <AddressAutocomplete
                                                                                    name={`journey_stops.${stopIndex}.location`}
                                                                                    value={stop?.location?.address || ''}
                                                                                    onChange={(value, coords, addressDetails) => {
                                                                                        setFieldValue(`journey_stops.${stopIndex}.location`, {
                                                                                            address: value,
                                                                                            postcode: addressDetails?.postcode || '',
                                                                                            latitude: coords?.lat || null,
                                                                                            longitude: coords?.lng || null,
                                                                                            contact_name: '',
                                                                                            contact_phone: '',
                                                                                            special_instructions: '',
                                                                                        });
                                                                                        if (coords) {
                                                                                            setFieldValue(`journey_stops.${stopIndex}.coordinates`, [coords.lat, coords.lng]);
                                                                                        }
                                                                                        if (addressDetails) {
                                                                                            setFieldValue(`journey_stops.${stopIndex}.address_line1`, addressDetails.address_line1);
                                                                                            setFieldValue(`journey_stops.${stopIndex}.city`, addressDetails.city);
                                                                                            setFieldValue(`journey_stops.${stopIndex}.county`, addressDetails.county);
                                                                                            setFieldValue(`journey_stops.${stopIndex}.postcode`, addressDetails.postcode);
                                                                                        }
                                                                                    }}
                                                                                    error={errors?.journey_stops?.[stopIndex]?.location}
                                                                                    touched={touched?.journey_stops?.[stopIndex]?.location}
                                                                                    required
                                                                                />

                                                                                {/* Address validation feedback */}
                                                                                <div className="mt-2">
                                                                                    {stop?.location?.address && (
                                                                                        <div className="flex items-center space-x-2">
                                                                                            {(stop.location?.latitude !== null && stop.location?.longitude !== null) ||
                                                                                            (stop.coordinates &&
                                                                                                Array.isArray(stop.coordinates) &&
                                                                                                stop.coordinates[0] !== null &&
                                                                                                stop.coordinates[1] !== null) ? (
                                                                                                <div className="flex items-center text-green-600 dark:text-green-400">
                                                                                                    <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 mr-1" />
                                                                                                    <span className="text-xs">Address verified</span>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="flex items-center text-amber-600 dark:text-amber-400">
                                                                                                    <FontAwesomeIcon icon={faInfoCircle} className="w-4 h-4 mr-1" />
                                                                                                    <span className="text-xs">Please select address from dropdown suggestions</span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Floor Level</label>
                                                                                <Field
                                                                                    as="select"
                                                                                    name={`journey_stops.${stopIndex}.floor`}
                                                                                    className={`block w-full border ${
                                                                                        errors?.journey_stops?.[stopIndex]?.floor && touched?.journey_stops?.[stopIndex]?.floor
                                                                                            ? 'border-red-300 dark:border-red-700'
                                                                                            : 'border-gray-300 dark:border-gray-600'
                                                                                    } rounded-lg py-2.5 px-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white`}
                                                                                >
                                                                                    {floorLevelOptions.map((option) => (
                                                                                        <option key={option.value} value={option.value}>
                                                                                            {option.label}
                                                                                        </option>
                                                                                    ))}
                                                                                </Field>
                                                                                <ErrorMessage name={`journey_stops.${stopIndex}.floor`} component="p" className="text-red-500 text-sm mt-1" />
                                                                            </div>
                                                                        </div>

                                                                        {/* Service Type section */}
                                                                        {stop.type === 'pickup' && (
                                                                            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                                                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                                                                    What type of service do you need?
                                                                                </label>
                                                                                <Field
                                                                                    as="select"
                                                                                    name={`journey_stops.${stopIndex}.service_type`}
                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white mb-3"
                                                                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                                                        const serviceType = e.target.value;
                                                                                        setFieldValue(`journey_stops.${stopIndex}.service_type`, serviceType);

                                                                                        // Reset property fields if changing to a service that doesn't need them
                                                                                        if (!requiresPropertyDetails(serviceType)) {
                                                                                            setFieldValue(`journey_stops.${stopIndex}.property_type`, 'house');
                                                                                            setFieldValue(`journey_stops.${stopIndex}.number_of_rooms`, 1);
                                                                                            setFieldValue(`journey_stops.${stopIndex}.number_of_floors`, 1);
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <option value="">Select service type</option>
                                                                                    {serviceTypes.map((type) => (
                                                                                        <option key={type.id} value={type.id}>
                                                                                            {type.name}
                                                                                        </option>
                                                                                    ))}
                                                                                </Field>

                                                                                {stop.service_type && (
                                                                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start">
                                                                                        <FontAwesomeIcon
                                                                                            icon={serviceTypes.find((t) => t.id === stop.service_type)?.icon || faInfoCircle}
                                                                                            className="text-blue-500 dark:text-blue-400 mt-0.5 mr-2"
                                                                                        />
                                                                                        <div>
                                                                                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                                                                                <strong>{serviceTypes.find((t) => t.id === stop.service_type)?.name}</strong>
                                                                                            </p>
                                                                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                                                                {stop.service_type === 'house_removal' &&
                                                                                                    "We'll help move all items from your house to your new location."}
                                                                                                {stop.service_type === 'office_removal' &&
                                                                                                    "We'll relocate your office equipment and furniture efficiently."}
                                                                                                {stop.service_type === 'storage' && "We'll transport your items to our secure storage facilities."}
                                                                                                {stop.service_type === 'furniture' && "We'll carefully transport your furniture items."}
                                                                                                {stop.service_type === 'packing' && 'Our team will help pack your belongings professionally.'}
                                                                                                {stop.service_type === 'single_item' && "We'll transport individual items with care."}
                                                                                                {stop.service_type === 'fragile' && 'We specialize in safely moving delicate and fragile items.'}
                                                                                                {stop.service_type === 'heavy' && 'We have equipment to move heavy and bulky items safely.'}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Service Details section */}
                                                                        <div className="mb-4">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleServiceSection(stopIndex)}
                                                                                className="flex items-center justify-between w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-left font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-650 transition-colors"
                                                                            >
                                                                                <div className="flex items-center">
                                                                                    <FontAwesomeIcon icon={faBuilding} className="mr-2 text-blue-600 dark:text-blue-400" />
                                                                                    Property & Service Details
                                                                                </div>
                                                                                <FontAwesomeIcon icon={expandedServiceSection[stopIndex] ? faChevronUp : faChevronDown} className="ml-2" />
                                                                            </button>

                                                                            {expandedServiceSection[stopIndex] && (
                                                                                <div className="mt-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-750">
                                                                                    {/* Property Details */}
                                                                                    {(stop.type === 'pickup' && stop.service_type && requiresPropertyDetails(stop.service_type)) ||
                                                                                    (stop.type === 'dropoff' &&
                                                                                        values.journey_stops.some(
                                                                                            (s: { type: string; service_type: string }) =>
                                                                                                s.type === 'pickup' && s.service_type && requiresPropertyDetails(s.service_type)
                                                                                        )) ? (
                                                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                                                            <div>
                                                                                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Property Type</label>
                                                                                                <Field
                                                                                                    as="select"
                                                                                                    name={`journey_stops.${stopIndex}.property_type`}
                                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                                >
                                                                                                    {stop.service_type === 'office_removal' ? (
                                                                                                        <>
                                                                                                            <option value="office">Office</option>
                                                                                                            <option value="retail">Retail Space</option>
                                                                                                            <option value="industrial">Industrial Space</option>
                                                                                                            <option value="storage">Storage Unit</option>
                                                                                                        </>
                                                                                                    ) : (
                                                                                                        propertyTypes.map((type) => (
                                                                                                            <option key={type} value={type}>
                                                                                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                                                                                            </option>
                                                                                                        ))
                                                                                                    )}
                                                                                                </Field>
                                                                                            </div>

                                                                                            <div>
                                                                                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Number of Rooms</label>
                                                                                                <Field
                                                                                                    type="number"
                                                                                                    name={`journey_stops.${stopIndex}.number_of_rooms`}
                                                                                                    min="1"
                                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                                />
                                                                                            </div>

                                                                                            <div>
                                                                                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Number of Floors</label>
                                                                                                <Field
                                                                                                    type="number"
                                                                                                    name={`journey_stops.${stopIndex}.number_of_floors`}
                                                                                                    min="1"
                                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="col-span-3">
                                                                                            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                                                                                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                                                                                    <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                                                                                                    {stop.type === 'pickup'
                                                                                                        ? 'Please select a service type that requires property details.'
                                                                                                        : "Property details aren't required for this stop type or based on the selected service."}
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}

                                                                                    {['pickup', 'dropoff'].includes(stop.type) && (
                                                                                        <div className="space-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                                <div>
                                                                                                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                                                                        <FontAwesomeIcon icon={faRulerCombined} className="mr-2 text-blue-600 dark:text-blue-400" />
                                                                                                        Dimensions (Optional)
                                                                                                    </label>
                                                                                                    <Field
                                                                                                        name={`journey_stops.${stopIndex}.dimensions`}
                                                                                                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                                        placeholder="L × W × H"
                                                                                                    />
                                                                                                </div>

                                                                                                <div>
                                                                                                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Weight (Optional)</label>
                                                                                                    <Field
                                                                                                        name={`journey_stops.${stopIndex}.weight`}
                                                                                                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                                        placeholder="kg"
                                                                                                    />
                                                                                                </div>
                                                                                            </div>

                                                                                            <div className="flex flex-wrap gap-x-6 gap-y-3">
                                                                                                <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                                                                    <Field
                                                                                                        type="checkbox"
                                                                                                        name={`journey_stops.${stopIndex}.needs_disassembly`}
                                                                                                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                                                                                                    />
                                                                                                    <span className="ml-2">Needs Disassembly</span>
                                                                                                </label>

                                                                                                <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                                                                    <Field
                                                                                                        type="checkbox"
                                                                                                        name={`journey_stops.${stopIndex}.is_fragile`}
                                                                                                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                                                                                                    />
                                                                                                    <span className="ml-2">Fragile Items</span>
                                                                                                </label>
                                                                                            </div>

                                                                                            <div className="mt-4">
                                                                                                {stop.needs_disassembly && (
                                                                                                    <div className="flex items-start p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                                                                                                        <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 dark:text-blue-400 mt-0.5 mr-3" />
                                                                                                        <p className="text-blue-600 dark:text-blue-300">
                                                                                                            Some items will need to be disassembled before transport. Our team can help with this.
                                                                                                        </p>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Items Section - Only show for pickup stops */}
                                                                        {stop.type === 'pickup' && (
                                                                            <div className="mt-4">
                                                                                <div className="flex items-center justify-between mb-4">
                                                                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                                                                                        <FontAwesomeIcon icon={faBox} className="mr-2 text-blue-600 dark:text-blue-400" />
                                                                                        Items to be Picked Up
                                                                                    </h4>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setShowCommonItems(stopIndex)}
                                                                                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                                                                    >
                                                                                        <FontAwesomeIcon icon={faPlus} className="mr-1" />
                                                                                        Add Common Items
                                                                                    </button>
                                                                                </div>

                                                                                {/* Items List */}
                                                                                <div className="space-y-3">
                                                                                    {stop.items && stop.items.length > 0 ? (
                                                                                        stop.items.map((item: any, itemIndex: number) => (
                                                                                            <div
                                                                                                key={item.id}
                                                                                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                                                                            >
                                                                                                <div className="flex items-center justify-between">
                                                                                                    <div className="flex items-center">
                                                                                                        <FontAwesomeIcon
                                                                                                            icon={getItemIcon(item.category).icon as IconProp}
                                                                                                            className={`mr-2 ${getItemIcon(item.category).color}`}
                                                                                                        />
                                                                                                        <div>
                                                                                                            <h5 className="font-medium text-gray-800 dark:text-gray-200">{item.name}</h5>
                                                                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                                                                {item.quantity} {item.quantity === 1 ? 'item' : 'items'}
                                                                                                            </p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="flex items-center space-x-2">
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => toggleItemExpansion(stopIndex, itemIndex)}
                                                                                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                                                                        >
                                                                                                            <FontAwesomeIcon
                                                                                                                icon={expandedItemIndex[stopIndex] === itemIndex ? faChevronUp : faChevronDown}
                                                                                                            />
                                                                                                        </button>
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => {
                                                                                                                const updatedItems = [...stop.items];
                                                                                                                updatedItems.splice(itemIndex, 1);
                                                                                                                setFieldValue(`journey_stops.${stopIndex}.items`, updatedItems);
                                                                                                            }}
                                                                                                            className="text-gray-400 hover:text-red-500"
                                                                                                        >
                                                                                                            <FontAwesomeIcon icon={faTrash} />
                                                                                                        </button>
                                                                                                    </div>
                                                                                                </div>

                                                                                                {expandedItemIndex[stopIndex] === itemIndex && (
                                                                                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                                            <div>
                                                                                                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Quantity</label>
                                                                                                                <Field
                                                                                                                    type="number"
                                                                                                                    name={`journey_stops.${stopIndex}.items.${itemIndex}.quantity`}
                                                                                                                    min="1"
                                                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                                                                                    Dimensions
                                                                                                                </label>
                                                                                                                <Field
                                                                                                                    name={`journey_stops.${stopIndex}.items.${itemIndex}.dimensions`}
                                                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                                                    placeholder="L × W × H"
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Weight</label>
                                                                                                                <Field
                                                                                                                    name={`journey_stops.${stopIndex}.items.${itemIndex}.weight`}
                                                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                                                    placeholder="kg"
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Value</label>
                                                                                                                <Field
                                                                                                                    name={`journey_stops.${stopIndex}.items.${itemIndex}.value`}
                                                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                                                    placeholder="$"
                                                                                                                />
                                                                                                            </div>
                                                                                                        </div>

                                                                                                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                                                                                                            <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                                                                                <Field
                                                                                                                    type="checkbox"
                                                                                                                    name={`journey_stops.${stopIndex}.items.${itemIndex}.fragile`}
                                                                                                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                                                                                                                />
                                                                                                                <span className="ml-2">Fragile</span>
                                                                                                            </label>

                                                                                                            <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                                                                                <Field
                                                                                                                    type="checkbox"
                                                                                                                    name={`journey_stops.${stopIndex}.items.${itemIndex}.needs_disassembly`}
                                                                                                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                                                                                                                />
                                                                                                                <span className="ml-2">Needs Disassembly</span>
                                                                                                            </label>
                                                                                                        </div>

                                                                                                        <div className="mt-4">
                                                                                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                                                                                Special Instructions
                                                                                                            </label>
                                                                                                            <Field
                                                                                                                as="textarea"
                                                                                                                name={`journey_stops.${stopIndex}.items.${itemIndex}.special_instructions`}
                                                                                                                className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                                                rows={2}
                                                                                                                placeholder="Any special handling instructions..."
                                                                                                            />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        ))
                                                                                    ) : (
                                                                                        <div className="text-center py-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                                                                                            <FontAwesomeIcon icon={faBox} className="text-gray-400 text-3xl mb-3" />
                                                                                            <p className="text-gray-500 dark:text-gray-400">No items added yet</p>
                                                                                            <p className="text-sm text-gray-400 dark:text-gray-500">Add items to be picked up at this location</p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Dropoff points - Select items from pickups */}
                                                                        {stop.type === 'dropoff' && (
                                                                            <div className="mb-4">
                                                                                <div className="flex justify-between items-center mb-3">
                                                                                    <h4 className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                                                                                        <FontAwesomeIcon icon={faBox} className="mr-2 text-green-600 dark:text-green-400" />
                                                                                        Items to Dropoff
                                                                                    </h4>
                                                                                </div>

                                                                                {/* Select which items from pickup points should be dropped off here */}
                                                                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                                                    <div className="flex justify-between items-center mb-3">
                                                                                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Select items from pickup points:</h5>

                                                                                        {/* Add Select All checkbox */}
                                                                                        {getAvailableItemsForDropoff(stopIndex).length > 0 && (
                                                                                            <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                                                                                                    checked={getAvailableItemsForDropoff(stopIndex).every((item: any) =>
                                                                                                        (stop.linked_items || []).includes(item.id)
                                                                                                    )}
                                                                                                    onChange={(e) => {
                                                                                                        const availableItemIds = getAvailableItemsForDropoff(stopIndex).map((item: any) => item.id);

                                                                                                        if (e.target.checked) {
                                                                                                            // Select all available items
                                                                                                            setFieldValue(`journey_stops.${stopIndex}.linked_items`, availableItemIds);
                                                                                                        } else {
                                                                                                            // Deselect all items
                                                                                                            setFieldValue(`journey_stops.${stopIndex}.linked_items`, []);
                                                                                                        }
                                                                                                    }}
                                                                                                />
                                                                                                <span className="ml-2 font-medium text-green-700 dark:text-green-400">Select All Available Items</span>
                                                                                            </label>
                                                                                        )}
                                                                                    </div>

                                                                                    {getAvailableItemsForDropoff(stopIndex).length > 0 ? (
                                                                                        <div className="space-y-4">
                                                                                            {values.journey_stops
                                                                                                .filter((s: any) => s.type === 'pickup' && s.items && s.items.length > 0)
                                                                                                .map((pickupStop: any) => {
                                                                                                    // Filter items for this pickup that are available
                                                                                                    const availableItems = pickupStop.items.filter((item: any) =>
                                                                                                        getAvailableItemsForDropoff(stopIndex).some(
                                                                                                            (availableItem: any) => availableItem.id === item.id
                                                                                                        )
                                                                                                    );

                                                                                                    if (availableItems.length === 0) return null;

                                                                                                    return (
                                                                                                        <div
                                                                                                            key={pickupStop.id}
                                                                                                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-green-300 dark:hover:border-green-600 transition-colors"
                                                                                                        >
                                                                                                            <div className="flex justify-between items-center mb-2">
                                                                                                                <h6 className="font-medium text-gray-800 dark:text-gray-200">
                                                                                                                    Pickup{' '}
                                                                                                                    {String.fromCharCode(
                                                                                                                        65 + values.journey_stops.findIndex((s: any) => s.id === pickupStop.id)
                                                                                                                    )}
                                                                                                                    :
                                                                                                                    {pickupStop.location && typeof pickupStop.location === 'object'
                                                                                                                        ? pickupStop.location.address
                                                                                                                        : pickupStop.location || '(No address)'}
                                                                                                                </h6>
                                                                                                                {/* Add Select All for this pickup point */}
                                                                                                                <label className="flex items-center text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                                                                                                                    <input
                                                                                                                        type="checkbox"
                                                                                                                        className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                                                                                                                        checked={availableItems.every((item: any) =>
                                                                                                                            (stop.linked_items || []).includes(item.id)
                                                                                                                        )}
                                                                                                                        onChange={(e) => {
                                                                                                                            const pickupItemIds = availableItems.map((item: any) => item.id);
                                                                                                                            const currentLinkedItems = stop.linked_items || [];

                                                                                                                            if (e.target.checked) {
                                                                                                                                const newLinkedItems = [
                                                                                                                                    ...new Set([...currentLinkedItems, ...pickupItemIds]),
                                                                                                                                ];
                                                                                                                                setFieldValue(
                                                                                                                                    `journey_stops.${stopIndex}.linked_items`,
                                                                                                                                    newLinkedItems
                                                                                                                                );
                                                                                                                            } else {
                                                                                                                                const newLinkedItems = currentLinkedItems.filter(
                                                                                                                                    (id) => !pickupItemIds.includes(id)
                                                                                                                                );
                                                                                                                                setFieldValue(
                                                                                                                                    `journey_stops.${stopIndex}.linked_items`,
                                                                                                                                    newLinkedItems
                                                                                                                                );
                                                                                                                            }
                                                                                                                        }}
                                                                                                                    />
                                                                                                                    <span className="ml-2">Select All from this Pickup</span>
                                                                                                                </label>
                                                                                                            </div>

                                                                                                            <div className="space-y-2 pl-2">
                                                                                                                {availableItems.map((item: any) => (
                                                                                                                    <div key={item.id} className="flex items-center">
                                                                                                                        <Field
                                                                                                                            type="checkbox"
                                                                                                                            name={`journey_stops.${stopIndex}.linked_items`}
                                                                                                                            value={item.id}
                                                                                                                            checked={(stop.linked_items || []).includes(item.id)}
                                                                                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                                                                                const currentLinkedItems = stop.linked_items || [];
                                                                                                                                if (e.target.checked) {
                                                                                                                                    setFieldValue(`journey_stops.${stopIndex}.linked_items`, [
                                                                                                                                        ...currentLinkedItems,
                                                                                                                                        item.id,
                                                                                                                                    ]);
                                                                                                                                } else {
                                                                                                                                    setFieldValue(
                                                                                                                                        `journey_stops.${stopIndex}.linked_items`,
                                                                                                                                        currentLinkedItems.filter((id) => id !== item.id)
                                                                                                                                    );
                                                                                                                                }
                                                                                                                            }}
                                                                                                                        />
                                                                                                                        <label className="ml-2 flex items-center">
                                                                                                                            <FontAwesomeIcon
                                                                                                                                icon={getItemIcon(item.category || 'furniture').icon}
                                                                                                                                className="mr-2 text-gray-500 dark:text-gray-400"
                                                                                                                            />
                                                                                                                            <span>
                                                                                                                                {item.name} {item.quantity > 1 && `(x${item.quantity})`}
                                                                                                                            </span>
                                                                                                                        </label>
                                                                                                                    </div>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    );
                                                                                                })}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="text-center py-4">
                                                                                            <p className="text-sm text-gray-500 dark:text-gray-400">No items available from pickup points.</p>
                                                                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                                                                All items have been assigned to other dropoff locations.
                                                                                            </p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            ) : (
                                <div className="text-center py-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg mb-6">
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-400 text-4xl mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400">No stops added yet.</p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500">Add pickup, dropoff, and intermediate stops.</p>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        addNewStop('pickup');
                                    }}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center text-sm"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                    Add Pickup
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        addNewStop('stop');
                                    }}
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md flex items-center text-sm"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                    Add Stop
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        addNewStop('dropoff');
                                    }}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center text-sm"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                    Add Dropoff
                                </button>
                            </div>
                        </div>
                    )}
                />
            </div>

            {/* Add Custom Item Modal */}
            {showCustomItemModal !== null && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add Custom Item</h3>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const newItem: Item = {
                                    id: uuidv4(),
                                    name: formData.get('name') as string,
                                    category: formData.get('category') as string,
                                    quantity: parseInt(formData.get('quantity') as string) || 1,
                                    weight: formData.get('weight') as string,
                                    dimensions: formData.get('dimensions') as string,
                                    value: formData.get('value') as string,
                                    fragile: formData.get('fragile') === 'on',
                                    needs_disassembly: formData.get('needs_disassembly') === 'on',
                                };

                                if (showCustomItemModal !== null) {
                                    const currentItems = values.journey_stops[showCustomItemModal].items || [];
                                    setFieldValue(`journey_stops.${showCustomItemModal}.items`, [...currentItems, newItem]);
                                    setShowCustomItemModal(null);
                                }
                            }}
                        >
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                                    <select
                                        name="category"
                                        required
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="furniture">Furniture</option>
                                        <option value="electronics">Electronics</option>
                                        <option value="boxes">Boxes</option>
                                        <option value="appliances">Appliances</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        min="1"
                                        defaultValue="1"
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Weight (kg)</label>
                                        <input
                                            type="text"
                                            name="weight"
                                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dimensions</label>
                                        <input
                                            type="text"
                                            name="dimensions"
                                            placeholder="L × W × H"
                                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="fragile"
                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Fragile</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="needs_disassembly"
                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Needs Disassembly</span>
                                    </label>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCustomItemModal(null)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
                                    Add Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Common Items Modal */}
            {showCommonItems !== null && (
                <CommonItemsModal
                    isOpen={showCommonItems !== null}
                    onClose={() => setShowCommonItems(null)}
                    onSelectItem={(item: Item) => {
                        if (showCommonItems !== null) {
                            const stop = values.journey_stops[showCommonItems];
                            if (stop.type === 'pickup') {
                                addItemToPickup(showCommonItems, item);
                            } else if (stop.type === 'dropoff') {
                                handleItemLink(showCommonItems, item.id);
                            }
                            setShowCommonItems(null);
                        }
                    }}
                />
            )}
        </div>
    );
};
