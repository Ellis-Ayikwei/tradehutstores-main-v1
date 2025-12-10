import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { CalendarIcon, UserIcon, TruckIcon, ClipboardDocumentCheckIcon, ClockIcon, BuildingOfficeIcon, MapPinIcon, DocumentCheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import PriceDetailsModal from './PriceDetailsModal';
import { formatCurrency } from '../../helper/formatCurrency';
import { IconLock, IconMoneybagMinus, IconShieldCheck, IconStar, IconClock, IconTruck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';

interface StaffPrice {
    staff_count: number;
    price: number;
    components: {
        base_price: number;
        distance_cost: number;
        weight_cost: number;
        property_cost: number;
        staff_cost: number;
        vehicle_cost: number;
        service_cost: number;
        time_cost: number;
        weather_cost: number;
        insurance_cost: number;
        fuel_surcharge: number;
        carbon_offset: number;
    };
    multipliers: {
        service_multiplier: number;
        time_multiplier: number;
        weather_multiplier: number;
        vehicle_multiplier: number;
    };
}

interface DayPrice {
    date: string;
    day: number;
    day_name: string;
    is_weekend: boolean;
    is_holiday: boolean;
    holiday_name: string | null;
    weather_type: string;
    staff_prices: StaffPrice[];
    status: string;
    best_price: number | null;
    best_staff_count: number | null;
}

interface PriceForecast {
    pricing_configuration: string;
    base_parameters: {
        distance: number;
        weight: number;
        service_level: string;
        property_type: string;
        vehicle_type: string;
    };
    monthly_calendar: {
        [key: string]: DayPrice[];
    };
}

interface PriceForecastPageProps {
    priceForecast: PriceForecast;
    request_id: string;
    onAccept: (staffCount: string, price: number, date: string) => void;
    onBack: () => void;
}

const getWeatherIcon = (weatherType: string) => {
    switch (weatherType?.toLowerCase()) {
        case 'sunny':
            return '☀️';
        case 'rainy':
            return '🌧️';
        case 'cloudy':
            return '☁️';
        case 'snowy':
            return '❄️';
        case 'partly_cloudy':
            return '⛅';
        case 'clear':
            return '🌤️';
        case 'overcast':
            return '☁️';
        case 'foggy':
            return '🌫️';
        case 'windy':
            return '💨';
        default:
            return '☀️'; // Default to sunny instead of snowy
    }
};

const StaffCountIcon: React.FC<{ count: number }> = ({ count }) => {
    const users = Array.from({ length: count }, (_, i) => i);
    return (
        <div className="flex -space-x-2">
            {users.map((index) => (
                <motion.div key={index} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * 0.1 }} className="relative">
                    <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-blue-600" />
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

const PriceForecastPage: React.FC<PriceForecastPageProps> = ({ priceForecast, request_id, onAccept, onBack }) => {
    const navigate = useNavigate();
    const [selectedDay, setSelectedDay] = useState<DayPrice | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<string>('staff_1');
    const [showLoading, setShowLoading] = useState(true);
    const [visibleDaysCount, setVisibleDaysCount] = useState(10);
    const [showPriceDetailModal, setShowPriceDetailModal] = useState(false);
    const [isPriceSelected, setIsPriceSelected] = useState(false);

    // useEffect(() => {
    //     const timer = setTimeout(() => {
    //         setShowLoading(false);
    //     }, 4000);
    //     return () => clearTimeout(timer);
    // }, []);

    if (!priceForecast) return null;

    console.log('the request id ', request_id);

    const getStaffOptions = () => {
        if (!priceForecast?.monthly_calendar) return [];
        const firstMonth = Object.values(priceForecast.monthly_calendar)[0];
        if (!firstMonth || firstMonth.length === 0) return [];
        const firstDay = firstMonth[0];
        if (!firstDay?.staff_prices || firstDay.staff_prices.length === 0) return [];
        return firstDay.staff_prices.map((_, index) => `staff_${index + 1}`);
    };

    const handleAccept = (staffCount: string, price: number, date: string) => {
        onAccept(staffCount, price, date);
        setShowPriceDetailModal(false);
        setSelectedDay(null);
        setIsPriceSelected(true);

        // Update the parent component with the selected price information
        const staffIndex = parseInt(staffCount.split('_')[1]) - 1;
        const selectedStaffPrice = selectedDay?.staff_prices[staffIndex];

        if (selectedStaffPrice) {
            // Pass the complete price information to the parent
            onAccept(staffCount, selectedStaffPrice.price, date);
        }
    };

    const showMoreDays = () => {
        setVisibleDaysCount((prev) => prev + 10);
    };

    const showLessDays = () => {
        setVisibleDaysCount(10);
    };

    // Process days for mobile view
    const allDays = Object.entries(priceForecast.monthly_calendar).reduce((acc, [_, days]) => {
        return [...acc, ...days];
    }, [] as DayPrice[]);

    const sortedDays = allDays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const visibleDays = sortedDays.slice(0, visibleDaysCount);
    const hasMoreDays = visibleDaysCount < sortedDays.length;

    // Group visible days by month for mobile display
    const groupedDays = visibleDays.reduce((acc, day) => {
        const month = day.date.substring(0, 7);
        if (!acc[month]) {
            acc[month] = [];
        }
        acc[month].push(day);
        return acc;
    }, {} as { [key: string]: DayPrice[] });

    // Find which staff option has the best price for a day
    const getBestStaffOption = (day: DayPrice) => {
        if (!day.staff_prices || day.staff_prices.length === 0) return '';
        let bestStaff = '';
        let bestPrice = Infinity;

        day.staff_prices.forEach((price, index) => {
            if (price.price < bestPrice && !isNaN(price.price)) {
                bestPrice = price.price;
                bestStaff = `staff_${index + 1}`;
            }
        });

        return bestStaff;
    };

    // Handle price selection and return to API
    const handlePriceSelect = async (day: DayPrice, staffOption: string) => {
        try {
            const response = await fetch('/api/price-selection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    date: day.date,
                    staff_option: staffOption,
                    price: day.staff_prices[parseInt(staffOption.split('_')[1]) - 1].price,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save price selection');
            }

            console.log('Price selection saved successfully');
        } catch (error) {
            console.error('Error saving price selection:', error);
        }
    };

    const handleBack = () => {
        // Navigate back to the request form with the request_id
    };

    // if (showLoading) {
    //     return (
    //         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    //             <div className="text-center">
    //                 <motion.div
    //                     animate={{ rotate: 360 }}
    //                     transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    //                     className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
    //                 />
    //                 <h2 className="text-xl font-semibold text-gray-700">Loading Price Forecast...</h2>
    //             </div>
    //         </div>
    //     );
    // }

    const staffOptions = getStaffOptions();

    // If price is selected, don't render the price forecast page
    if (isPriceSelected) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto px-21lg:px-8 py-4">
                {/* Header Section */}
                <div className="relative bg-white rounded-xl shadow-sm p-4 sm:p-2 mb-4 sm:mb-8 border border-gray-200 overflow-hidden">
                    {/* Enhanced Background Elements */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5"></div>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-3xl opacity-50"></div>

                    {/* Content with relative positioning */}
                    <div className="relative z-10">
                        <div className="flex sm:flex-row items-start sm:items-center gap-4 mb-4 sm:mb-6">
                            <button onClick={() => onBack()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 flex items-center gap-2">
                                <IconArrowLeft className="w-6 h-6 text-gray-600" />
                            </button>
                            <div className="p-3 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg backdrop-blur-sm border border-primary/20">
                                <CalendarIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-primary">Select A Date</h1>
                                <p className="text-sm font-medium sm:text-base text-gray-600">Explore pricing options for different dates</p>
                                <p className="text-sm sm:text-base text-gray-600">
                                    Your delivery date will be <strong>today</strong>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-row items-center gap-1 mb-2 text-green-700 w-full">
                            <div className="flex flex-row items-center gap-1 mb-2 border border-gray-200 rounded-lg p-2 text-green-700 bg-white/50 backdrop-blur-sm">
                                <IconMoneybagMinus className="w-6 h-6" />
                                <p className="text-sm font-medium sm:text-base">38% cheaper than average</p>
                            </div>
                        </div>

                        {/* Staff Selector */}
                        <div className="mb-4 sm:mb-6">
                            <div className="grid grid-cols-4 gap-1 sm:gap-3">
                                {staffOptions.map((staff) => {
                                    const staffCount = parseInt(staff.split('_')[1]);
                                    return (
                                        <button
                                            key={staff}
                                            onClick={() => setSelectedStaff(staff)}
                                            className={`p-1 sm:p-2 rounded-lg transition-all ${
                                                selectedStaff === staff ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center justify-center gap-0.5 sm:gap-2">
                                                <div className="flex -space-x-1 sm:-space-x-2">
                                                    {Array.from({ length: staffCount }).map((_, i) => (
                                                        <motion.div key={i} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} className="relative">
                                                            <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center">
                                                                <UserIcon className="w-2 h-2 sm:w-4 sm:h-4 text-blue-600" />
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                                <span className="text-[10px] sm:text-sm font-medium">{staffCount}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Calendar View */}
                <div className="sm:hidden">
                    {Object.entries(groupedDays).map(([month, days]) => (
                        <div key={month} className="bg-white rounded-lg shadow-sm p-2 mb-3 border border-gray-200">
                            <h3 className="text-base font-bold text-gray-900 mb-2">{format(new Date(`${month}-01`), 'MMMM yyyy')}</h3>

                            <div className="grid grid-cols-1 gap-1">
                                {days.map((day) => {
                                    const staffIndex = parseInt(selectedStaff.split('_')[1]) - 1;
                                    const staffPrice = day.staff_prices?.[staffIndex];
                                    const bestPrice = day.best_price;
                                    const isBestPrice = staffPrice?.price === bestPrice;
                                    const isAvailable = staffPrice && !isNaN(staffPrice.price);
                                    const dayName = format(new Date(day.date + 'T00:00:00Z'), 'EEE');

                                    return (
                                        <motion.div
                                            key={day.date}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => isAvailable && setSelectedDay(day)}
                                            className={`rounded-lg cursor-pointer transition-colors
                                                ${isAvailable ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}
                                                ${day.is_weekend ? 'bg-yellow-50' : 'bg-white'}
                                                ${day.is_holiday ? 'border-2 border-red-200' : 'border border-gray-200'}
                                                p-1.5
                                            `}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-gray-700">
                                                        {dayName}, {format(new Date(day.date), 'MMM d')}
                                                    </span>
                                                    {day.is_holiday && <span className="text-[10px] text-red-600">{day.holiday_name}</span>}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="text-sm">{getWeatherIcon(day.weather_type)}</div>
                                                    {isAvailable ? (
                                                        <div className="text-right">
                                                            <div className={`text-xs font-bold ${isBestPrice ? 'text-primary' : 'text-gray-900'}`}>{formatCurrency(staffPrice.price)}</div>
                                                            {isBestPrice && (
                                                                <div className="flex items-center justify-end gap-0.5 text-[10px] text-green-600">
                                                                    <IconStar className="w-2.5 h-2.5 text-green-600" />
                                                                    Best Price
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-400 text-[10px]">Not available</div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Mobile Show More/Less Buttons */}
                    <div className="flex justify-center gap-3 mt-3">
                        {hasMoreDays && (
                            <button onClick={showMoreDays} className="px-4 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                                Show 10 More Days
                            </button>
                        )}
                        {visibleDaysCount > 10 && (
                            <button onClick={showLessDays} className="px-4 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                                Show Less
                            </button>
                        )}
                    </div>
                </div>

                {/* Desktop Calendar View */}
                <div className="hidden sm:block">
                    {Object.entries(priceForecast.monthly_calendar).map(([month, days]) => (
                        <div key={month} className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">{format(new Date(`${month}-01`), 'MMMM yyyy')}</h3>

                            <div className="grid grid-cols-7 gap-0.5">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                                        {day}
                                    </div>
                                ))}

                                {/* Create a grid of 42 cells (6 rows x 7 columns) */}
                                {Array.from({ length: 42 }).map((_, index) => {
                                    // Calculate the date for this cell
                                    const firstDayOfMonth = new Date(`${month}-01`);
                                    const firstDayWeekday = firstDayOfMonth.getDay() || 7; // Convert Sunday (0) to 7
                                    const adjustedIndex = index - (firstDayWeekday - 1); // Adjust for Monday start

                                    // Find the day data if it exists
                                    const day = days.find((d) => {
                                        const dayDate = new Date(d.date);
                                        return dayDate.getDate() === adjustedIndex + 1;
                                    });

                                    if (!day) {
                                        return <div key={index} className="min-h-[90px] p-1.5" />;
                                    }

                                    const staffIndex = parseInt(selectedStaff.split('_')[1]) - 1;
                                    const staffPrice = day.staff_prices?.[staffIndex];
                                    const isBestPrice = staffPrice?.price === day.best_price && staffPrice?.staff_count === day.best_staff_count;
                                    const isAvailable = staffPrice && !isNaN(staffPrice.price);

                                    return (
                                        <motion.div
                                            key={day.date}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setShowPriceDetailModal(true);
                                                setSelectedDay(day);
                                            }}
                                            className={`min-h-[90px] p-1.5 rounded-lg cursor-pointer transition-colors
                                                ${isAvailable ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}
                                                ${day.is_weekend ? 'bg-yellow-50' : 'bg-white'}
                                                ${day.is_holiday ? 'border-2 border-red-200' : 'border border-gray-200'}
                                            `}
                                        >
                                            <div className="flex flex-col items-center h-full justify-between">
                                                {/* Date Header */}
                                                <div className="w-full flex flex-col items-center">
                                                    <span className="text-xs font-bold text-gray-700">
                                                        {day.day_name}, {format(new Date(day.date), 'd')}
                                                    </span>
                                                    {day.is_holiday && <span className="text-[10px] text-center font-bold text-red-600 line-clamp-1">{day.holiday_name}</span>}
                                                </div>

                                                {/* Weather Indicator */}
                                                <div className="text-lg my-0.5">{getWeatherIcon(day.weather_type)}</div>

                                                {/* Price Display */}
                                                {isAvailable ? (
                                                    <div className="text-center mt-auto">
                                                        <div className={`text-lg font-bold ${isBestPrice ? 'text-primary' : 'text-gray-900'}`}>{formatCurrency(staffPrice.price)}</div>
                                                        {isBestPrice && (
                                                            <div className="flex items-center justify-center gap-0.5 text-[12px] text-green-600 mt-0.5">
                                                                <IconStar className="w-3 h-3 text-green-600" />
                                                                Best Price
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-400 text-[10px] mt-auto">Not available</div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedDay && showPriceDetailModal && (
                <PriceDetailsModal
                    isOpen={showPriceDetailModal}
                    onClose={() => {
                        setShowPriceDetailModal(false);
                        setSelectedDay(null);
                    }}
                    dayPrice={{ ...selectedDay, request_id }}
                    onAccept={handleAccept}
                />
            )}
        </div>
    );
};

export default PriceForecastPage;
