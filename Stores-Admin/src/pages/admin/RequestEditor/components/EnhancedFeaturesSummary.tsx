import React from 'react';
import { motion } from 'framer-motion';
import { Package, MapPin, Calculator, Settings, CheckCircle } from 'lucide-react';

interface EnhancedFeaturesSummaryProps {
  totalItems: number;
  totalWeight: number;
  selectedCategories: number;
  hasLocations: boolean;
  hasPriceForecast: boolean;
}

const EnhancedFeaturesSummary: React.FC<EnhancedFeaturesSummaryProps> = ({
  totalItems,
  totalWeight,
  selectedCategories,
  hasLocations,
  hasPriceForecast
}) => {
  const features = [
    {
      icon: Package,
      label: 'Items Selected',
      value: totalItems,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Calculator,
      label: 'Total Weight',
      value: `${totalWeight.toFixed(1)}kg`,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: MapPin,
      label: 'Locations',
      value: hasLocations ? 'Configured' : 'Not Set',
      color: hasLocations ? 'text-green-600' : 'text-gray-500',
      bgColor: hasLocations ? 'bg-green-50' : 'bg-gray-50'
    },
    // {
    //   icon: Settings,
    //   label: 'Price Forecast',
    //   value: hasPriceForecast ? 'Available' : 'Pending',
    //   color: hasPriceForecast ? 'text-green-600' : 'text-yellow-600',
    //   bgColor: hasPriceForecast ? 'bg-green-50' : 'bg-yellow-50'
    // }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200"
    >
      <div className="flex items-center mb-4">
        <CheckCircle className="w-6 h-6 text-blue-600 mr-3" />
        <h3 className="text-lg font-semibold text-gray-900">Request Editor</h3>
      </div>
      

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`${feature.bgColor} rounded-lg p-4 text-center`}
            >
              <Icon className={`w-6 h-6 ${feature.color} mx-auto mb-2`} />
              <div className={`text-sm font-medium ${feature.color} mb-1`}>
                {feature.value}
              </div>
              <div className="text-xs text-gray-600">
                {feature.label}
              </div>
            </motion.div>
          );
        })}
      </div>

     
    </motion.div>
  );
};

export default EnhancedFeaturesSummary;
