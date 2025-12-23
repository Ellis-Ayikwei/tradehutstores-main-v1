import React, { useState } from 'react';
import { 
  Settings, 
  Package, 
  DollarSign, 
  Shield, 
  Bell,
  CreditCard,
  MapPin,
  Truck,
  Users,
  Database,
  Globe,
  Cog,
  Car
} from 'lucide-react';

// Import existing components
import AdminConsole from '../CommonItems/AdminConsole';
import PricingAdmin from '../pricing';
import AdminSettings from '../AdminSettings';

// Import service configurations
import ServicesConfig from './tabs/services';
import VehicleConfigurations from './tabs/VehicleConfiguartions';
import NotificationsConfig from './tabs/notifications';

interface ConfigTab {
  key: string;
  label: string;
  icon: any;
  component: React.ComponentType;
  description: string;
}

const SystemConfigurations: React.FC = () => {
  const [activeTab, setActiveTab] = useState('common-items');

  const configTabs: ConfigTab[] = [
    {
      key: 'common-items',
      label: 'Common Items',
      icon: Package,
      component: AdminConsole,
      description: 'Manage categories, brands, models, and common items'
    },
    {
      key: 'services',
      label: 'Services',
      icon: Truck,
      component: ServicesConfig,
      description: 'Configure service types, categories, and specializations'
    },
    {
      key: 'vehicles',
      label: 'Vehicles',
      icon: Car,
      component: VehicleConfigurations,
      description: 'Manage vehicle types, sizes, and categories'
    },
    {
      key: 'pricing',
      label: 'Pricing',
      icon: DollarSign,
      component: PricingAdmin,
      description: 'Manage pricing factors, configurations, and rules'
    },
    // {
    //   key: 'notifications',
    //   label: 'Notifications',
    //   icon: Bell,
    //   component: NotificationsConfig,
    //   description: 'Manage email, SMS, and push notification settings'
    // },
    // {
    //   key: 'payments',
    //   label: 'Payments',
    //   icon: CreditCard,
    //   component: () => <div className="p-6"><h3 className="text-lg font-semibold mb-4">Payment Configuration</h3><p className="text-gray-600">Payment configuration coming soon...</p></div>,
    //   description: 'Configure payment gateways and transaction settings'
    // },
    // {
    //   key: 'locations',
    //   label: 'Locations',
    //   icon: MapPin,
    //   component: () => <div className="p-6"><h3 className="text-lg font-semibold mb-4">Location Configuration</h3><p className="text-gray-600">Location configuration coming soon...</p></div>,
    //   description: 'Manage service areas, zones, and location settings'
    // },
    {
      key: 'system',
      label: 'System',
      icon: Cog,
      component: () => <div className="p-6"><h3 className="text-lg font-semibold mb-4">System Configuration</h3><p className="text-gray-600">System configuration coming soon...</p></div>,
      description: 'General system settings and maintenance'
    }
  ];

  const ActiveComponent = configTabs.find(tab => tab.key === activeTab)?.component || AdminConsole;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      {/* <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    System Configurations
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage all system settings and configurations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> */}

      <div className="mx-auto px-4 sm:px-6 lg:px-2 py-8">
        {/* Tab Navigation */}
        <div className="mb-2">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {configTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {React.createElement(tab.icon, { className: "w-4 h-4" })}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Description */}
        {/* <div className="mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              {React.createElement(configTabs.find(tab => tab.key === activeTab)?.icon || Settings, {
                className: "w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"
              })}
              <div>
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {configTabs.find(tab => tab.key === activeTab)?.label}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {configTabs.find(tab => tab.key === activeTab)?.description}
                </p>
              </div>
            </div>
          </div>
        </div> */}

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemConfigurations;
