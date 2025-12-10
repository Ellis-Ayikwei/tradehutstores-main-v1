import React from 'react';
import { motion } from 'framer-motion';
import { Home, Building, School, Car, Package } from 'lucide-react';

interface CategoryTabsProps {
  categories: any[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  loading?: boolean;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  loading = false
}) => {
  const getCategoryIcon = (categoryName: string) => {
    const iconMap: { [key: string]: any } = {
      'Living Room': Home,
      'Bedroom': Home,
      'Kitchen': Home,
      'Bathroom': Home,
      'Office': Building,
      'Student': School,
      'Furniture': Home,
      'Appliances': Home,
      'Electronics': Home,
      'Vehicles': Car,
      'General': Package,
    };
    
    const lowerName = categoryName.toLowerCase();
    if (lowerName.includes('living')) return Home;
    if (lowerName.includes('bedroom')) return Home;
    if (lowerName.includes('kitchen')) return Home;
    if (lowerName.includes('bathroom')) return Home;
    if (lowerName.includes('office')) return Building;
    if (lowerName.includes('student')) return School;
    if (lowerName.includes('furniture')) return Home;
    if (lowerName.includes('appliance')) return Home;
    if (lowerName.includes('electronic')) return Home;
    if (lowerName.includes('vehicle')) return Car;
    
    return Package;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading categories...</span>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No categories available.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      {categories.map((category: any, index: number) => {
        const Icon = getCategoryIcon(category.name);
        const isSelected = selectedCategory === category.id;
        
        return (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onCategorySelect(category.id)}
            className={`flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              isSelected
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300'
            }`}
          >
            <Icon className={`w-5 h-5 mr-2 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
            <span className="text-base">{category.name}</span>
            {category.items_count && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {category.items_count}
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
