import React from 'react';
import { IconUsersGroup, IconUserShield, IconShield } from '@tabler/icons-react';

interface TabNavigationProps {
    activeTab: 'groups' | 'permissions';
    onTabChange: (tab: 'groups' | 'permissions') => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
    const tabs = [
        { key: 'groups', label: 'Group Management', icon: IconUserShield },
        { key: 'permissions', label: 'All Permissions', icon: IconShield },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => onTabChange(tab.key as any)}
                        className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                            activeTab === tab.key
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TabNavigation;
