import React from 'react';
import { IconRefresh, IconPlus } from '@tabler/icons-react';

interface HeaderProps {
    onCreateGroup: () => void;
    onRefresh: () => void;
}

const Header: React.FC<HeaderProps> = ({ onCreateGroup, onRefresh }) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage user roles, groups, and access permissions</p>
            </div>
            <div className="flex gap-3">
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <IconRefresh className="w-4 h-4" />
                    Refresh
                </button>
                <button
                    onClick={onCreateGroup}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                    <IconPlus className="w-4 h-4" />
                    Create Role
                </button>
            </div>
        </div>
    );
};

export default Header;
