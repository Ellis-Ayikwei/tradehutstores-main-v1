import React, { useState, useEffect, useMemo } from 'react';
import { Tab } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import {
    IconUser,
    IconSettings,
    IconShield,
    IconHistory,
} from '@tabler/icons-react';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import useSWR from 'swr';
import axiosInstance from '../../../services/axiosInstance';
import fetcher from '../../../services/fetcher';
import { showNotification } from '@mantine/notifications';
import { AuthUser, UserProfile } from './types';
import { classNames } from './utils/classNames';
import { ProfileTab, PreferencesTab, SecurityTab, ActivitiesTab } from './components';

const UserSettings: React.FC = () => {
    const navigate = useNavigate();
    const authUser = useAuthUser() as AuthUser | null;
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [savingChanges, setSavingChanges] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Fetch user profile data from backend
    const { data: userResponse, error: fetchError, isLoading: isUserLoading, mutate } = useSWR(
        authUser ? `/users/${authUser.user.id}/` : null, 
        fetcher, 
        {
            revalidateOnFocus: false,
            keepPreviousData: true,
        }
    );

    // Memoize profile so reference is stable across renders
    const profile: UserProfile | null = useMemo(() => {
        if (!authUser || !userResponse) return null;
        
        return {
            id: userResponse.id || authUser.user.id,
            first_name: userResponse.first_name || '',
            last_name: userResponse.last_name || '',
            email: userResponse.email || authUser.user.email,
            phone: userResponse.phone_number || '',
            avatar: userResponse.profile_picture || '',
            bio: userResponse.bio || '',
            address: {
                street: userResponse.user_addresses?.address_line1 || '',
                city: userResponse.user_addresses?.city || '',
                state: userResponse.user_addresses?.state || '',
                country: userResponse.user_addresses?.country || '',
                postal_code: userResponse.user_addresses?.postal_code || '',
            },
            company: {
                name: userResponse.provider_profile?.business_name || '',
                vat_number: userResponse.provider_profile?.vat_number || '',
                website: userResponse.provider_profile?.website || '',
                business_hours: userResponse.provider_profile?.business_hours || '',
            },
            preferences: {
                language: 'en',
                timezone: 'GMT',
                currency: 'GBP',
                theme: 'light',
                notifications: {
                    email: userResponse.notification_preferences?.email || true,
                    sms: userResponse.notification_preferences?.sms || false,
                    push: userResponse.notification_preferences?.push || true,
                    marketing: userResponse.notification_preferences?.marketing || false,
                },
            },
            security: {
                two_factor_enabled: userResponse.two_factor_enabled || false,
                last_login: userResponse.last_active || new Date().toISOString(),
                active_sessions: 1,
            },
            created_at: userResponse.date_joined || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_type: userResponse.user_type || authUser.user.user_type,
        };
    }, [authUser?.user, userResponse]);

    // Initialize form data when profile loads (only when user id changes)
    useEffect(() => {
        if (profile) {
            setFormData(profile);
        }
    }, [profile?.id]);

    const handleInputChange = (field: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
        if (formErrors[field]) {
            setFormErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleNestedInputChange = (parent: string, field: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [parent]: {
                ...(prev as any)[parent],
                [field]: value,
            },
        }));
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!formData.first_name?.trim()) {
            errors.first_name = 'First name is required';
        }

        if (!formData.last_name?.trim()) {
            errors.last_name = 'Last name is required';
        }

        if (!formData.email?.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        // if (formData.phone && !/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/\s/g, ''))) {
        //     errors.phone = 'Please enter a valid phone number';
        // }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveProfile = async () => {
        if (!validateForm() || !authUser) return;

        try {
            setSavingChanges(true);
            
            // Create updated user object following the same pattern as UserView
            const updatedUser = {
                first_name: formData.first_name || '',
                last_name: formData.last_name || '',
                email: formData.email,
                phone_number: formData.phone || '',
                notification_preferences: {
                    ...formData.preferences?.notifications
                },
                // Include other fields that might be needed
                user_type: formData.user_type,
                is_staff: true, // Admin users are staff
            };

            const response = await axiosInstance.patch(`/users/${authUser.user.id}/admin_update/`, updatedUser, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.status === 200) {
                showNotification({
                    title: 'Success',
                    message: 'Profile updated successfully',
                    color: 'green',
                });
                setIsEditing(false);
                setFormErrors({});
                // Refresh the user data
                await mutate();
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to update profile. Please try again.';
            showNotification({
                title: 'Error',
                message: errorMessage,
                color: 'red',
            });
            console.error('Error saving profile:', error);
        } finally {
            setSavingChanges(false);
        }
    };

    const handleImageUpload = async (file: File) => {
        try {
            setUploadingImage(true);
            const formData = new FormData();
            formData.append('avatar', file);
            console.log('Uploading avatar:', file.name);
            await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
            console.error('Error uploading image:', error);
        } finally {
            setUploadingImage(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: IconUser },
        { id: 'preferences', label: 'Preferences', icon: IconSettings },
        { id: 'security', label: 'Security', icon: IconShield },
        { id: 'activities', label: 'Activities', icon: IconHistory },
    ];

    if (!authUser) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Please Login</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">You need to be logged in to access settings.</p>
                    <button onClick={() => navigate('/login')} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    if (isUserLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Loading Profile</h2>
                    <p className="text-gray-600 dark:text-gray-400">Fetching your account information...</p>
                </div>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Loading Profile</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">Failed to load your profile data. Please try again.</p>
                    <button onClick={() => mutate()} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">⚙️ Account Settings</h1>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your account settings and preferences</p>
                        </div>
                        <div className="mt-4 md:mt-0 flex items-center space-x-3">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Welcome back, <span className="font-medium text-gray-900 dark:text-white">{authUser.user.name || authUser.user.email}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
                    <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
                        <Tab.List className="flex flex-wrap gap-2 border-b dark:border-gray-700 pb-2">
                            {tabs.map((t) => {
                                const Icon = t.icon;
                                return (
                                    <Tab key={t.id} className={({ selected }) =>
                                        classNames(
                                            'px-4 py-2 rounded-md text-sm font-medium outline-none flex items-center gap-2 transition-colors',
                                            selected
                                                ? 'bg-[#dc711a] text-white'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        )
                                    }>
                                        <Icon className="w-4 h-4" />
                                        {t.label}
                                    </Tab>
                                );
                            })}
                        </Tab.List>

                        <Tab.Panels className="mt-6">
                            <Tab.Panel>
                            <ProfileTab
                                profile={profile}
                                formData={formData}
                                isEditing={isEditing}
                                savingChanges={savingChanges}
                                uploadingImage={uploadingImage}
                                formErrors={formErrors}
                                onInputChange={handleInputChange}
                                onNestedInputChange={handleNestedInputChange}
                                onEdit={() => setIsEditing(true)}
                                onCancel={() => {
                                    setIsEditing(false);
                                    setFormData(profile || {});
                                    setFormErrors({});
                                }}
                                onSave={handleSaveProfile}
                                onImageUpload={handleImageUpload}
                            />
                            </Tab.Panel>
                            <Tab.Panel>
                            <PreferencesTab
                                profile={profile}
                                formData={formData}
                                onInputChange={handleInputChange}
                                onNestedInputChange={handleNestedInputChange}
                                onSave={handleSaveProfile}
                                savingChanges={savingChanges}
                                onRefresh={mutate}
                            />
                            </Tab.Panel>
                            <Tab.Panel>
                            <SecurityTab
                                profile={profile}
                                passwordData={passwordData}
                                showPassword={showPassword}
                                formErrors={formErrors}
                                savingChanges={savingChanges}
                                onPasswordChange={setPasswordData}
                                onTogglePassword={() => setShowPassword(!showPassword)}
                                onSavePassword={() => {}}
                            />
                            </Tab.Panel>
                            <Tab.Panel>
                            <ActivitiesTab
                                profile={profile}
                                onRefresh={mutate}
                            />
                            </Tab.Panel>
                        </Tab.Panels>
                    </Tab.Group>
                </div>
            </div>
        </div>
    );
};


export default UserSettings;
