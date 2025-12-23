import React, { useState } from 'react';
import { IconShield } from '@tabler/icons-react';
import axiosInstance from '../../../../services/axiosInstance';
import { showNotification } from '@mantine/notifications';
import { UserProfile, PasswordData } from '../types';

interface SecurityTabProps {
    profile: UserProfile | null;
    passwordData: PasswordData;
    showPassword: boolean;
    formErrors: Record<string, string>;
    savingChanges: boolean;
    onPasswordChange: (updater: (prev: PasswordData) => PasswordData) => void;
    onTogglePassword: () => void;
    onSavePassword: () => void;
}

const SecurityTab: React.FC<SecurityTabProps> = ({
    profile,
    passwordData,
    showPassword,
    formErrors,
    savingChanges,
    onPasswordChange,
    onTogglePassword,
    onSavePassword,
}) => {
    const [passwordErrors, setPasswordErrors] = useState<{
        newPassword: string[];
        confirmPassword: string[];
    }>({
        newPassword: [],
        confirmPassword: []
    });

    // Password validation functions (same as UserView)
    const validatePassword = (password: string) => {
        const errors: string[] = [];
        
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        
        if (!/(?=.*[a-z])/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        
        if (!/(?=.*[A-Z])/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (!/(?=.*\d)/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        
        if (!/(?=.*[@$!%*?&])/.test(password)) {
            errors.push('Password must contain at least one special character (@$!%*?&)');
        }
        
        return errors;
    };

    const validateConfirmPassword = (confirm: string, original: string) => {
        const errors: string[] = [];
        
        if (confirm !== original) {
            errors.push('Passwords do not match');
        }
        
        return errors;
    };

    const handlePasswordChange = async () => {
        if (!profile) return;

        // Clear previous errors
        setPasswordErrors({ newPassword: [], confirmPassword: [] });

        // Validate new password
        const newPasswordErrors = validatePassword(passwordData.new);
        const confirmPasswordErrors = validateConfirmPassword(passwordData.confirm, passwordData.new);

        if (newPasswordErrors.length > 0 || confirmPasswordErrors.length > 0) {
            setPasswordErrors({
                newPassword: newPasswordErrors,
                confirmPassword: confirmPasswordErrors
            });
            return;
        }

        try {
            await axiosInstance.post(`/users/${profile.id}/admin_change_password/`, {
                new_password: passwordData.new
            });
            
            // Clear form
            onPasswordChange(() => ({ current: '', new: '', confirm: '' }));
            setPasswordErrors({ newPassword: [], confirmPassword: [] });
            
            showNotification({
                title: 'Success',
                message: 'Password changed successfully',
                color: 'green'
            });
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to change password. Please try again.';
            showNotification({
                title: 'Error',
                message: errorMessage,
                color: 'red'
            });
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                <IconShield className="w-5 h-5 inline mr-2" />
                Security Settings
            </h3>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.new}
                        onChange={(e) => onPasswordChange((prev) => ({ ...prev, new: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                            passwordErrors.newPassword.length > 0 ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Enter new password"
                    />
                    {passwordErrors.newPassword.length > 0 && (
                        <div className="mt-2">
                            {passwordErrors.newPassword.map((error, index) => (
                                <p key={index} className="text-red-500 text-sm">{error}</p>
                            ))}
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.confirm}
                        onChange={(e) => onPasswordChange((prev) => ({ ...prev, confirm: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                            passwordErrors.confirmPassword.length > 0 ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Confirm new password"
                    />
                    {passwordErrors.confirmPassword.length > 0 && (
                        <div className="mt-2">
                            {passwordErrors.confirmPassword.map((error, index) => (
                                <p key={index} className="text-red-500 text-sm">{error}</p>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <button onClick={onTogglePassword} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        {showPassword ? 'Hide' : 'Show'} Passwords
                    </button>
                    <button
                        onClick={handlePasswordChange}
                        disabled={savingChanges || !passwordData.new || !passwordData.confirm || passwordData.new !== passwordData.confirm}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                    >
                        Update Password
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SecurityTab;
