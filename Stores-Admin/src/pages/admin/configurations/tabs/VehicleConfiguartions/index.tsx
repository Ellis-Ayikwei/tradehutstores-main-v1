import React, { useState } from 'react';
import { Truck, Car, Package } from 'lucide-react';
import Tabs, { TabItem } from '../../../../../components/ui/Tabs';
import VehicleTypesTab from './tabs/VehicleTypesTab';
import VehicleSizesTab from './tabs/VehicleSizesTab';
import VehicleCategoriesTab from './tabs/VehicleCategoriesTab';

// Tab configuration
const tabs: TabItem[] = [
  { key: 'types', label: 'Vehicle Types', icon: Truck },
  { key: 'sizes', label: 'Vehicle Sizes', icon: Package },
  { key: 'categories', label: 'Vehicle Categories', icon: Car }
] as const;

const VehicleConfigurations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'types' | 'sizes' | 'categories'>('types');

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey as 'types' | 'sizes' | 'categories');
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'types':
        return <VehicleTypesTab />;
      case 'sizes':
        return <VehicleSizesTab />;
      case 'categories':
        return <VehicleCategoriesTab />;
      default:
        return <VehicleTypesTab />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Vehicle Configuration</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage vehicle types, sizes, and categories
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Tab Content */}
      {renderActiveTab()}
    </div>
  );
};

export default VehicleConfigurations;
