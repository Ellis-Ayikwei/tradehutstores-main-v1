import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
    X, 
    Settings, 
    DollarSign, 
    MapPin, 
    Users, 
    Clock, 
    Cloud, 
    Truck, 
    Shield, 
    Zap,
    ChevronRight,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { createPricingConfiguration, updatePricingConfiguration } from '../../../services/pricingService';

interface PricingConfiguration {
    id?: number;
    name: string;
    is_active: boolean;
    is_default: boolean;
    description?: string;
    
    // Base Pricing
    base_price: number;
    min_price: number;
    max_price_multiplier: number;
    
    // Distance Pricing
    distance_rate_per_km: number;
    distance_rate_per_mile: number;
    long_distance_threshold_km: number;
    long_distance_multiplier: number;
    
    // Weight Pricing
    weight_rate_per_kg: number;
    heavy_item_threshold_kg: number;
    heavy_item_surcharge: number;
    
    // Dimension Pricing (Priority over Weight)
    dimension_rate_per_cubic_meter: number;
    dimension_rate_per_cubic_foot: number;
    large_item_threshold_cubic_meter: number;
    large_item_surcharge: number;
    dimension_preference: boolean;
    
    // Property Pricing
    property_base_rate: number;
    rate_per_room: number;
    rate_per_floor: number;
    elevator_discount_multiplier: number;
    narrow_access_fee: number;
    stairs_per_flight_fee: number;
    
    // Staff Pricing
    staff_base_rate: number;
    staff_hourly_rate: number;
    staff_2_multiplier: number;
    staff_3_multiplier: number;
    staff_4_multiplier: number;
    
    // Time Multipliers
    weekend_multiplier: number;
    peak_day_multiplier: number;
    holiday_multiplier: number;
    peak_hour_multiplier: number;
    next_day_multiplier: number;
    same_day_multiplier: number;
    
    // Weather Multipliers
    rain_multiplier: number;
    snow_multiplier: number;
    extreme_weather_multiplier: number;
    
    // Vehicle Pricing
    vehicle_base_rate: number;
    vehicle_capacity_multiplier: number;
    
    // Vehicle Transport Pricing (Car/Motorcycle Shipping)
    vehicle_transport_base_rate: number;
    vehicle_transport_rate_per_km: number;
    vehicle_non_running_multiplier: number;
    vehicle_luxury_multiplier: number;
    vehicle_standard_multiplier: number;
    vehicle_small_multiplier: number;
    vehicle_suv_multiplier: number;
    vehicle_sedan_multiplier: number;
    vehicle_van_multiplier: number;
    vehicle_pickup_multiplier: number;
    vehicle_electric_multiplier: number;
    vehicle_hybrid_multiplier: number;
    
    // Hourly Rate Pricing (Man & Van Jobs)
    hourly_rate_base: number;
    hourly_rate_vehicle_small: number;
    hourly_rate_vehicle_medium: number;
    hourly_rate_vehicle_large: number;
    hourly_rate_additional_driver: number;
    
    // Special Requirements
    fragile_items_multiplier: number;
    assembly_required_rate: number;
    special_equipment_rate: number;
    
    // Insurance
    insurance_base_rate: number;
    insurance_value_percentage: number;
    insurance_min_premium: number;
    
    // Surcharges
    fuel_surcharge_percentage: number;
    carbon_offset_rate: number;
    platform_fee_percentage: number;
    
    // Loading Time
    loading_rate_per_hour: number;
    loading_min_hours: number;
}

interface PricingConfigurationFormProps {
    initialData?: PricingConfiguration;
    onClose: () => void;
    onSuccess: () => void;
}

const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    base_price: Yup.number().required('Base price is required').min(0),
    min_price: Yup.number().required('Minimum price is required').min(0),
    max_price_multiplier: Yup.number().required('Maximum price multiplier is required').min(1),
    distance_rate_per_km: Yup.number().required('Distance rate per km is required').min(0),
    long_distance_threshold_km: Yup.number().required('Long distance threshold is required').min(0),
    long_distance_multiplier: Yup.number().required('Long distance multiplier is required').min(0.01, 'Long Distance Multiplier must be > 0'),
    weight_rate_per_kg: Yup.number().required('Weight rate per kg is required').min(0),
    staff_hourly_rate: Yup.number().required('Staff hourly rate is required').min(0),
    weekend_multiplier: Yup.number().required('Weekend multiplier is required').min(1),
    peak_day_multiplier: Yup.number().required('Peak day multiplier is required').min(1),
    platform_fee_percentage: Yup.number().required('Platform fee percentage is required').min(0).max(100),
});

const PricingConfigurationForm: React.FC<PricingConfigurationFormProps> = ({ 
    initialData, 
    onClose, 
    onSuccess 
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<string>('base');
    const [isOpen, setIsOpen] = useState(true);

    const initialValues: PricingConfiguration = {
        name: initialData?.name || '',
        is_active: initialData?.is_active ?? true,
        is_default: initialData?.is_default ?? false,
        description: initialData?.description || '',
        
        // Base Pricing
        base_price: initialData?.base_price || 20.00,
        min_price: initialData?.min_price || 25.00,
        max_price_multiplier: initialData?.max_price_multiplier || 3.0,
        
        // Distance Pricing
        distance_rate_per_km: initialData?.distance_rate_per_km || 0.15,
        distance_rate_per_mile: initialData?.distance_rate_per_mile || 0.24,
        long_distance_threshold_km: initialData?.long_distance_threshold_km || 50,
        long_distance_multiplier: initialData?.long_distance_multiplier || 1.2,
        
        // Weight Pricing
        weight_rate_per_kg: initialData?.weight_rate_per_kg || 0.02,
        heavy_item_threshold_kg: initialData?.heavy_item_threshold_kg || 50,
        heavy_item_surcharge: initialData?.heavy_item_surcharge || 5.00,
        
        // Dimension Pricing
        dimension_rate_per_cubic_meter: initialData?.dimension_rate_per_cubic_meter || 15.00,
        dimension_rate_per_cubic_foot: initialData?.dimension_rate_per_cubic_foot || 0.42,
        large_item_threshold_cubic_meter: initialData?.large_item_threshold_cubic_meter || 2.0,
        large_item_surcharge: initialData?.large_item_surcharge || 25.00,
        dimension_preference: initialData?.dimension_preference ?? true,
        
        // Property Pricing
        property_base_rate: initialData?.property_base_rate || 5.00,
        rate_per_room: initialData?.rate_per_room || 2.00,
        rate_per_floor: initialData?.rate_per_floor || 3.00,
        elevator_discount_multiplier: initialData?.elevator_discount_multiplier || 0.90,
        narrow_access_fee: initialData?.narrow_access_fee || 25.00,
        stairs_per_flight_fee: initialData?.stairs_per_flight_fee || 15.00,
        
        // Staff Pricing
        staff_base_rate: initialData?.staff_base_rate || 8.00,
        staff_hourly_rate: initialData?.staff_hourly_rate || 8.00,
        staff_2_multiplier: initialData?.staff_2_multiplier || 1.3,
        staff_3_multiplier: initialData?.staff_3_multiplier || 1.6,
        staff_4_multiplier: initialData?.staff_4_multiplier || 1.9,
        
        // Time Multipliers
        weekend_multiplier: initialData?.weekend_multiplier || 1.25,
        peak_day_multiplier: initialData?.peak_day_multiplier || 1.10,
        holiday_multiplier: initialData?.holiday_multiplier || 1.3,
        peak_hour_multiplier: initialData?.peak_hour_multiplier || 1.25,
        next_day_multiplier: initialData?.next_day_multiplier || 1.15,
        same_day_multiplier: initialData?.same_day_multiplier || 1.50,
        
        // Weather Multipliers
        rain_multiplier: initialData?.rain_multiplier || 1.1,
        snow_multiplier: initialData?.snow_multiplier || 1.3,
        extreme_weather_multiplier: initialData?.extreme_weather_multiplier || 1.5,
        
        // Vehicle Pricing
        vehicle_base_rate: initialData?.vehicle_base_rate || 0.00,
        vehicle_capacity_multiplier: initialData?.vehicle_capacity_multiplier || 1.0,
        
        // Vehicle Transport Pricing
        vehicle_transport_base_rate: initialData?.vehicle_transport_base_rate || 34.00,
        vehicle_transport_rate_per_km: initialData?.vehicle_transport_rate_per_km || 1.20,
        vehicle_non_running_multiplier: initialData?.vehicle_non_running_multiplier || 1.4,
        vehicle_luxury_multiplier: initialData?.vehicle_luxury_multiplier || 1.5,
        vehicle_standard_multiplier: initialData?.vehicle_standard_multiplier || 1.0,
        vehicle_small_multiplier: initialData?.vehicle_small_multiplier || 0.9,
        vehicle_suv_multiplier: initialData?.vehicle_suv_multiplier || 1.1,
        vehicle_sedan_multiplier: initialData?.vehicle_sedan_multiplier || 1.0,
        vehicle_van_multiplier: initialData?.vehicle_van_multiplier || 1.2,
        vehicle_pickup_multiplier: initialData?.vehicle_pickup_multiplier || 1.15,
        vehicle_electric_multiplier: initialData?.vehicle_electric_multiplier || 1.1,
        vehicle_hybrid_multiplier: initialData?.vehicle_hybrid_multiplier || 1.05,
        
        // Hourly Rate Pricing
        hourly_rate_base: initialData?.hourly_rate_base || 25.00,
        hourly_rate_vehicle_small: initialData?.hourly_rate_vehicle_small || 25.00,
        hourly_rate_vehicle_medium: initialData?.hourly_rate_vehicle_medium || 35.00,
        hourly_rate_vehicle_large: initialData?.hourly_rate_vehicle_large || 45.00,
        hourly_rate_additional_driver: initialData?.hourly_rate_additional_driver || 15.00,
        
        // Special Requirements
        fragile_items_multiplier: initialData?.fragile_items_multiplier || 1.2,
        assembly_required_rate: initialData?.assembly_required_rate || 25.00,
        special_equipment_rate: initialData?.special_equipment_rate || 35.00,
        
        // Insurance
        insurance_base_rate: initialData?.insurance_base_rate || 20.00,
        insurance_value_percentage: initialData?.insurance_value_percentage || 0.50,
        insurance_min_premium: initialData?.insurance_min_premium || 20.00,
        
        // Surcharges
        fuel_surcharge_percentage: initialData?.fuel_surcharge_percentage || 0.0,
        carbon_offset_rate: initialData?.carbon_offset_rate || 0.0,
        platform_fee_percentage: initialData?.platform_fee_percentage || 15.00,
        
        // Loading Time
        loading_rate_per_hour: initialData?.loading_rate_per_hour || 30.00,
        loading_min_hours: initialData?.loading_min_hours || 1.0,
    };

    const formik = useFormik({
        initialValues,
        validationSchema,
        onSubmit: async (values) => {
            try {
                setIsSubmitting(true);
                setError(null);

                if (initialData?.id) {
                    await updatePricingConfiguration(initialData.id, values);
                } else {
                    await createPricingConfiguration(values);
                }
                
                onSuccess();
                handleClose();
            } catch (err: any) {
                setError(err?.response?.data?.message || 'Failed to save pricing configuration');
                console.error(err);
            } finally {
                setIsSubmitting(false);
            }
        },
    });

    const handleClose = () => {
        setIsOpen(false);
        setTimeout(() => onClose(), 300);
    };

    const sections = [
        { 
            id: 'base', 
            name: 'Base Pricing', 
            icon: DollarSign, 
            color: 'text-blue-600',
            description: 'Core pricing settings'
        },
        { 
            id: 'distance', 
            name: 'Distance', 
            icon: MapPin, 
            color: 'text-blue-600',
            description: 'Distance-based pricing'
        },
        { 
            id: 'weight', 
            name: 'Weight', 
            icon: Settings, 
            color: 'text-blue-600',
            description: 'Weight-based pricing'
        },
        { 
            id: 'dimension', 
            name: 'Dimension', 
            icon: Settings, 
            color: 'text-green-600',
            description: 'Dimension-based pricing (priority)'
        },
        { 
            id: 'property', 
            name: 'Property', 
            icon: MapPin, 
            color: 'text-blue-600',
            description: 'Property complexity pricing'
        },
        { 
            id: 'staff', 
            name: 'Staff', 
            icon: Users, 
            color: 'text-blue-600',
            description: 'Staff requirements pricing'
        },
        { 
            id: 'time', 
            name: 'Time', 
            icon: Clock, 
            color: 'text-blue-600',
            description: 'Time-based multipliers'
        },
        { 
            id: 'weather', 
            name: 'Weather', 
            icon: Cloud, 
            color: 'text-blue-600',
            description: 'Weather condition multipliers'
        },
        { 
            id: 'vehicle', 
            name: 'Vehicle', 
            icon: Truck, 
            color: 'text-blue-600',
            description: 'Vehicle requirements pricing'
        },
        { 
            id: 'special', 
            name: 'Special', 
            icon: Settings, 
            color: 'text-blue-600',
            description: 'Special handling requirements'
        },
        { 
            id: 'insurance', 
            name: 'Insurance', 
            icon: Shield, 
            color: 'text-blue-600',
            description: 'Insurance and protection'
        },
        { 
            id: 'surcharges', 
            name: 'Surcharges', 
            icon: Zap, 
            color: 'text-blue-600',
            description: 'Additional fees and charges'
        },
        { 
            id: 'loading', 
            name: 'Loading', 
            icon: Clock, 
            color: 'text-blue-600',
            description: 'Loading time pricing'
        },
    ];

    const renderField = (name: string, label: string, type: string = 'number', step: string = '0.01', min?: number, max?: number) => (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
            </label>
            <input
                type={type}
                step={step}
                min={min}
                max={max}
                name={name}
                value={formik.values[name as keyof PricingConfiguration] as string | number}
                onChange={formik.handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
            />
            {formik.errors[name as keyof PricingConfiguration] && formik.touched[name as keyof PricingConfiguration] && (
                <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {formik.errors[name as keyof PricingConfiguration] as string}
                </p>
            )}
        </div>
    );

    const renderSection = (sectionId: string) => {
        switch (sectionId) {
            case 'base':
                return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Base Pricing Configuration</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300">Set the fundamental pricing parameters for all services.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderField('base_price', 'Base Price (£)', 'number', '0.01', 0)}
                            {renderField('min_price', 'Minimum Price (£)', 'number', '0.01', 0)}
                            {renderField('max_price_multiplier', 'Max Price Multiplier', 'number', '0.1', 1)}
                        </div>
                    </div>
                );

            case 'distance':
                return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Distance-Based Pricing</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300">Configure pricing based on distance traveled.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {renderField('distance_rate_per_km', 'Rate per KM (£)', 'number', '0.01', 0)}
                            {renderField('distance_rate_per_mile', 'Rate per Mile (£)', 'number', '0.01', 0)}
                            {renderField('long_distance_threshold_km', 'Long Distance Threshold (KM)', 'number', '1', 0)}
                            {renderField('long_distance_multiplier', 'Long Distance Multiplier', 'number', '0.1', 1)}
                        </div>
                    </div>
                );

            case 'weight':
                return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Weight-Based Pricing</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300">Configure pricing based on item weight (used when dimension preference is disabled).</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderField('weight_rate_per_kg', 'Rate per KG (£)', 'number', '0.01', 0)}
                            {renderField('heavy_item_threshold_kg', 'Heavy Item Threshold (KG)', 'number', '1', 0)}
                            {renderField('heavy_item_surcharge', 'Heavy Item Surcharge (£)', 'number', '0.01', 0)}
                        </div>
                    </div>
                );

            case 'dimension':
                return (
                    <div className="space-y-6">
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Dimension-Based Pricing (Priority)</h4>
                            <p className="text-sm text-green-600 dark:text-green-300">Configure pricing based on item dimensions. When enabled, dimensions take priority over weight.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderField('dimension_rate_per_cubic_meter', 'Rate per Cubic Meter (£)', 'number', '0.01', 0)}
                            {renderField('dimension_rate_per_cubic_foot', 'Rate per Cubic Foot (£)', 'number', '0.01', 0)}
                            {renderField('large_item_threshold_cubic_meter', 'Large Item Threshold (m³)', 'number', '0.01', 0)}
                            {renderField('large_item_surcharge', 'Large Item Surcharge (£)', 'number', '0.01', 0)}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Dimension Preference
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="dimension_preference"
                                        checked={formik.values.dimension_preference}
                                        onChange={formik.handleChange}
                                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                    />
                                    <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                        Use dimensions as primary pricing method
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    When enabled, dimension-based pricing takes priority over weight-based pricing
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case 'property':
                return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Property Complexity Pricing</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300">Configure pricing based on property characteristics and complexity.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderField('property_base_rate', 'Property Base Rate (£)', 'number', '0.01', 0)}
                            {renderField('rate_per_room', 'Rate per Room (£)', 'number', '0.01', 0)}
                            {renderField('rate_per_floor', 'Rate per Floor (£)', 'number', '0.01', 0)}
                            {renderField('elevator_discount_multiplier', 'Elevator Discount Multiplier', 'number', '0.01', 0.5, 1.0)}
                            {renderField('narrow_access_fee', 'Narrow Access Fee (£)', 'number', '0.01', 0)}
                            {renderField('stairs_per_flight_fee', 'Stairs per Flight Fee (£)', 'number', '0.01', 0)}
                        </div>
                    </div>
                );

            case 'staff':
                return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Staff Requirements Pricing</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300">Configure pricing based on number of staff required.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderField('staff_base_rate', 'Staff Base Rate (£)', 'number', '0.01', 0)}
                            {renderField('staff_hourly_rate', 'Staff Hourly Rate (£)', 'number', '0.01', 0)}
                            {renderField('staff_2_multiplier', '2 Staff Multiplier', 'number', '0.1', 1)}
                            {renderField('staff_3_multiplier', '3 Staff Multiplier', 'number', '0.1', 1)}
                            {renderField('staff_4_multiplier', '4 Staff Multiplier', 'number', '0.1', 1)}
                        </div>
                    </div>
                );

            case 'time':
                return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Time-Based Multipliers</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300">Configure pricing multipliers for different time periods.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderField('weekend_multiplier', 'Weekend Multiplier', 'number', '0.1', 1)}
                            {renderField('peak_day_multiplier', 'Peak Day Multiplier', 'number', '0.1', 1)}
                            {renderField('holiday_multiplier', 'Holiday Multiplier', 'number', '0.1', 1)}
                            {renderField('peak_hour_multiplier', 'Peak Hour Multiplier', 'number', '0.1', 1)}
                            {renderField('next_day_multiplier', 'Next Day Multiplier', 'number', '0.1', 1)}
                            {renderField('same_day_multiplier', 'Same Day Multiplier', 'number', '0.1', 1)}
                        </div>
                    </div>
                );

            case 'weather':
        return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Weather Condition Multipliers</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300">Configure pricing multipliers for different weather conditions.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderField('rain_multiplier', 'Rain Multiplier', 'number', '0.1', 1)}
                            {renderField('snow_multiplier', 'Snow Multiplier', 'number', '0.1', 1)}
                            {renderField('extreme_weather_multiplier', 'Extreme Weather Multiplier', 'number', '0.1', 1)}
                        </div>
                    </div>
                );

            case 'vehicle':
                return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Vehicle Requirements Pricing</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300">Configure pricing based on vehicle requirements.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {renderField('vehicle_base_rate', 'Vehicle Base Rate (£)', 'number', '0.01', 0)}
                            {renderField('vehicle_capacity_multiplier', 'Vehicle Capacity Multiplier', 'number', '0.1', 1)}
                        </div>
                        
                        <div className="border-t pt-6 mt-6">
                            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Vehicle Transport Pricing (Car/Motorcycle Shipping)</h5>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                                <p className="text-sm text-blue-600 dark:text-blue-300">Base pricing settings for vehicle transport</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                {renderField('vehicle_transport_base_rate', 'Base Rate (£)', 'number', '0.01', 0)}
                                {renderField('vehicle_transport_rate_per_km', 'Rate per km (£)', 'number', '0.01', 0)}
                                {renderField('vehicle_non_running_multiplier', 'Non-Running Multiplier', 'number', '0.1', 1)}
                            </div>
                            
                            <div className="border-t pt-4 mt-4">
                                <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Vehicle Type Multipliers by Body Type</h6>
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
                                    <p className="text-xs text-gray-600 dark:text-gray-400">Configure pricing multipliers for different vehicle types. These multipliers apply to the base vehicle transport cost.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {renderField('vehicle_luxury_multiplier', 'Luxury/Sports Car Multiplier', 'number', '0.1', 1)}
                                    {renderField('vehicle_suv_multiplier', 'SUV Multiplier', 'number', '0.1', 0.5)}
                                    {renderField('vehicle_sedan_multiplier', 'Sedan Multiplier', 'number', '0.1', 0.5)}
                                    {renderField('vehicle_van_multiplier', 'Van Multiplier', 'number', '0.1', 0.5)}
                                    {renderField('vehicle_pickup_multiplier', 'Pickup/Truck Multiplier', 'number', '0.1', 0.5)}
                                    {renderField('vehicle_electric_multiplier', 'Electric Vehicle Multiplier', 'number', '0.1', 0.5)}
                                    {renderField('vehicle_hybrid_multiplier', 'Hybrid Vehicle Multiplier', 'number', '0.1', 0.5)}
                                    {renderField('vehicle_small_multiplier', 'Small Vehicle Multiplier (Hatchback, Coupe, Convertible, Wagon)', 'number', '0.1', 0.5)}
                                    {renderField('vehicle_standard_multiplier', 'Standard Vehicle Multiplier (Default)', 'number', '0.1', 0.5)}
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t pt-6 mt-6">
                            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Hourly Rate Pricing (Man & Van Jobs)</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {renderField('hourly_rate_base', 'Base Hourly Rate (£)', 'number', '0.01', 0)}
                                {renderField('hourly_rate_vehicle_small', 'Small Van Rate (£/hr)', 'number', '0.01', 0)}
                                {renderField('hourly_rate_vehicle_medium', 'Medium Van Rate (£/hr)', 'number', '0.01', 0)}
                                {renderField('hourly_rate_vehicle_large', 'Large Van Rate (£/hr)', 'number', '0.01', 0)}
                                {renderField('hourly_rate_additional_driver', 'Additional Driver Rate (£/hr)', 'number', '0.01', 0)}
                            </div>
                        </div>
                    </div>
                );

            case 'special':
                return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Special Handling Requirements</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300">Configure pricing for special handling requirements.</p>
                                    </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderField('fragile_items_multiplier', 'Fragile Items Multiplier', 'number', '0.1', 1)}
                            {renderField('assembly_required_rate', 'Assembly Required Rate (£)', 'number', '0.01', 0)}
                            {renderField('special_equipment_rate', 'Special Equipment Rate (£)', 'number', '0.01', 0)}
                                    </div>
                    </div>
                );

            case 'insurance':
                return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Insurance and Protection</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300">Configure insurance and protection pricing.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderField('insurance_base_rate', 'Insurance Base Rate (£)', 'number', '0.01', 0)}
                            {renderField('insurance_value_percentage', 'Insurance Value Percentage', 'number', '0.01', 0, 100)}
                            {renderField('insurance_min_premium', 'Insurance Min Premium (£)', 'number', '0.01', 0)}
                                </div>
                            </div>
                        );

            case 'surcharges':
                return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Additional Fees and Charges</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300">Configure additional fees and surcharges.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderField('fuel_surcharge_percentage', 'Fuel Surcharge Percentage', 'number', '0.01', 0, 100)}
                            {renderField('carbon_offset_rate', 'Carbon Offset Rate (£)', 'number', '0.01', 0)}
                            {renderField('platform_fee_percentage', 'Platform Fee Percentage', 'number', '0.01', 0, 100)}
                </div>
            </div>
        );

            case 'loading':
        return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Loading Time Pricing</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300">Configure pricing based on loading and unloading time.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {renderField('loading_rate_per_hour', 'Loading Rate per Hour (£)', 'number', '0.01', 0)}
                            {renderField('loading_min_hours', 'Loading Min Hours', 'number', '0.1', 0)}
                        </div>
                </div>
        );

            default:
                return null;
    }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-7xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                                    <div>
                                        <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {initialData?.id ? 'Edit' : 'Create'} Pricing Configuration
                        </Dialog.Title>
                                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                            Configure all pricing factors for your logistics services
                                        </p>
                                    </div>
                        <button 
                                        onClick={handleClose} 
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                                        <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                                <div className="flex h-[70vh]">
                                    {/* Sidebar */}
                                    <div className="w-80 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                                        {/* Fixed Basic Info Section */}
                                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                            <div className="space-y-4">
                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Configuration Name
                                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formik.values.name}
                                        onChange={formik.handleChange}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                        placeholder="Enter configuration name"
                                                    />
                                                    {formik.errors.name && formik.touched.name && (
                                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                                            <AlertCircle className="w-4 h-4 mr-1" />
                                                            {formik.errors.name as string}
                                                        </p>
                                    )}
                                </div>

                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Description
                                                    </label>
                                                    <textarea
                                                        name="description"
                                                        value={formik.values.description}
                                        onChange={formik.handleChange}
                                                        rows={3}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                        placeholder="Enter description"
                                    />
                            </div>

                                                <div className="flex items-center space-x-6">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formik.values.is_active}
                                        onChange={formik.handleChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Active</label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="is_default"
                                        checked={formik.values.is_default}
                                        onChange={formik.handleChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                                        <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Default</label>
                                                    </div>
                                                </div>
                                </div>
                            </div>

                                        {/* Scrollable Navigation Section */}
                                        <div className="flex-1 p-6 overflow-y-auto">
                                            <div className="space-y-2">
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Configuration Sections</h3>
                                                {sections.map((section) => {
                                                    const Icon = section.icon;
                                                    return (
                                                        <button
                                                            key={section.id}
                                                            type="button"
                                                            onClick={() => setActiveSection(section.id)}
                                                            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                                                                activeSection === section.id
                                                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shadow-sm'
                                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                            }`}
                                                        >
                                                            <div className="flex items-center">
                                                                <Icon className={`w-5 h-5 mr-3 ${section.color}`} />
                                                                <div className="text-left">
                                                                    <div className="font-medium">{section.name}</div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{section.description}</div>
                                        </div>
                                    </div>
                                                            <ChevronRight className="w-4 h-4" />
                                                                    </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1 p-6 overflow-y-auto">
                                        {error && (
                                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                                <div className="flex items-center">
                                                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                                                    <span className="text-red-800 dark:text-red-200">{error}</span>
                                                </div>
                                            </div>
                                        )}

                                        <form onSubmit={formik.handleSubmit}>
                                            <div className="mb-6">
                                                <div className="flex items-center mb-4">
                                                    {(() => {
                                                        const section = sections.find(s => s.id === activeSection);
                                                        const Icon = section?.icon;
                                                        return (
                                                            <>
                                                                {Icon && <Icon className={`w-6 h-6 mr-3 ${section?.color}`} />}
                                                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                                                    {section?.name} Configuration
                                                                </h3>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                                {renderSection(activeSection)}
                            </div>
                        </form>
                                    </div>
                    </div>

                    {/* Footer */}
                                <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                        {formik.isValid ? 'All required fields are valid' : 'Please complete all required fields'}
                                    </div>
                                    <div className="flex items-center space-x-3">
                        <button
                            type="button"
                                            onClick={handleClose}
                                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formik.isValid}
                            onClick={() => formik.handleSubmit()}
                                            className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                                            {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Configuration' : 'Create Configuration'}
                        </button>
                                    </div>
                    </div>
                </Dialog.Panel>
                        </Transition.Child>
                    </div>
            </div>
        </Dialog>
        </Transition>
    );
};

export default PricingConfigurationForm;