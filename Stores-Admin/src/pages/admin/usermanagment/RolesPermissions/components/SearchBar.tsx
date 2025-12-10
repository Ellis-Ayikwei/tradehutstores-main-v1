import React from 'react';
import { IconSearch } from '@tabler/icons-react';

interface SearchBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeTab: 'roles' | 'groups' | 'permissions';
}

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, onSearchChange, activeTab }) => {
    return (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
        </div>
    );
};

export default SearchBar;
