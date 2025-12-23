import React, { useState } from 'react';
import { IconSettings } from '@tabler/icons-react';
import axiosInstance from '../../../../services/axiosInstance';
import { showNotification } from '@mantine/notifications';
import { UserProfile } from '../types';

interface PreferencesTabProps {
    profile: UserProfile | null;
    formData: Partial<UserProfile>;
    onInputChange: (field: string, value: any) => void;
    onNestedInputChange: (parent: string, field: string, value: any) => void;
    onSave: () => void;
    savingChanges: boolean;
    onRefresh?: () => void;
}

const PreferencesTab: React.FC<PreferencesTabProps> = ({
    profile,
    formData,
    onInputChange,
    onNestedInputChange,
    onSave,
    savingChanges,
    onRefresh,
}) => {
    const [savingPreferences, setSavingPreferences] = useState(false);

    const handleSavePreferences = async () => {
        if (!profile) return;

        try {
            setSavingPreferences(true);
            
            const updatedUser = {
                notification_preferences: {
                    ...formData.preferences?.notifications
                },
                // Add other preference fields as needed
            };

            const response = await axiosInstance.patch(`/users/${profile.id}/admin_update/`, updatedUser, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.status === 200) {
                showNotification({
                    title: 'Success',
                    message: 'Preferences updated successfully',
                    color: 'green',
                });
                // Refresh the user data
                if (onRefresh) {
                    await onRefresh();
                }
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to update preferences. Please try again.';
            showNotification({
                title: 'Error',
                message: errorMessage,
                color: 'red',
            });
        } finally {
            setSavingPreferences(false);
        }
    };
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                <IconSettings className="w-5 h-5 inline mr-2" />
                Preferences
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Language</label>
                    <select
                        value={formData.preferences?.language || 'en'}
                        onChange={(e) => onNestedInputChange('preferences', 'language', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    >
                        <option value="en">English</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                    <select
                        value={formData.preferences?.theme || 'light'}
                        onChange={(e) => onNestedInputChange('preferences', 'theme', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                    </select>
                </div>
            </div>

            <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Notification Settings</h4>
                <div className="space-y-4">
                    {(
                        [
                            { key: 'email', label: 'Email Notifications' },
                            { key: 'sms', label: 'SMS Notifications' },
                            { key: 'push', label: 'Push Notifications' },
                            { key: 'marketing', label: 'Marketing Emails' },
                        ] as const
                    ).map((n) => (
                        <label key={n.key} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{n.label}</span>
                            <input
                                type="checkbox"
                                checked={Boolean(formData.preferences?.notifications?.[n.key])}
                                onChange={(e) =>
                                    onNestedInputChange('preferences', 'notifications', {
                                        ...(formData.preferences?.notifications || {}),
                                        [n.key]: e.target.checked,
                                    })
                                }
                            />
                        </label>
                    ))}
                </div>
            </div>

        <div className="flex justify-end mt-6">
            <button
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                className="px-4 py-2 bg-[#dc711a] text-white rounded-md hover:bg-[#dc711a]/90 disabled:opacity-70"
            >
                {savingPreferences ? 'Saving...' : 'Save Preferences'}
            </button>
        </div>
        </div>
    );
};

export default PreferencesTab;
