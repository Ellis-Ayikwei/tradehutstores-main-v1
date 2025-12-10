import React from 'react';
import { Settings, Layers, Info } from 'lucide-react';

interface TabNavigationProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
    return (
        <div className="mb-8">
            {/* Modern Tab Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-2">
                <nav className="flex space-x-2">
                    <button
                        onClick={() => onTabChange('config')}
                        className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                            activeTab === 'config'
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        Configurations
                    </button>
                    <button
                        onClick={() => onTabChange('factors')}
                        className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                            activeTab === 'factors'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        <Layers className="mr-2 h-4 w-4" />
                        Factors
                    </button>
                </nav>
            </div>
            
            <div className="mt-4">
                {activeTab === 'config' ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                        <div className="flex items-start">
                            <Info className="text-blue-500 mt-1 mr-2 h-4 w-4" />
                            <div>
                                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1 text-sm">Pricing Configurations</h4>
                                <p className="text-blue-700 dark:text-blue-300 text-xs">
                                    Manage your pricing strategies. Each configuration defines base prices, multipliers, and which pricing factors to apply. 
                                    You can set a default configuration that will be used for all new quotes.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3">
                        <div className="flex items-start">
                            <Info className="text-purple-500 mt-1 mr-2 h-4 w-4" />
                            <div>
                                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-1 text-sm">Pricing Factors</h4>
                                <p className="text-purple-700 dark:text-purple-300 text-xs">
                                    Manage individual pricing factors that affect the final price. These include distance, weight, time, weather, 
                                    vehicle type, and other factors that can be combined in different configurations.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TabNavigation; 