import React from 'react';
import { IconUsersGroup, IconUserCheck, IconShield, IconUsers } from '@tabler/icons-react';

interface RoleStats {
    totalRoles: number;
    activeGroups: number;
    permissions: number;
    assignedUsers: number;
}

interface StatsCardsProps {
    stats: RoleStats;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                        <IconUsersGroup className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Roles</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalRoles}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                        <IconUserCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Active Groups</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeGroups}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                        <IconShield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Permissions</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.permissions}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                        <IconUsers className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Assigned Users</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.assignedUsers}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsCards;
