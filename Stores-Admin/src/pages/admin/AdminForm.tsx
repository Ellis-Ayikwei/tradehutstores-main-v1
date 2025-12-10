import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    IconUser,
    IconMail,
    IconPhone,
    IconMapPin,
    IconCalendar,
    IconDeviceFloppy,
    IconArrowLeft,
    IconEye,
    IconEyeOff,
    IconCheck,
    IconAlertTriangle,
    IconShield,
    IconUsersGroup,
    IconKey,
    IconClock,
    IconSettings,
    IconUserShield,
} from '@tabler/icons-react';
import { usePermissionService } from '../../hooks/usePermissionService';
import type { Group, Permission, PermissionsByContentType, AdminUserData } from '../../services/permissionService';

interface AdminFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    employeeId: string;
    department: string;
    position: string;
    dateOfBirth: string;
    address: {
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };
    emergencyContact: {
        name: string;
        phone: string;
        relationship: string;
    };
    permissions: {
        roles: number[];
        groups: number[];
        customPermissions: number[];
    };
    accountSettings: {
        isSuperuser: boolean;
        isStaff: boolean;
        isActive: boolean;
        mustChangePassword: boolean;
        twoFactorAuth: boolean;
    };
    workSchedule: {
        workingHours: string;
        timeZone: string;
        workDays: string[];
    };
    notes: string;
    status: 'active' | 'pending' | 'suspended' | 'inactive';
    verificationStatus: 'verified' | 'unverified' | 'pending' | 'rejected';
}

const AdminForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState('');

    // Permission service
    const { groups, permissions, userPermissions, userManagement, loading: permissionsLoading, error: permissionsError, clearError } = usePermissionService();

    // Permission data
    const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
    const [availablePermissions, setAvailablePermissions] = useState<PermissionsByContentType>({});
    const [flatPermissions, setFlatPermissions] = useState<Permission[]>([]);

    const [formData, setFormData] = useState<AdminFormData>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        employeeId: '',
        department: '',
        position: '',
        dateOfBirth: '',
        address: {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'United Kingdom',
        },
        emergencyContact: {
            name: '',
            phone: '',
            relationship: '',
        },
        permissions: {
            roles: [],
            groups: [],
            customPermissions: [],
        },
        accountSettings: {
            isSuperuser: false,
            isStaff: true,
            isActive: true,
            mustChangePassword: true,
            twoFactorAuth: false,
        },
        workSchedule: {
            workingHours: '9:00 AM - 5:00 PM',
            timeZone: 'Europe/London',
            workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        },
        notes: '',
        status: 'pending',
        verificationStatus: 'unverified',
    });

    // Load permission data
    useEffect(() => {
        loadPermissionData();
    }, []);

    const loadPermissionData = async () => {
        try {
            const [groupsData, permissionsData] = await Promise.all([groups.getAll(), permissions.getByContentType()]);

            setAvailableGroups(groupsData);
            setAvailablePermissions(permissionsData);

            // Flatten permissions for easier access
            const flatPerms = Object.values(permissionsData).flat();
            setFlatPermissions(flatPerms);
        } catch (error) {
            console.error('Error loading permission data:', error);
        }
    };

    useEffect(() => {
        if (isEditing && id) {
            loadUserData();
        }
    }, [isEditing, id]);

    const loadUserData = async () => {
        setLoading(true);
        try {
            // Load user data from the API
            const [userData, userPermissionData] = await Promise.all([userManagement.getUser(id!), userPermissions.getUserGroupsAndPermissions(id!)]);

            // Transform backend data to frontend format
            setFormData({
                firstName: (userData as any).first_name || '',
                lastName: (userData as any).last_name || '',
                email: userData.email || '',
                phone: (userData as any).phone_number || '',
                password: '',
                confirmPassword: '',
                employeeId: (userData as any).employee_id || '',
                department: (userData as any).department || '',
                position: (userData as any).position || '',
                dateOfBirth: (userData as any).date_of_birth || '',
                address: (userData as any).address || {
                    street: '',
                    city: '',
                    state: '',
                    postalCode: '',
                    country: 'United Kingdom',
                },
                emergencyContact: (userData as any).emergency_contact || {
                    name: '',
                    phone: '',
                    relationship: '',
                },
                permissions: {
                    roles: [],
                    groups: userPermissionData.groups.map((g: any) => g.id),
                    customPermissions: userPermissionData.individual_permissions.map((p: any) => p.id),
                },
                accountSettings: {
                    isSuperuser: userData.is_superuser || false,
                    isStaff: userData.is_staff || false,
                    isActive: (userData as any).is_active || true,
                    mustChangePassword: (userData as any).must_change_password || false,
                    twoFactorAuth: (userData as any).two_factor_auth || false,
                },
                workSchedule: (userData as any).work_schedule || {
                    workingHours: '9:00 AM - 5:00 PM',
                    timeZone: 'Europe/London',
                    workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                },
                notes: (userData as any).notes || '',
                status: (userData as any).account_status || 'pending',
                verificationStatus: (userData as any).verification_status || 'unverified',
            });

            setLoading(false);
        } catch (error) {
            console.error('Error loading user data:', error);
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checkbox = e.target as HTMLInputElement;
            if (name.startsWith('accountSettings.')) {
                const settingKey = name.split('.')[1];
                setFormData((prev) => ({
                    ...prev,
                    accountSettings: {
                        ...prev.accountSettings,
                        [settingKey]: checkbox.checked,
                    },
                }));
            } else if (name.startsWith('workSchedule.workDays')) {
                const day = value;
                setFormData((prev) => ({
                    ...prev,
                    workSchedule: {
                        ...prev.workSchedule,
                        workDays: checkbox.checked ? [...prev.workSchedule.workDays, day] : prev.workSchedule.workDays.filter((d) => d !== day),
                    },
                }));
            } else if (name.startsWith('permissions.')) {
                const [category, type] = name.split('.');
                const permissionId = parseInt(value);
                setFormData((prev) => ({
                    ...prev,
                    permissions: {
                        ...prev.permissions,
                        [type]: checkbox.checked
                            ? [...prev.permissions[type as keyof typeof prev.permissions], permissionId]
                            : prev.permissions[type as keyof typeof prev.permissions].filter((id: number) => id !== permissionId),
                    },
                }));
            }
        } else if (name.startsWith('address.')) {
            const addressKey = name.split('.')[1];
            setFormData((prev) => ({
                ...prev,
                address: {
                    ...prev.address,
                    [addressKey]: value,
                },
            }));
        } else if (name.startsWith('emergencyContact.')) {
            const contactKey = name.split('.')[1];
            setFormData((prev) => ({
                ...prev,
                emergencyContact: {
                    ...prev.emergencyContact,
                    [contactKey]: value,
                },
            }));
        } else if (name.startsWith('workSchedule.')) {
            const scheduleKey = name.split('.')[1];
            setFormData((prev) => ({
                ...prev,
                workSchedule: {
                    ...prev.workSchedule,
                    [scheduleKey]: value,
                },
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: '',
            }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        if (!formData.employeeId.trim()) newErrors.employeeId = 'Employee ID is required';
        if (!formData.department.trim()) newErrors.department = 'Department is required';

        if (!isEditing) {
            if (!formData.password) newErrors.password = 'Password is required';
            if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
            if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);

        try {
            if (isEditing && id) {
                // Update existing admin user
                await userManagement.updateUser(id, formData as AdminUserData);

                // Update permissions if they changed
                if (formData.permissions.groups.length > 0) {
                    await userPermissions.updateUserGroups(id, formData.permissions.groups);
                }

                if (formData.permissions.customPermissions.length > 0) {
                    await userPermissions.updateUserPermissions(id, formData.permissions.customPermissions);
                }

                setSuccessMessage('Admin user updated successfully!');
            } else {
                // Create new admin user
                await userManagement.createAdmin(formData as AdminUserData);
                setSuccessMessage('Admin user created successfully!');
            }

            setLoading(false);

            setTimeout(() => {
                navigate('/admin/users');
            }, 2000);
        } catch (error) {
            setLoading(false);
            console.error('Error saving admin user:', error);
            setErrors({ submit: 'Failed to save admin user. Please try again.' });
        }
    };

    if (loading && isEditing) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading admin user data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/admin/users')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <IconArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Admin User' : 'Add New Admin User'}</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{isEditing ? 'Update admin user information and permissions' : 'Create a new admin user with system access'}</p>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800">
                    <div className="flex items-center gap-3">
                        <IconCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="text-green-800 dark:text-green-300 font-medium">{successMessage}</span>
                    </div>
                </div>
            )}

            {/* Permission Error */}
            {permissionsError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <IconAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <span className="text-red-800 dark:text-red-300 font-medium">{permissionsError}</span>
                        <button onClick={clearError} className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
                            <IconEyeOff className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <IconUser className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Personal Information</h2>
                        <span className="text-red-500">*</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                    errors.firstName ? 'border-red-500' : 'border-gray-200'
                                }`}
                                placeholder="Enter first name"
                            />
                            {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                    errors.lastName ? 'border-red-500' : 'border-gray-200'
                                }`}
                                placeholder="Enter last name"
                            />
                            {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                    errors.email ? 'border-red-500' : 'border-gray-200'
                                }`}
                                placeholder="admin@morevans.com"
                            />
                            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                    errors.phone ? 'border-red-500' : 'border-gray-200'
                                }`}
                                placeholder="+44 7123 456789"
                            />
                            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Employee ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="employeeId"
                                value={formData.employeeId}
                                onChange={handleInputChange}
                                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                    errors.employeeId ? 'border-red-500' : 'border-gray-200'
                                }`}
                                placeholder="EMP-2024-001"
                            />
                            {errors.employeeId && <p className="text-red-500 text-sm mt-1">{errors.employeeId}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Department <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="department"
                                value={formData.department}
                                onChange={handleInputChange}
                                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                    errors.department ? 'border-red-500' : 'border-gray-200'
                                }`}
                            >
                                <option value="">Select department</option>
                                <option value="Administration">Administration</option>
                                <option value="Operations">Operations</option>
                                <option value="Customer Service">Customer Service</option>
                                <option value="Finance">Finance</option>
                                <option value="IT">IT</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Human Resources">Human Resources</option>
                            </select>
                            {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
                        </div>
                    </div>
                </div>

                {/* Password Section (only for new admins) */}
                {!isEditing && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <IconShield className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Account Security</h2>
                            <span className="text-red-500">*</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-10 ${
                                            errors.password ? 'border-red-500' : 'border-gray-200'
                                        }`}
                                        placeholder="Enter password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Confirm Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-10 ${
                                            errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                                        }`}
                                        placeholder="Confirm password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirmPassword ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Roles and Permissions */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <IconUserShield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Roles & Permissions</h2>
                    </div>

                    {permissionsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading permissions...</span>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Groups Assignment */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">User Groups ({formData.permissions.groups.length} selected)</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {availableGroups.map((group) => (
                                        <label
                                            key={group.id}
                                            className="flex items-start p-4 border border-gray-200 rounded-xl hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                name="permissions.groups"
                                                value={group.id}
                                                checked={formData.permissions.groups.includes(group.id)}
                                                onChange={handleInputChange}
                                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded mt-1"
                                            />
                                            <div className="ml-3">
                                                <div className="flex items-center gap-2">
                                                    <IconUsersGroup className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{group.name}</span>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                    {group.user_count || 0} users • {group.permission_count || 0} permissions
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Individual Permissions */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                    Individual Permissions ({formData.permissions.customPermissions.length} selected)
                                </label>
                                <div className="space-y-4 max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                                    {Object.entries(availablePermissions).map(([contentType, perms]) => (
                                        <div key={contentType}>
                                            <h4 className="font-medium text-gray-900 dark:text-white mb-3 capitalize flex items-center gap-2">
                                                <IconKey className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                {contentType} ({perms.length})
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {perms.map((permission) => (
                                                    <label key={permission.id} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            name="permissions.customPermissions"
                                                            value={permission.id}
                                                            checked={formData.permissions.customPermissions.includes(permission.id)}
                                                            onChange={handleInputChange}
                                                            className="h-3 w-3 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                                        />
                                                        <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">{permission.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Account Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <IconSettings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Account Settings</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="pending">Pending</option>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Verification Status</label>
                            <select
                                name="verificationStatus"
                                value={formData.verificationStatus}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="unverified">Unverified</option>
                                <option value="pending">Pending</option>
                                <option value="verified">Verified</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Access Permissions</label>
                        <div className="space-y-3">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="accountSettings.isSuperuser"
                                    checked={formData.accountSettings.isSuperuser}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                />
                                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Superuser (Full system access)</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="accountSettings.isStaff"
                                    checked={formData.accountSettings.isStaff}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                />
                                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Staff status (Admin interface access)</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="accountSettings.isActive"
                                    checked={formData.accountSettings.isActive}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                />
                                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Active account</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="accountSettings.mustChangePassword"
                                    checked={formData.accountSettings.mustChangePassword}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                />
                                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Force password change on next login</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="accountSettings.twoFactorAuth"
                                    checked={formData.accountSettings.twoFactorAuth}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                />
                                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Two-factor authentication required</span>
                            </label>
                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Add any additional notes about the admin user..."
                        />
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-4 justify-end">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/users')}
                        className="px-6 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                {isEditing ? 'Updating...' : 'Creating...'}
                            </>
                        ) : (
                            <>
                                <IconDeviceFloppy className="w-4 h-4" />
                                {isEditing ? 'Update Admin' : 'Create Admin'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminForm;
