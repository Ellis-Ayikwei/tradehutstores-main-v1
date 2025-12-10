import React from 'react';
import { IconUsers, IconUsersGroup, IconUserShield, IconBuilding } from '@tabler/icons-react';

type Group = { id: number; name: string; user_count?: number; permission_count?: number; users?: any[] };
type UserWithGroups = { 
    id: string; 
    email: string; 
    first_name: string; 
    last_name: string; 
    user_type: 'admin' | 'provider' | 'customer'; 
    groups: { id: number; name: string }[] 
};

interface UserManagementForm {
    selectedGroups: number[];
    availableGroups: Group[];
}

interface ManageUsersModalProps {
    isOpen: boolean;
    user: UserWithGroups | null;
    userManagementForm: UserManagementForm;
    loading: boolean;
    onClose: () => void;
    onSave: () => void;
    onFormChange: (form: UserManagementForm) => void;
}

const ManageUsersModal: React.FC<ManageUsersModalProps> = ({
    isOpen,
    user,
    userManagementForm,
    loading,
    onClose,
    onSave,
    onFormChange,
}) => {
    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <IconUsers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Manage User Groups</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {user.first_name} {user.last_name} ({user.email})
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* User Info */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                                user.user_type === 'admin'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                    : user.user_type === 'provider'
                                    ? 'bg-purple-100 dark:bg-purple-900/30'
                                    : 'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                                {user.user_type === 'admin' ? (
                                    <IconUserShield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                ) : user.user_type === 'provider' ? (
                                    <IconBuilding className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                ) : (
                                    <IconUsers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                )}
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                    {user.first_name} {user.last_name}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {user.email} • {user.user_type}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Groups Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Assign Groups ({userManagementForm.selectedGroups.length} selected)
                        </label>
                        <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                            {userManagementForm.availableGroups.length > 0 ? (
                                userManagementForm.availableGroups.map((group) => (
                                    <label key={group.id} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={userManagementForm.selectedGroups.includes(group.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    onFormChange({
                                                        ...userManagementForm,
                                                        selectedGroups: [...userManagementForm.selectedGroups, group.id],
                                                    });
                                                } else {
                                                    onFormChange({
                                                        ...userManagementForm,
                                                        selectedGroups: userManagementForm.selectedGroups.filter((id) => id !== group.id),
                                                    });
                                                }
                                            }}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <div className="ml-3 flex-1">
                                            <span className="font-medium text-gray-900 dark:text-white">{group.name}</span>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                {group.user_count || 0} users • {group.permissions?.length || 0} permissions
                                            </p>
                                        </div>
                                    </label>
                                ))
                            ) : (
                                <div className="text-center py-4">
                                    <IconUsersGroup className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">No groups available</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Current Groups Display */}
                    {user.groups.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Current Groups
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {user.groups.map((group: any) => (
                                    <span key={group.id} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full">
                                        {group.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
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
                        disabled={loading}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Update User Groups'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManageUsersModal;
