import React, { useState, useMemo } from 'react';
import { IconX, IconSearch, IconFilter } from '@tabler/icons-react';

type Permission = { id: number; name: string; codename: string };
type PermissionsByContentType = Record<string, Permission[]>;

interface GroupForm {
    name: string;
    selectedPermissions: number[];
    selectedUsers: string[];
}

interface CreateEditGroupModalProps {
    isOpen: boolean;
    isEdit: boolean;
    groupForm: GroupForm;
    permissionsList: PermissionsByContentType;
    loading: boolean;
    onClose: () => void;
    onSave: () => void;
    onFormChange: (form: GroupForm) => void;
}

const CreateEditGroupModal: React.FC<CreateEditGroupModalProps> = ({
    isOpen,
    isEdit,
    groupForm,
    permissionsList,
    loading,
    onClose,
    onSave,
    onFormChange,
}) => {
    const [permissionSearch, setPermissionSearch] = useState<string>('');
    const [selectedResource, setSelectedResource] = useState<string>('all');

    // Build resource (content type) options from permissionsList
    const resourceOptions: string[] = useMemo(() => {
        return ['all', ...Object.keys(permissionsList).sort()];
    }, [permissionsList]);

    // Filter permissions based on search and resource type
    const filteredPermissionsList = useMemo(() => {
        const filtered: PermissionsByContentType = {};
        
        Object.entries(permissionsList).forEach(([contentType, perms]) => {
            const matchesResource = selectedResource === 'all' || contentType === selectedResource;
            if (!matchesResource) return;
            
            const filteredPerms = perms.filter((p: Permission) => {
                const q = permissionSearch.trim().toLowerCase();
                return !q || 
                    (p.name || '').toLowerCase().includes(q) ||
                    (p.codename || '').toLowerCase().includes(q);
            });
            
            if (filteredPerms.length > 0) {
                filtered[contentType] = filteredPerms;
            }
        });
        
        return filtered;
    }, [permissionsList, permissionSearch, selectedResource]);

    // Select All functionality
    const handleSelectAllPermissions = () => {
        const allAvailablePermissions: number[] = [];
        Object.values(filteredPermissionsList).forEach((perms: Permission[]) => {
            allAvailablePermissions.push(...perms.map((p: Permission) => p.id));
        });
        
        if (groupForm.selectedPermissions.length === allAvailablePermissions.length) {
            // Deselect all
            onFormChange({ ...groupForm, selectedPermissions: [] });
        } else {
            // Select all available permissions
            onFormChange({ ...groupForm, selectedPermissions: allAvailablePermissions });
        }
    };

    // Check if all available permissions are selected
    const isAllPermissionsSelected = () => {
        const allAvailablePermissions: number[] = [];
        Object.values(filteredPermissionsList).forEach((perms: Permission[]) => {
            allAvailablePermissions.push(...perms.map((p: Permission) => p.id));
        });
        
        return allAvailablePermissions.length > 0 && 
               allAvailablePermissions.every(id => groupForm.selectedPermissions.includes(id));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {isEdit ? 'Edit Role' : 'Create New Role'}
                    </h3>
                </div>

                <div className="p-6 space-y-6">
                    {/* Group Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role Name</label>
                        <input
                            type="text"
                            value={groupForm.name}
                            onChange={(e) => onFormChange({ ...groupForm, name: e.target.value })}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Enter role name"
                        />
                    </div>

                    {/* Permissions Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Permissions ({groupForm.selectedPermissions.length} selected)
                        </label>
                        
                        {/* Search and Filter */}
                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <IconSearch className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={permissionSearch}
                                    onChange={(e) => setPermissionSearch(e.target.value)}
                                    placeholder="Search permissions..."
                                    className="block w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <IconFilter className="h-4 w-4 text-gray-400" />
                                <select
                                    value={selectedResource}
                                    onChange={(e) => setSelectedResource(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    {resourceOptions.map((opt) => (
                                        <option key={opt} value={opt}>{opt === 'all' ? 'All resources' : opt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Global Select All */}
                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={isAllPermissionsSelected()}
                                    onChange={handleSelectAllPermissions}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="font-medium text-blue-900 dark:text-blue-100">
                                    Select All Available Permissions
                                </span>
                            </div>
                            <span className="text-sm text-blue-700 dark:text-blue-300">
                                {groupForm.selectedPermissions.length} selected
                            </span>
                        </div>

                        <div className="space-y-4 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                            {Object.entries(filteredPermissionsList).map(([contentType, perms]) => (
                                <div key={contentType}>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 capitalize">{contentType}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {perms.map((permission) => (
                                            <label key={permission.id} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={groupForm.selectedPermissions.includes(permission.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            onFormChange({
                                                                ...groupForm,
                                                                selectedPermissions: [...groupForm.selectedPermissions, permission.id],
                                                            });
                                                        } else {
                                                            onFormChange({
                                                                ...groupForm,
                                                                selectedPermissions: groupForm.selectedPermissions.filter((id) => id !== permission.id),
                                                            });
                                                        }
                                                    }}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{permission.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        disabled={!groupForm.name.trim() || loading}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : isEdit ? 'Update Role' : 'Create Role'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateEditGroupModal;
