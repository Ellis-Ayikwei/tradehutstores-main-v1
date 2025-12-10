import React from 'react';
import { IconUsersGroup, IconEdit, IconTrash } from '@tabler/icons-react';

type Group = { id: number; name: string; user_count?: number; permission_count?: number; users?: any[] };

interface RolesTabProps {
    groups: Group[];
    loading: boolean;
    onEditGroup: (groupId: number) => void;
    onDeleteGroup: (groupId: number) => void;
}

const RolesTab: React.FC<RolesTabProps> = ({ groups, loading, onEditGroup, onDeleteGroup }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <div className="text-center py-8">
                <IconUsersGroup className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No roles found</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {groups.map((group) => (
                <div
                    key={group.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <IconUsersGroup className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {group.user_count || 0} users • {group.permission_count || 0} permissions
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onEditGroup(group.id)}
                            className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit Group"
                        >
                            <IconEdit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDeleteGroup(group.id)}
                            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Group"
                        >
                            <IconTrash className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default RolesTab;
