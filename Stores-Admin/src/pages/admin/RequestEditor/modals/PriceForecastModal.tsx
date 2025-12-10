import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { IconX, IconCheck, IconUsers, IconCalendar, IconCurrencyPound, IconClock } from '@tabler/icons-react';

interface PriceOption {
    id: string;
    staff_count: number;
    price: number;
    estimated_duration: string;
    available_dates: string[];
    features: string[];
    recommended: boolean;
}

interface PriceForecastModalProps {
    isOpen: boolean;
    onClose: () => void;
    priceForecast: any;
    onPriceSelect: (option: PriceOption) => void;
}

const PriceForecastModal: React.FC<PriceForecastModalProps> = ({
    isOpen,
    onClose,
    priceForecast,
    onPriceSelect
}) => {
    const [selectedOption, setSelectedOption] = useState<PriceOption | null>(null);

    const handleSelectOption = (option: PriceOption) => {
        setSelectedOption(option);
    };

    const handleConfirm = () => {
        if (selectedOption) {
            onPriceSelect(selectedOption);
        }
    };

    if (!priceForecast) {
        return null;
    }

    
    // Extract summary data from the full API response structure
    const getSummaryData = () => {
        // Use frontend calculated values as primary source, fallback to API response
        const frontendCalculated = priceForecast.frontend_calculated;
        
        const totalItems = frontendCalculated?.total_items || 
                          priceForecast.price_forecast?.base_parameters?.total_items || 
                          priceForecast.price_forecast?.base_parameters?.items_count || 0;
        
        const totalWeight = frontendCalculated?.total_weight || 
                           priceForecast.forecast_metadata?.total_weight || 
                           priceForecast.price_forecast?.base_parameters?.weight || 0;
        
        const estimatedDistance = frontendCalculated?.estimated_distance || 
                                priceForecast.estimated_distance || 0;
        
        return {
            total_items: totalItems,
            total_weight: totalWeight,
            estimated_distance: estimatedDistance
        };
    };

    const summaryData = getSummaryData();
    
    // Extract options from API response only - no fallbacks
    let options: PriceOption[] = priceForecast.price_forecast?.options || 
                                priceForecast.price_forecast?.price_options || 
                                priceForecast.options || 
                                priceForecast.price_options || [];
    
    // If no options found in standard locations, check monthly_calendar structure
    if (options.length === 0 && priceForecast.price_forecast?.monthly_calendar) {
        const monthlyCalendar = priceForecast.price_forecast.monthly_calendar;
        
        // Try to extract pricing options from the calendar structure
        if (monthlyCalendar && typeof monthlyCalendar === 'object') {
            const calendarKeys = Object.keys(monthlyCalendar);
            
            // Look for month-year keys (e.g., "2025-10", "2025-11")
            for (const monthKey of calendarKeys) {
                const monthData = monthlyCalendar[monthKey];
                
                if (Array.isArray(monthData) && monthData.length > 0) {
                    // Look through each day in the month
                    for (const dayData of monthData) {
                        // Check if this day has staff_prices
                        if (dayData.staff_prices && Array.isArray(dayData.staff_prices)) {
                            // Convert staff_prices to PriceOption format
                            const dayOptions = dayData.staff_prices.map((staffPrice: any, index: number) => ({
                                id: `${dayData.date}-${staffPrice.staff_count}-staff`,
                                staff_count: staffPrice.staff_count || 1,
                                price: staffPrice.price || 0,
                                estimated_duration: dayData.estimated_duration || '2-4 hours',
                                available_dates: [dayData.date],
                                features: [
                                    `${staffPrice.staff_count} Staff Member${staffPrice.staff_count > 1 ? 's' : ''}`,
                                    dayData.is_weekend ? 'Weekend Service' : 'Weekday Service',
                                    dayData.weather_type === 'normal' ? 'Normal Weather' : dayData.weather_type
                                ],
                                recommended: staffPrice.staff_count === dayData.best_staff_count
                            }));
                            
                            // Add these options to our main options array
                            options = [...options, ...dayOptions];
                        }
                    }
                }
            }
            
            // Remove duplicates based on staff_count and price combination
            const uniqueOptions = options.reduce((acc: PriceOption[], current: PriceOption) => {
                const exists = acc.find(option => 
                    option.staff_count === current.staff_count && 
                    option.price === current.price
                );
                if (!exists) {
                    acc.push(current);
                }
                return acc;
            }, []);
            
            options = uniqueOptions;
        }
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                            Price Forecast Options
                                        </Dialog.Title>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            Select your preferred pricing option and staff configuration
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <IconX className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Summary */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Request Summary</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-blue-700 dark:text-blue-300">Items:</span>
                                            <span className="ml-2 text-blue-900 dark:text-blue-100">{summaryData.total_items}</span>
                                        </div>
                                        <div>
                                            <span className="text-blue-700 dark:text-blue-300">Total Weight:</span>
                                            <span className="ml-2 text-blue-900 dark:text-blue-100">{summaryData.total_weight} kg</span>
                                        </div>
                                        <div>
                                            <span className="text-blue-700 dark:text-blue-300">Distance:</span>
                                            <span className="ml-2 text-blue-900 dark:text-blue-100">{summaryData.estimated_distance} km</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Price Options */}
                                <div className="space-y-4 mb-6">
                                    {options.length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="text-gray-500 dark:text-gray-400 mb-2">
                                                <IconCurrencyPound className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                                    No Pricing Options Available
                                                </h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    The API did not return any pricing options for this request.
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                                    Check the console logs for API response structure details.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        options.map((option) => (
                                        <div
                                            key={option.id}
                                            className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                                                selectedOption?.id === option.id
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            } ${option.recommended ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
                                            onClick={() => handleSelectOption(option)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                                                            {option.staff_count} Staff Member{option.staff_count > 1 ? 's' : ''}
                                                        </h5>
                                                        {option.recommended && (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                                Recommended
                                                            </span>
                                                        )}
                                                        {selectedOption?.id === option.id && (
                                                            <IconCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                        )}
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <IconCurrencyPound className="w-4 h-4 text-gray-400" />
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">Price:</span>
                                                            <span className="text-lg font-bold text-gray-900 dark:text-white">£{option.price}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <IconClock className="w-4 h-4 text-gray-400" />
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">Duration:</span>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{option.estimated_duration}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <IconUsers className="w-4 h-4 text-gray-400" />
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">Staff:</span>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{option.staff_count}</span>
                                                        </div>
                                                    </div>

                                                    {option.features && option.features.length > 0 && (
                                                        <div className="mb-4">
                                                            <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Features:</h6>
                                                            <div className="flex flex-wrap gap-2">
                                                                {option.features.map((feature, index) => (
                                                                    <span
                                                                        key={index}
                                                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                                                                    >
                                                                        {feature}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {option.available_dates && option.available_dates.length > 0 && (
                                                        <div>
                                                            <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Dates:</h6>
                                                            <div className="flex flex-wrap gap-2">
                                                                {option.available_dates.slice(0, 3).map((date, index) => (
                                                                    <span
                                                                        key={index}
                                                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                                                    >
                                                                        <IconCalendar className="w-3 h-3 mr-1" />
                                                                        {new Date(date).toLocaleDateString()}
                                                                    </span>
                                                                ))}
                                                                {option.available_dates.length > 3 && (
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                        +{option.available_dates.length - 3} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end space-x-3">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                    >
                                        {options.length === 0 ? 'Close' : 'Cancel'}
                                    </button>
                                    {options.length > 0 && (
                                        <button
                                            onClick={handleConfirm}
                                            disabled={!selectedOption}
                                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
                                        >
                                            Select This Option
                                        </button>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default PriceForecastModal;
