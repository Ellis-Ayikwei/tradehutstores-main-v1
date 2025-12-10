import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AddressAutocomplete from '../../../components/ui/AddressAutocomplete';
import {
    IconUser,
    IconMail,
    IconPhone,
    IconLock,
    IconBuilding,
    IconMapPin,
    IconFileText,
    IconUsers,
    IconShield,
    IconArrowLeft,
    IconCheck,
    IconAlertTriangle,
    IconEye,
    IconEyeOff,
    IconUpload,
    IconX,
} from '@tabler/icons-react';
import axiosInstance from '../../../services/axiosInstance';

interface CreateUserFormData {
    // Basic fields
    email: string;
    password: string;
    confirmPassword: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    user_type: 'customer' | 'provider' | 'admin';
    profile_picture?: File;
    
    // Provider specific fields
    business_name?: string;
    base_location_data?: {
        address: string;
        coordinates?: {
            lat: number;
            lng: number;
        };
    };
    vat_number?: string;
    company_registration_number?: string;
    number_of_vehicles?: number;
    
    // Address fields
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    
    // Admin specific
    is_staff?: boolean;
    is_superuser?: boolean;
}

interface FormErrors {
    [key: string]: string[];
}

const CreateUser: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState<CreateUserFormData>({
        email: '',
        password: '',
        confirmPassword: '',
        first_name: '',
        last_name: '',
        phone_number: '',
        user_type: 'customer',
        address_line1: '',
        city: '',
        postal_code: '',
        country: '',
        is_staff: false,
        is_superuser: false,
    });

    const userTypeOptions = [
        { value: 'customer', label: 'Customer', icon: IconUser, description: 'Regular customer account' },
        { value: 'provider', label: 'Service Provider', icon: IconBuilding, description: 'Business/service provider account' },
        { value: 'admin', label: 'Admin', icon: IconShield, description: 'Administrative user account' },
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({
                ...prev,
                [name]: checked
            }));
        } else if (type === 'number') {
            setFormData(prev => ({
                ...prev,
                [name]: value ? parseInt(value, 10) : undefined
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }

        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: []
            }));
        }
    };

    const handleBaseLocationChange = (address: string) => {
        setFormData(prev => ({
            ...prev,
            base_location_data: {
                ...prev.base_location_data,
                address: address
            }
        }));
        
        // Clear error for this field when user starts typing
        if (errors.base_location_data) {
            setErrors(prev => ({
                ...prev,
                base_location_data: []
            }));
        }
    };

    const handleBaseLocationSelect = (addressData: any) => {
        setFormData(prev => ({
            ...prev,
            base_location_data: {
                address: addressData.formatted_address,
                coordinates: addressData.coordinates
            }
        }));
        
        // Clear error for this field when user selects an address
        if (errors.base_location_data) {
            setErrors(prev => ({
                ...prev,
                base_location_data: []
            }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                profile_picture: file
            }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        // Basic validation
        if (!formData.email) newErrors.email = ['Email is required'];
        if (!formData.password) newErrors.password = ['Password is required'];
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = ['Passwords do not match'];
        }
        if (!formData.first_name) newErrors.first_name = ['First name is required'];
        if (!formData.last_name) newErrors.last_name = ['Last name is required'];
        if (!formData.phone_number) newErrors.phone_number = ['Phone number is required'];

        // Provider specific validation
        if (formData.user_type === 'provider') {
            if (!formData.business_name) newErrors.business_name = ['Business name is required for providers'];
            if (!formData.base_location_data?.address) newErrors.base_location_data = ['Base location is required for providers'];
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email)) {
            newErrors.email = ['Please enter a valid email address'];
        }

        // Password strength validation
        if (formData.password && formData.password.length < 8) {
            newErrors.password = ['Password must be at least 8 characters long'];
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const submitData = new FormData();
            
            // Add basic user data
            submitData.append('email', formData.email);
            submitData.append('password', formData.password);
            submitData.append('first_name', formData.first_name);
            submitData.append('last_name', formData.last_name);
            submitData.append('phone_number', formData.phone_number);
            submitData.append('user_type', formData.user_type);

            // Add admin flags for admin users
            if (formData.user_type === 'admin') {
                submitData.append('is_staff', 'true');
                submitData.append('is_superuser', formData.is_superuser ? 'true' : 'false');
            }

            // Add provider specific fields
            if (formData.user_type === 'provider') {
                if (formData.business_name) submitData.append('business_name', formData.business_name);
                if (formData.base_location_data) {
                    submitData.append('base_location_data', JSON.stringify(formData.base_location_data));
                    if (formData.base_location_data.coordinates) {
                        submitData.append('base_location_lat', formData.base_location_data.coordinates.lat.toString());
                        submitData.append('base_location_lng', formData.base_location_data.coordinates.lng.toString());
                    }
                }
                if (formData.vat_number) submitData.append('vat_number', formData.vat_number);
                if (formData.company_registration_number) submitData.append('company_registration_number', formData.company_registration_number);
                if (formData.number_of_vehicles) submitData.append('number_of_vehicles', formData.number_of_vehicles.toString());
            }

            // Add address data if provided
            if (formData.address_line1) {
                submitData.append('address_line1', formData.address_line1);
                if (formData.address_line2) submitData.append('address_line2', formData.address_line2);
                if (formData.city) submitData.append('city', formData.city);
                if (formData.state) submitData.append('state', formData.state);
                if (formData.postal_code) submitData.append('postal_code', formData.postal_code);
                if (formData.country) submitData.append('country', formData.country);
            }

            // Add profile picture if selected
            if (formData.profile_picture) {
                submitData.append('profile_picture', formData.profile_picture);
            }

            const response = await axiosInstance.post('/users/', submitData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setSuccess(true);
            
            // Redirect to user management after success
            setTimeout(() => {
                navigate('/admin/users');
            }, 2000);

        } catch (error: any) {
            console.log(error)
            if (error.response?.data) {
                setErrors(error.response.data);
            } else {
                setErrors({ general: ['An error occurred while creating the user. Please try again.'] });
            }
        } finally {
            setLoading(false);
        }
    };

    const getUserTypeIcon = (type: string) => {
        switch (type) {
            case 'provider': return IconBuilding;
            case 'admin': return IconShield;
            default: return IconUser;
        }
    };

    const getUserTypeColor = (type: string) => {
        switch (type) {
            case 'provider': return 'purple';
            case 'admin': return 'emerald';
            default: return 'blue';
        }
    };

    if (success) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IconCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">User Created Successfully!</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        The {formData.user_type} account for {formData.first_name} {formData.last_name} has been created.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Redirecting to user management...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    to="/admin/users"
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <IconArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New User</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Add a new user account to the system</p>
                </div>
            </div>

            {/* Error Messages */}
            {errors.general && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <IconAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <div>
                            <h4 className="font-semibold text-red-800 dark:text-red-400">Error</h4>
                            <ul className="text-sm text-red-700 dark:text-red-300 mt-1">
                                {errors.general.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* User Type Selection */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Type</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {userTypeOptions.map((option) => {
                            const Icon = option.icon;
                            const color = getUserTypeColor(option.value);
                            const isSelected = formData.user_type === option.value;
                            
                            return (
                                <label
                                    key={option.value}
                                    className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                        isSelected
                                            ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20`
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="user_type"
                                        value={option.value}
                                        checked={isSelected}
                                        onChange={handleInputChange}
                                        className="sr-only"
                                    />
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-2 rounded-lg ${isSelected ? `bg-${color}-100 dark:bg-${color}-900/30` : 'bg-gray-100 dark:bg-gray-700'}`}>
                                            <Icon className={`w-5 h-5 ${isSelected ? `text-${color}-600 dark:text-${color}-400` : 'text-gray-600 dark:text-gray-400'}`} />
                                        </div>
                                        <span className={`font-semibold ${isSelected ? `text-${color}-900 dark:text-${color}-400` : 'text-gray-900 dark:text-white'}`}>
                                            {option.label}
                                        </span>
                                    </div>
                                    <p className={`text-sm ${isSelected ? `text-${color}-700 dark:text-${color}-300` : 'text-gray-600 dark:text-gray-400'}`}>
                                        {option.description}
                                    </p>
                                    {isSelected && (
                                        <div className={`absolute top-3 right-3 w-5 h-5 bg-${color}-500 rounded-full flex items-center justify-center`}>
                                            <IconCheck className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Basic Information */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Basic Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                First Name *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                                    <IconUser className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                    className={`block w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                                        errors.first_name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    placeholder="Enter first name"
                                />
                            </div>
                            {errors.first_name && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.first_name[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Last Name *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                                    <IconUser className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                    className={`block w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                                        errors.last_name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    placeholder="Enter last name"
                                />
                            </div>
                            {errors.last_name && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.last_name[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email Address*
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                                    <IconMail className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={`block w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                                        errors.email ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    placeholder="Enter email address"
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Phone Number *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                                    <IconPhone className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    name="phone_number"
                                    value={formData.phone_number}
                                    onChange={handleInputChange}
                                    className={`block w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                                        errors.phone_number ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    placeholder="Enter phone number"
                                />
                            </div>
                            {errors.phone_number && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone_number[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Password *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                                    <IconLock className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className={`block w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                                        errors.password ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    placeholder="Enter password"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <IconEyeOff className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <IconEye className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Confirm Password *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                                    <IconLock className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    className={`block w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                                        errors.confirmPassword ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    placeholder="Confirm password"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? (
                                        <IconEyeOff className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <IconEye className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword[0]}</p>
                            )}
                        </div>
                    </div>

                    {/* Profile Picture Upload */}
                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Profile Picture
                        </label>
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                                    {formData.profile_picture ? (
                                        <img
                                            src={URL.createObjectURL(formData.profile_picture)}
                                            alt="Profile preview"
                                            className="w-full h-full object-cover rounded-xl"
                                        />
                                    ) : (
                                        <IconUser className="w-8 h-8 text-gray-400" />
                                    )}
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <IconUpload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {formData.profile_picture ? 'Change Picture' : 'Upload Picture'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="sr-only"
                                    />
                                </label>
                                {formData.profile_picture && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, profile_picture: undefined }))}
                                        className="mt-2 flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                                    >
                                        <IconX className="w-4 h-4" />
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Provider Specific Fields */}
                {formData.user_type === 'provider' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Business Information</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Business Name *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                                        <IconBuilding className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="business_name"
                                        value={formData.business_name || ''}
                                        onChange={handleInputChange}
                                        className={`block w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                                            errors.business_name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                        placeholder="Enter business name"
                                    />
                                </div>
                                {errors.business_name && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.business_name[0]}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Number of Vehicles
                                </label>
                                <input
                                    type="number"
                                    name="number_of_vehicles"
                                    value={formData.number_of_vehicles || ''}
                                    onChange={handleInputChange}
                                    min="0"
                                    className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Enter number of vehicles"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Base Location *
                                </label>
                                <div className="space-y-3">
                                    <AddressAutocomplete
                                        value={formData.base_location_data?.address || ''}
                                        onAddressChange={handleBaseLocationChange}
                                        onAddressSelect={handleBaseLocationSelect}
                                        placeholder="Enter base location address..."
                                        showDetails={false}
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        This is the primary location where the provider operates from
                                    </p>
                                </div>
                                {errors.base_location_data && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.base_location_data[0]}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    VAT Number
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                                        <IconFileText className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="vat_number"
                                        value={formData.vat_number || ''}
                                        onChange={handleInputChange}
                                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="Enter VAT number"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Company Registration Number
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                                        <IconFileText className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="company_registration_number"
                                        value={formData.company_registration_number || ''}
                                        onChange={handleInputChange}
                                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="Enter company registration number"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin Specific Fields */}
                {formData.user_type === 'admin' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Admin Permissions</h3>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    name="is_superuser"
                                    checked={formData.is_superuser || false}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <div>
                                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                                        Super Admin
                                    </label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Grant full administrative privileges and access to all system features
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Address Information */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Address Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Address Line 1
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                                    <IconMapPin className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="address_line1"
                                    value={formData.address_line1 || ''}
                                    onChange={handleInputChange}
                                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Enter street address"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Address Line 2
                            </label>
                            <input
                                type="text"
                                name="address_line2"
                                value={formData.address_line2 || ''}
                                onChange={handleInputChange}
                                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Apartment, suite, etc. (optional)"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                City
                            </label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city || ''}
                                onChange={handleInputChange}
                                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Enter city"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                State/Province
                            </label>
                            <input
                                type="text"
                                name="state"
                                value={formData.state || ''}
                                onChange={handleInputChange}
                                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Enter state or province"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Postal Code
                            </label>
                            <input
                                type="text"
                                name="postal_code"
                                value={formData.postal_code || ''}
                                onChange={handleInputChange}
                                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Enter postal code"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Country
                            </label>
                            <input
                                type="text"
                                name="country"
                                value={formData.country || ''}
                                onChange={handleInputChange}
                                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Enter country"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                    <Link
                        to="/admin/users"
                        className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center font-medium"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Creating User...
                            </>
                        ) : (
                            <>
                                <IconCheck className="w-5 h-5" />
                                Create User
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateUser;