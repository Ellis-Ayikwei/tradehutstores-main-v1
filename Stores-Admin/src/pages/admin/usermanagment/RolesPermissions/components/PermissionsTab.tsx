import React from 'react';
import { IconShield, IconDatabase, IconKey } from '@tabler/icons-react';

type Permission = { id: number; name: string; codename: string };
type PermissionsByContentType = Record<string, Permission[]>;

interface PermissionsTabProps {
    permissionsList: PermissionsByContentType;
    loading: boolean;
}

const PermissionsTab: React.FC<PermissionsTabProps> = ({ permissionsList, loading }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (Object.keys(permissionsList).length === 0) {
        return (
            <div className="text-center py-8">
                <IconShield className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No permissions found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {Object.entries(permissionsList).map(([contentType, perms]: [string, Permission[]]) => (
                <div key={contentType} className="border border-gray-200 dark:border-gray-600 rounded-xl">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-t-xl">
                        <IconDatabase className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                            {contentType} ({perms.length})
                        </h3>
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Array.isArray(perms) && perms.map((permission: Permission) => (
                                <div key={permission.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <IconKey className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">{permission.name}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">{permission.codename}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PermissionsTab;
