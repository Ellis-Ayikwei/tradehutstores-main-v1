import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChevronDown,
    faChevronUp,
    faEdit,
    faUser,
    faTag,
    faLocationDot,
    faBuilding,
    faRoute,
    faBox,
    faTrash,
    faCalendar,
    faClock,
    faShieldAlt,
    faInfoCircle,
    faTable,
    faCheckCircle,
    faMoneyBillWave,
} from '@fortawesome/free-solid-svg-icons';
import { IconClipboardCheck, IconShieldCheck, IconThumbUp } from '@tabler/icons-react';

interface RequestDetailsPanelProps {
    values: any;
    onEditStep: (stepNumber: number) => void;
    currentStep: number;
    onRemoveItem?: (itemId: string) => void;
    onPriceReselection?: () => void;
}

const RequestDetailsPanel: React.FC<RequestDetailsPanelProps> = ({ values, onEditStep, currentStep, onRemoveItem, onPriceReselection }) => {
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        contact: true,
        request: true,
        pickup: true,
        dropoff: true,
        journey: true,
        items: true,
        schedule: true,
    });

    const toggleSection = (section: string) => {
        setExpandedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const renderSection = (title: string, section: string, icon: any, content: React.ReactNode, stepNumber: number, shouldShow: boolean = true) => {
        if (!shouldShow) return null;

        return (
            <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <button onClick={() => toggleSection(section)} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <div className="flex items-center">
                        <FontAwesomeIcon icon={icon} className="mr-2 text-gray-600 dark:text-gray-400" />
                        <span className="font-medium text-gray-800 dark:text-gray-200">{title}</span>
                    </div>
                    <div className="flex items-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditStep(stepNumber);
                            }}
                            className="mr-2 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        >
                            <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <FontAwesomeIcon icon={expandedSections[section] ? faChevronUp : faChevronDown} className="text-gray-400" />
                    </div>
                </button>
                {expandedSections[section] && <div className="px-4 pb-3">{content}</div>}
            </div>
        );
    };

    // Only show the panel if we're past step 1
    if (currentStep < 2) return null;

    const hasContactInfo = values.contact_name || values.contact_phone || values.contact_email;
    const hasRequestInfo = values.request_type || values.service_type;
    const hasPickupInfo = values.request_type !== 'journey' && (values.pickup_location || values.pickup_floor || values.propertyType || values.pickup_number_of_floors);
    const hasDropoffInfo = values.request_type !== 'journey' && (values.dropoff_location || values.dropoff_floor || values.dropoffPropertyType || values.dropoff_number_of_floors);
    const hasJourneyStops = values.request_type === 'journey' && values.journey_stops && values.journey_stops.length > 0;
    const hasItems = values.moving_items && values.moving_items.length > 0;
    const hasSchedule = values.preferred_date || values.preferred_time;
    const hasPriceInfo = values.selected_price || values.staff_count;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-green-50 dark:bg-green-900/20 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                    <IconClipboardCheck className="mr-2 text-green-600 dark:text-green-400" size={20} />
                    Review Your Request
                </h3>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Contact Information */}
                {renderSection(
                    'Contact Details',
                    'contact',
                    faUser,
                    <div className="space-y-2 text-sm">
                        <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                            <li>
                                <span className="font-medium">Name:</span> {values.contact_name || `${values.first_name || ''} ${values.last_name || ''}`}
                            </li>
                            <li>
                                <span className="font-medium">Phone:</span> {values.contact_phone || values.phone}
                            </li>
                            <li>
                                <span className="font-medium">Email:</span> {values.contact_email || values.email}
                            </li>
                        </ul>
                    </div>,
                    1,
                    hasContactInfo
                )}

                {/* Service Details */}
                {renderSection(
                    'Service Details',
                    'request',
                    faTag,
                    <div className="space-y-2 text-sm">
                        <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                            <li>
                                <span className="font-medium">Type:</span> {values.itemType || (values.request_type === 'journey' ? 'Multi-Stop Journey' : 'Standard Service')}
                            </li>
                            <li>
                                <span className="font-medium">Size:</span> {values.item_size || 'Not specified'}
                            </li>
                            <li>
                                <span className="font-medium">Pricing:</span>{' '}
                                {values.request_type === 'instant' ? 'Instant' : values.request_type === 'bidding' ? 'Competitive Bidding' : 'Multi-Stop Journey'}
                            </li>
                        </ul>
                    </div>,
                    2,
                    hasRequestInfo
                )}

                {/* Pickup Details */}
                {renderSection(
                    'Pickup Location',
                    'pickup',
                    faLocationDot,
                    <div className="space-y-2 text-sm">
                        <p className="text-gray-600 dark:text-gray-400">{typeof values.pickup_location === 'object' ? values.pickup_location.address : values.pickup_location}</p>
                        {(values.pickup_unit_number || values.pickup_floor > 0) && (
                            <p className="text-gray-500 dark:text-gray-400 text-xs">
                                {values.pickup_unit_number && `Unit ${values.pickup_unit_number}, `}
                                {values.pickup_floor > 0 && `Floor ${values.pickup_floor}`}
                            </p>
                        )}
                        {values.propertyType && (
                            <p className="text-gray-600 dark:text-gray-400">
                                <span className="font-medium">Property:</span> {values.propertyType}
                            </p>
                        )}
                    </div>,
                    3,
                    hasPickupInfo
                )}

                {/* Dropoff Details */}
                {renderSection(
                    'Dropoff Location',
                    'dropoff',
                    faBuilding,
                    <div className="space-y-2 text-sm">
                        <p className="text-gray-600 dark:text-gray-400">{typeof values.dropoff_location === 'object' ? values.dropoff_location.address : values.dropoff_location}</p>
                        {(values.dropoff_unit_number || values.dropoff_floor > 0) && (
                            <p className="text-gray-500 dark:text-gray-400 text-xs">
                                {values.dropoff_unit_number && `Unit ${values.dropoff_unit_number}, `}
                                {values.dropoff_floor > 0 && `Floor ${values.dropoff_floor}`}
                            </p>
                        )}
                        {values.dropoffPropertyType && (
                            <p className="text-gray-600 dark:text-gray-400">
                                <span className="font-medium">Property:</span> {values.dropoffPropertyType}
                            </p>
                        )}
                    </div>,
                    4,
                    hasDropoffInfo
                )}

                {/* Journey Stops */}
                {renderSection(
                    'Journey Stops',
                    'journey',
                    faRoute,
                    <div className="space-y-4">
                        {values.journey_stops.map((stop: any, idx: number) => (
                            <div
                                key={`summary-${stop.id || idx}`}
                                className={`p-3 rounded-lg border ${
                                    stop.type === 'pickup'
                                        ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                                        : stop.type === 'dropoff'
                                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                                        : 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20'
                                }`}
                            >
                                <div className="flex items-center">
                                    <div
                                        className={`
                                            w-6 h-6 rounded-full flex items-center justify-center mr-2
                                            ${stop.type === 'pickup' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : ''}
                                            ${stop.type === 'dropoff' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300' : ''}
                                            ${stop.type === 'stop' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300' : ''}
                                        `}
                                    >
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{stop.type.charAt(0).toUpperCase() + stop.type.slice(1)}:</span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">{stop.location.address || '(Address not entered)'}</span>
                                    </div>
                                </div>

                                {/* Show items for pickup stops */}
                                {stop.type === 'pickup' && stop.items && stop.items.length > 0 && (
                                    <div className="mt-3 pl-8">
                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Items to pickup ({stop.items.length}):</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {stop.items.map((item: any) => (
                                                <div key={item.id} className="text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                                                    <div className="font-medium text-gray-700 dark:text-gray-300">
                                                        {item.name || 'Unnamed item'} {item.quantity > 1 ? `(x${item.quantity})` : ''}
                                                    </div>
                                                    {item.dimensions && (
                                <div className="text-gray-600 dark:text-gray-400 mt-1">
                                    {(() => {
                                        const dims = item.dimensions;
                                        if (!dims) return 'N/A';
                                        
                                        if (typeof dims === 'string') {
                                            // Try to parse string format
                                            const match = dims.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*(\w+)/);
                                            if (match) {
                                                const [, width, height, length, unit] = match;
                                                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                return `${volume.toFixed(0)} cubic ${unit}`;
                                            }
                                            return dims;
                                        }
                                        
                                        if (typeof dims === 'object') {
                                            const { unit, width, height, length } = dims as any;
                                            if (width && height && length) {
                                                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                return `${volume.toFixed(0)} cubic ${unit || 'cm'}`;
                                            }
                                        }
                                                                                 
                                         return 'N/A';
                                    })()}
                                </div>
                            )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Show linked items for dropoff stops */}
                                {stop.type === 'dropoff' && stop.linked_items && stop.linked_items.length > 0 && (
                                    <div className="mt-3 pl-8">
                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Items to drop off ({stop.linked_items.length}):</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {stop.linked_items.map((itemId: string) => {
                                                const pickupStops = values.journey_stops.filter((s: any) => s.type === 'pickup');
                                                let foundItem = null;

                                                for (const pickupStop of pickupStops) {
                                                    if (pickupStop.items) {
                                                        foundItem = pickupStop.items.find((item: any) => item.id === itemId);
                                                        if (foundItem) break;
                                                    }
                                                }

                                                return foundItem ? (
                                                    <div key={itemId} className="text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                                                        <div className="font-medium text-gray-700 dark:text-gray-300">
                                                            {foundItem.name || 'Unnamed item'} {foundItem.quantity > 1 ? `(x${foundItem.quantity})` : ''}
                                                        </div>
                                                        {foundItem.dimensions && (
                                <div className="text-gray-600 dark:text-gray-400 mt-1">
                                    {(() => {
                                        const dims = foundItem.dimensions;
                                        if (!dims) return 'N/A';
                                        
                                        if (typeof dims === 'string') {
                                            // Try to parse string format
                                            const match = dims.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*(\w+)/);
                                            if (match) {
                                                const [, width, height, length, unit] = match;
                                                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                return `${volume.toFixed(0)} cubic ${unit}`;
                                            }
                                            return dims;
                                        }
                                        
                                        if (typeof dims === 'object') {
                                            const { unit, width, height, length } = dims as any;
                                            if (width && height && length) {
                                                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                return `${volume.toFixed(0)} cubic ${unit || 'cm'}`;
                                            }
                                        }
                                        
                                        return 'N/A';
                                    })()}
                                </div>
                            )}
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Show additional details if available */}
                                {stop.instructions && (
                                    <div className="mt-2 pl-8 text-xs text-gray-600 dark:text-gray-400">
                                        <p className="font-medium">Instructions:</p>
                                        <p className="italic">{stop.instructions}</p>
                                    </div>
                                )}

                                {stop.property_type && (
                                    <div className="mt-2 pl-8 text-xs">
                                        <p className="font-medium text-gray-600 dark:text-gray-400">Property:</p>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            {stop.property_type.charAt(0).toUpperCase() + stop.property_type.slice(1)}, {stop.number_of_rooms} {stop.number_of_rooms === 1 ? 'room' : 'rooms'},{' '}
                                            {stop.number_of_floors} {stop.number_of_floors === 1 ? 'floor' : 'floors'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>,
                    5,
                    hasJourneyStops
                )}

                {/* Selected Items */}
                {renderSection(
                    'Items Inventory',
                    'items',
                    faTable,
                    <div className="space-y-4">
                        {values.moving_items?.map((item: any) => (
                            <div key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-start">
                                    {item.photos && item.photos.length > 0 && (
                                        <div className="mr-3">
                                            <img
                                                src={typeof item.photos[0] === 'string' ? item.photos[0] : URL.createObjectURL(item.photos[0])}
                                                alt={item.name}
                                                className="h-12 w-12 object-cover rounded border border-gray-200 dark:border-gray-700"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-grow">
                                        <div className="font-medium text-gray-800 dark:text-gray-200">{item.name || 'Unnamed item'}</div>
                                        {item.dimensions && (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {(() => {
                                        const dims = item.dimensions;
                                        if (!dims) return 'N/A';
                                        
                                        if (typeof dims === 'string') {
                                            // Try to parse string format
                                            const match = dims.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*(\w+)/);
                                            if (match) {
                                                const [, width, height, length, unit] = match;
                                                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                return `${volume.toFixed(0)} cubic ${unit}`;
                                            }
                                            return dims;
                                        }
                                        
                                        if (typeof dims === 'object') {
                                            const { unit, width, height, length } = dims as any;
                                            if (width && height && length) {
                                                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                return `${volume.toFixed(0)} cubic ${unit || 'cm'}`;
                                            }
                                        }
                                        
                                        return 'N/A';
                                    })()}
                                </div>
                            )}
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={() => onEditStep(3)} className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                                            <FontAwesomeIcon icon={faEdit} />
                                        </button>
                                        {onRemoveItem && (
                                            <button onClick={() => onRemoveItem(item.id)} className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>,
                    3,
                    hasItems
                )}

                {/* Schedule */}
                {renderSection(
                    'Schedule',
                    'schedule',
                    faCalendar,
                    <div className="space-y-2 text-sm">
                        <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                            <li>
                                <span className="font-medium">Date:</span> {values.preferred_date || 'Not selected'}
                            </li>
                            <li>
                                <span className="font-medium">Time:</span> {values.preferred_time || 'Not selected'}
                            </li>
                            <li>
                                <span className="font-medium">Flexible:</span> {values.is_flexible ? 'Yes' : 'No'}
                            </li>
                            {values.preferred_time_slot && (
                                <li>
                                    <span className="font-medium">Time Slot:</span> {values.preferred_time_slot}
                                </li>
                            )}
                            {values.preferred_time_window && (
                                <li>
                                    <span className="font-medium">Time Window:</span> {values.preferred_time_window}
                                </li>
                            )}
                            {values.preferred_time_range && (
                                <li>
                                    <span className="font-medium">Time Range:</span> {values.preferred_time_range}
                                </li>
                            )}
                            {values.preferred_time_period && (
                                <li>
                                    <span className="font-medium">Time Period:</span> {values.preferred_time_period}
                                </li>
                            )}
                            {values.preferred_time_notes && (
                                <li>
                                    <span className="font-medium">Notes:</span> {values.preferred_time_notes}
                                </li>
                            )}
                        </ul>
                    </div>,
                    4,
                    hasSchedule
                )}

                {/* Price Details */}
                {renderSection(
                    'Price Details',
                    'price',
                    faMoneyBillWave,
                    <div className="space-y-2 text-sm">
                        <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                            <li>
                                <span className="font-medium">Selected Date:</span> {values.selected_date ? new Date(values.selected_date).toLocaleDateString() : 'Not selected'}
                            </li>
                            <li>
                                <span className="font-medium">Staff Count:</span> {values.staff_count || 'Not selected'}
                            </li>
                            <li>
                                <span className="font-medium">Total Price:</span> {values.selected_price ? `$${values.selected_price.toFixed(2)}` : 'Not selected'}
                            </li>
                        </ul>
                        {values.selected_price && onPriceReselection && (
                            <button
                                onClick={onPriceReselection}
                                className="mt-3 w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                <FontAwesomeIcon icon={faEdit} className="mr-2" />
                                Change Price Selection
                            </button>
                        )}
                    </div>,
                    4,
                    hasPriceInfo
                )}
            </div>

            {/* Accept Request Button */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => onEditStep(5)}
                    className="w-full flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                    Accept Request
                </button>
            </div>

            {/* Trust Badges */}
            <div className="p-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-2">
                            <IconShieldCheck className="text-green-600 dark:text-green-400" size={20} />
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Insured Service</p>
                    </div>
                    <div className="text-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-2">
                            <IconThumbUp className="text-blue-600 dark:text-blue-400" size={20} />
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Satisfaction Guaranteed</p>
                    </div>
                    <div className="text-center">
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mx-auto mb-2">
                            <FontAwesomeIcon icon={faInfoCircle} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">24/7 Support</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequestDetailsPanel;
