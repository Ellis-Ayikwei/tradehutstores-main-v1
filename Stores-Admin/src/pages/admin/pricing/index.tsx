import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getPricingConfigurations, deletePricingConfiguration, setDefaultPricingConfiguration } from '../../../services/pricingService';
import PricingConfigurationForm from './PricingConfigurationForm';
import { 
    ConfigurationsTab, 
    LoadingSpinner, 
    ErrorAlert 
} from './components';
import confirmDialog from '../../../helper/confirmDialog';

interface PricingConfiguration {
    id: number;
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
    holiday_multiplier: number;
    peak_hour_multiplier: number;
    
    // Weather Multipliers
    rain_multiplier: number;
    snow_multiplier: number;
    extreme_weather_multiplier: number;
    
    // Vehicle Pricing
    vehicle_base_rate: number;
    vehicle_capacity_multiplier: number;
    
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

const PricingAdmin = () => {
    const [configurations, setConfigurations] = useState<PricingConfiguration[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showConfigForm, setShowConfigForm] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<PricingConfiguration | null>(null);

    useEffect(() => {
        fetchPricingData();
    }, []);

    const fetchPricingData = async () => {
        try {
            setLoading(true);
            const configsResponse = await getPricingConfigurations();

            // Ensure configurations is an array
            const configsData = configsResponse.data;
            const configsArray = Array.isArray(configsData) ? configsData : [];
            setConfigurations(configsArray);
            console.log('configsArray', configsResponse);
        } catch (err: any) {
            console.error('Error in fetchPricingData:', err);
            setError('Failed to load pricing data: ' + (err.response?.data?.message || err.message));
            setConfigurations([]);
        } finally {
            setLoading(false);
        }
    };

    const handleConfigEdit = (config: PricingConfiguration) => {
        setSelectedConfig(config);
        setShowConfigForm(true);
    };

    const handleConfigDelete = async (id: number) => {
        const isConfimed = await confirmDialog({
            title:"Delete Pricing Config",
            note: "This action cannot be undone", 
            recommended: "You should rather deactivate it",
            finalQuestion: "Are You Sure You Want To Delete This Configuration? ",
            type: 'warning',
        })
        if(isConfimed){

            try {
                await deletePricingConfiguration(id);
                setConfigurations(configurations.filter((config) => config.id !== id));
            } catch (err: any) {
                setError('Failed to delete configuration: ' + (err.response?.data?.message || err.message));
            }
        }

    };


    const handleSetDefault = async (id: number) => {
        try {
            await setDefaultPricingConfiguration(id);
            await fetchPricingData(); // Refresh the data
        } catch (err: any) {
            setError('Failed to set default configuration: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleAddConfiguration = () => {
        setSelectedConfig(null);
        setShowConfigForm(true);
    };


    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <ErrorAlert error={error} />

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pricing Configuration</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Manage pricing configurations for your logistics services
                </p>
            </div>

            <ConfigurationsTab
                configurations={configurations}
                onAddConfiguration={handleAddConfiguration}
                onEditConfiguration={handleConfigEdit}
                onDeleteConfiguration={handleConfigDelete}
                onSetDefault={handleSetDefault}
            />

            {showConfigForm && (
                <PricingConfigurationForm
                    initialData={selectedConfig || undefined}
                    onClose={() => {
                        setShowConfigForm(false);
                        setSelectedConfig(null);
                    }}
                    onSuccess={fetchPricingData}
                />
            )}
        </div>
    );
};

export default PricingAdmin;
