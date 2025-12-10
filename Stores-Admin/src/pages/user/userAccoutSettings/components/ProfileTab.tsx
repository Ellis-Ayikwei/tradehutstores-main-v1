import React from 'react';
import { IconUser, IconCamera, IconEdit } from '@tabler/icons-react';
import IconSave from '../../../../components/Icon/IconSave';
import { UserProfile } from '../types';

interface ProfileTabProps {
    profile: UserProfile | null;
    formData: Partial<UserProfile>;
    isEditing: boolean;
    savingChanges: boolean;
    uploadingImage: boolean;
    formErrors: Record<string, string>;
    onInputChange: (field: string, value: any) => void;
    onNestedInputChange: (parent: string, field: string, value: any) => void;
    onEdit: () => void;
    onCancel: () => void;
    onSave: () => void;
    onImageUpload: (file: File) => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({
    profile,
    formData,
    isEditing,
    savingChanges,
    uploadingImage,
    formErrors,
    onInputChange,
    onNestedInputChange,
    onEdit,
    onCancel,
    onSave,
    onImageUpload,
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-32"></div>
                <div className="px-6 pb-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 mb-4">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gray-100 dark:bg-gray-700">
                                {profile?.avatar ? (
                                    <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <IconUser className="w-16 h-16 text-gray-400" />
                                    </div>
                                )}
                            </div>

                            {isEditing && (
                                <label className="absolute bottom-2 right-2 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                                    {uploadingImage ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <IconCamera className="w-4 h-4" />}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) onImageUpload(file);
                                        }}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>

                        <div className="sm:ml-6 mt-4 sm:mt-0 text-center sm:text-left flex-1">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {profile?.first_name && profile?.last_name 
                                    ? `${profile.first_name} ${profile.last_name}` 
                                    : 'Complete Your Profile'
                                }
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">{profile?.email}</p>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full">
                                    {profile?.user_type === 'business' ? 'Business Account' : 'Personal Account'}
                                </span>
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-full">Verified</span>
                            </div>
                        </div>

                        {!isEditing && (
                            <button onClick={onEdit} className="mt-4 sm:mt-0 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <IconEdit className="w-4 h-4 mr-2" />
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Basic Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={formData.first_name || ''}
                                onChange={(e) => onInputChange('first_name', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                                    formErrors.first_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                }`}
                                placeholder="Enter your first name"
                            />
                        ) : (
                            <p className="text-gray-900 dark:text-white py-2">{profile?.first_name || 'Not provided'}</p>
                        )}
                        {formErrors.first_name && <p className="text-red-500 text-sm mt-1">{formErrors.first_name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={formData.last_name || ''}
                                onChange={(e) => onInputChange('last_name', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                                    formErrors.last_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                }`}
                                placeholder="Enter your last name"
                            />
                        ) : (
                            <p className="text-gray-900 dark:text-white py-2">{profile?.last_name || 'Not provided'}</p>
                        )}
                        {formErrors.last_name && <p className="text-red-500 text-sm mt-1">{formErrors.last_name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                        {isEditing ? (
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => onInputChange('email', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                                    formErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                }`}
                                placeholder="Enter your email"
                            />
                        ) : (
                            <p className="text-gray-900 dark:text-white py-2">{profile?.email || 'Not provided'}</p>
                        )}
                        {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                        {isEditing ? (
                            <input
                                type="tel"
                                value={formData.phone || ''}
                                onChange={(e) => onInputChange('phone', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                                    formErrors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                }`}
                                placeholder="Enter your phone number"
                            />
                        ) : (
                            <p className="text-gray-900 dark:text-white py-2">{profile?.phone || 'Not provided'}</p>
                        )}
                        {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</label>
                        {isEditing ? (
                            <textarea
                                value={formData.bio || ''}
                                onChange={(e) => onInputChange('bio', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Tell us about yourself..."
                            />
                        ) : (
                            <p className="text-gray-900 dark:text-white py-2">{profile?.bio || 'No bio provided'}</p>
                        )}
                    </div>
                </div>

                {isEditing && (
                    <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSave}
                            disabled={savingChanges}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center"
                        >
                            {savingChanges ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <IconSave className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileTab;
