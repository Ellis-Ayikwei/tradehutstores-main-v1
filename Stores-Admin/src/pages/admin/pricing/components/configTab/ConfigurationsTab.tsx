import React from 'react';
import { 
    Settings, 
    CheckCircle, 
    Star, 
    TrendingUp, 
    Plus, 
    Edit, 
    Trash, 
    Check 
} from 'lucide-react';

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

interface ConfigurationsTabProps {
    configurations: PricingConfiguration[];
    onAddConfiguration: () => void;
    onEditConfiguration: (config: PricingConfiguration) => void;
    onDeleteConfiguration: (id: number) => void;
    onSetDefault: (id: number) => void;
}

const ConfigurationsTab: React.FC<ConfigurationsTabProps> = ({
    configurations,
    onAddConfiguration,
    onEditConfiguration,
    onDeleteConfiguration,
    onSetDefault
}) => {
    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="mb-4 md:mb-0">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Pricing Configurations
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Manage your pricing strategies and set default configurations
                        </p>
                    </div>
                    <button
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                        onClick={onAddConfiguration}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Configuration
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Settings className="text-blue-600 dark:text-blue-400 h-5 w-5" />
                        </div>
                        <div className="ml-3">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Configs</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{configurations.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <CheckCircle className="text-green-600 dark:text-green-400 h-5 w-5" />
                        </div>
                        <div className="ml-3">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Active</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {configurations.filter(c => c.is_active).length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <Star className="text-yellow-600 dark:text-yellow-400 h-5 w-5" />
                        </div>
                        <div className="ml-3">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Default</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {configurations.filter(c => c.is_default).length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <TrendingUp className="text-purple-600 dark:text-purple-400 h-5 w-5" />
                        </div>
                        <div className="ml-3">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Avg Base Price</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                £{configurations.length > 0 ? Math.round(configurations.reduce((sum, c) => sum + c.base_price, 0) / configurations.length) : 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Configurations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {configurations.map((config) => (
                    <div key={config.id} className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden">
                        {/* Header */}
                        <div className="relative p-4 pb-3">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {config.name}
                                    </h3>
                                    {config.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                            {config.description}
                                        </p>
                                    )}
                                    <div className="flex items-center space-x-2 mt-1">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            config.is_active 
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                            {config.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        {config.is_default && (
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {config.is_default && (
                                        <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                            <Star className="text-yellow-600 dark:text-yellow-400 h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Pricing Details */}
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/40">
                                        <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                                            <span>Base Price</span>
                                            <span className="text-gray-700 dark:text-gray-300">£{Number(config.base_price).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <span>Min Price</span>
                                            <span className="text-gray-700 dark:text-gray-300">£{Number(config.min_price).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <span>Distance Rate</span>
                                            <span className="text-gray-700 dark:text-gray-300">£{Number(config.distance_rate_per_km).toFixed(2)}/km</span>
                                        </div>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/40">
                                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between">
                                            <span>Item Pricing</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300`}>
                                                {config.dimension_preference ? 'Dimensions' : 'Weight'} Priority
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <span>Rate (m³)</span>
                                            <span className="text-gray-700 dark:text-gray-300">£{Number(config.dimension_rate_per_cubic_meter).toFixed(2)}/m³</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <span>Rate (kg)</span>
                                            <span className="text-gray-700 dark:text-gray-300">£{Number(config.weight_rate_per_kg).toFixed(2)}/kg</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/40">
                                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Surcharges</div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                            <span>Fuel</span>
                                            <span className="text-gray-700 dark:text-gray-300">{Number(config.fuel_surcharge_percentage).toFixed(2)}%</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <span>Platform Fee</span>
                                            <span className="text-gray-700 dark:text-gray-300">{Number(config.platform_fee_percentage).toFixed(2)}%</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <span>Carbon Offset</span>
                                            <span className="text-gray-700 dark:text-gray-300">£{Number(config.carbon_offset_rate).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/40">
                                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Time Multipliers</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                { label: 'Weekend', value: config.weekend_multiplier },
                                                { label: 'Peak Day', value: (config as any).peak_day_multiplier },
                                                { label: 'Holiday', value: config.holiday_multiplier },
                                                { label: 'Same Day', value: (config as any).same_day_multiplier },
                                                { label: 'Next Day', value: config.next_day_multiplier },
                                            ].map((chip) => (
                                                <div key={chip.label} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300`}>
                                                    {chip.label}: {Number(chip.value || 1).toFixed(2)}x
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex justify-end space-x-2">
                                {!config.is_default && (
                                    <button
                                        className="inline-flex items-center px-3 py-1.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200 rounded-lg hover:bg-green-200 dark:hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
                                        onClick={() => onSetDefault(config.id)}
                                    >
                                        <Check className="mr-1 h-3 w-3" />
                                        Set Default
                                    </button>
                                )}
                                <button
                                    className="inline-flex items-center px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
                                    onClick={() => onEditConfiguration(config)}
                                >
                                    <Edit className="mr-1 h-3 w-3" />
                                    Edit
                                </button>
                                <button
                                    className="inline-flex items-center px-3 py-1.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                    onClick={() => onDeleteConfiguration(config.id)}
                                    disabled={config.is_default}
                                >
                                    <Trash className="mr-1 h-3 w-3" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {configurations.length === 0 && (
                <div className="text-center py-12">
                    <div className="mx-auto w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                        <Settings className="text-gray-400 h-6 w-6" />
                    </div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">No configurations yet</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Get started by creating your first pricing configuration.
                    </p>
                    <button
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                        onClick={onAddConfiguration}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Configuration
                    </button>
                </div>
            )}
        </div>
    );
};

export default ConfigurationsTab; 