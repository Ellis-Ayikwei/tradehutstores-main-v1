import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    IconBuilding,
    IconMail,
    IconPhone,
    IconMapPin,
    IconTruck,
    IconDeviceFloppy,
    IconArrowLeft,
    IconEye,
    IconEyeOff,
    IconCheck,
    IconFileText,
    IconUsers,
    IconShield,
    IconSettings,
} from '@tabler/icons-react';

interface ProviderFormData {
    businessName: string;
    contactPersonName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    businessAddress: {
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };
    businessDetails: {
        registrationNumber: string;
        vatNumber: string;
        insuranceNumber: string;
        licenseNumber: string;
        businessType: string;
        yearEstablished: string;
        employeeCount: string;
    };
    services: {
        houseMoving: boolean;
        officeMoving: boolean;
        pianoMoving: boolean;
        packingService: boolean;
        storageService: boolean;
        emergencyService: boolean;
    };
    operatingAreas: string[];
    fleetInfo: {
        numberOfVehicles: number;
        vehicleTypes: string[];
        totalCapacity: string;
    };
    pricing: {
        hourlyRate: string;
        minimumCharge: string;
        cancellationPolicy: string;
    };
    bankDetails: {
        accountHolderName: string;
        bankName: string;
        accountNumber: string;
        sortCode: string;
    };
    documents: {
        businessLicense: boolean;
        insurance: boolean;
        drivingLicense: boolean;
        criminalCheck: boolean;
    };
    notes: string;
    status: 'active' | 'pending' | 'suspended' | 'inactive';
    verificationStatus: 'verified' | 'unverified' | 'pending' | 'rejected';
    accountSettings: {
        status: 'active' | 'pending' | 'suspended' | 'inactive';
        verificationStatus: 'verified' | 'unverified' | 'pending' | 'rejected';
        featured: boolean;
        autoAcceptJobs: boolean;
        instantQuotes: boolean;
    };
}

const ProviderForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState('');

    const [formData, setFormData] = useState<ProviderFormData>({
        businessName: '',
        contactPersonName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        businessAddress: {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'United Kingdom',
        },
        businessDetails: {
            registrationNumber: '',
            vatNumber: '',
            insuranceNumber: '',
            licenseNumber: '',
            businessType: 'Limited Company',
            yearEstablished: '',
            employeeCount: '1-5',
        },
        services: {
            houseMoving: true,
            officeMoving: false,
            pianoMoving: false,
            packingService: false,
            storageService: false,
            emergencyService: false,
        },
        operatingAreas: [],
        fleetInfo: {
            numberOfVehicles: 1,
            vehicleTypes: ['Van'],
            totalCapacity: '',
        },
        pricing: {
            hourlyRate: '',
            minimumCharge: '',
            cancellationPolicy: '24 hours',
        },
        bankDetails: {
            accountHolderName: '',
            bankName: '',
            accountNumber: '',
            sortCode: '',
        },
        documents: {
            businessLicense: false,
            insurance: false,
            drivingLicense: false,
            criminalCheck: false,
        },
        notes: '',
        status: 'pending',
        verificationStatus: 'unverified',
        accountSettings: {
            status: 'active',
            verificationStatus: 'verified',
            featured: true,
            autoAcceptJobs: false,
            instantQuotes: true,
        },
    });

    useEffect(() => {
        if (isEditing && id) {
            loadProviderData();
        }
    }, [isEditing, id]);

    const loadProviderData = async () => {
        setLoading(true);
        try {
            // Simulate API call to load existing provider data
            setTimeout(() => {
                setFormData({
                    businessName: 'Fast Moving Solutions Ltd',
                    contactPersonName: 'Michael Thompson',
                    email: 'contact@fastmoving.co.uk',
                    phone: '+44 20 1234 5678',
                    password: '',
                    confirmPassword: '',
                    businessAddress: {
                        street: '456 Business Park',
                        city: 'Manchester',
                        state: 'England',
                        postalCode: 'M1 2AB',
                        country: 'United Kingdom',
                    },
                    businessDetails: {
                        registrationNumber: '12345678',
                        vatNumber: 'GB123456789',
                        insuranceNumber: 'INS-987654321',
                        licenseNumber: 'LIC-456789123',
                        businessType: 'Limited Company',
                        yearEstablished: '2018',
                        employeeCount: '11-50',
                    },
                    services: {
                        houseMoving: true,
                        officeMoving: true,
                        pianoMoving: false,
                        packingService: true,
                        storageService: false,
                        emergencyService: true,
                    },
                    operatingAreas: ['Manchester', 'Liverpool', 'Leeds'],
                    fleetInfo: {
                        numberOfVehicles: 8,
                        vehicleTypes: ['Van', 'Truck', 'Lorry'],
                        totalCapacity: '50 tonnes',
                    },
                    pricing: {
                        hourlyRate: '£45',
                        minimumCharge: '£120',
                        cancellationPolicy: '24 hours',
                    },
                    bankDetails: {
                        accountHolderName: 'Fast Moving Solutions Ltd',
                        bankName: 'Barclays Bank',
                        accountNumber: '12345678',
                        sortCode: '20-00-00',
                    },
                    documents: {
                        businessLicense: true,
                        insurance: true,
                        drivingLicense: true,
                        criminalCheck: false,
                    },
                    notes: 'Established provider with excellent track record. Specializes in residential and commercial moves.',
                    status: 'active',
                    verificationStatus: 'verified',
                    accountSettings: {
                        status: 'active',
                        verificationStatus: 'verified',
                        featured: true,
                        autoAcceptJobs: false,
                        instantQuotes: true,
                    },
                });
                setLoading(false);
            }, 1000);
        } catch (error) {
            console.error('Error loading provider data:', error);
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checkbox = e.target as HTMLInputElement;
            if (name.startsWith('services.')) {
                const serviceKey = name.split('.')[1];
                setFormData((prev) => ({
                    ...prev,
                    services: {
                        ...prev.services,
                        [serviceKey]: checkbox.checked,
                    },
                }));
            } else if (name.startsWith('documents.')) {
                const docKey = name.split('.')[1];
                setFormData((prev) => ({
                    ...prev,
                    documents: {
                        ...prev.documents,
                        [docKey]: checkbox.checked,
                    },
                }));
            }
        } else if (name.startsWith('businessAddress.')) {
            const addressKey = name.split('.')[1];
            setFormData((prev) => ({
                ...prev,
                businessAddress: {
                    ...prev.businessAddress,
                    [addressKey]: value,
                },
            }));
        } else if (name.startsWith('businessDetails.')) {
            const detailKey = name.split('.')[1];
            setFormData((prev) => ({
                ...prev,
                businessDetails: {
                    ...prev.businessDetails,
                    [detailKey]: value,
                },
            }));
        } else if (name.startsWith('fleetInfo.')) {
            const fleetKey = name.split('.')[1];
            if (fleetKey === 'numberOfVehicles') {
                setFormData((prev) => ({
                    ...prev,
                    fleetInfo: {
                        ...prev.fleetInfo,
                        [fleetKey]: parseInt(value) || 0,
                    },
                }));
            } else {
                setFormData((prev) => ({
                    ...prev,
                    fleetInfo: {
                        ...prev.fleetInfo,
                        [fleetKey]: value,
                    },
                }));
            }
        } else if (name.startsWith('pricing.') || name.startsWith('bankDetails.')) {
            const parts = name.split('.');
            const category = parts[0] as 'pricing' | 'bankDetails';
            const key = parts[1];
            setFormData((prev) => ({
                ...prev,
                [category]: {
                    ...prev[category],
                    [key]: value,
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

        if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
        if (!formData.contactPersonName.trim()) newErrors.contactPersonName = 'Contact person name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';

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
            // Simulate API call for provider creation/update
            await new Promise((resolve) => setTimeout(resolve, 1500));

            setLoading(false);
            setSuccessMessage(isEditing ? 'Provider updated successfully!' : 'Provider created successfully!');

            // Navigate back to user management after a delay
            setTimeout(() => {
                navigate('/admin/users');
            }, 2000);
        } catch (error) {
            setLoading(false);
            console.error('Error saving provider:', error);
        }
    };

    if (loading && isEditing) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading provider data...</p>
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
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Provider' : 'Add New Provider'}</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{isEditing ? 'Update provider information and settings' : 'Register a new moving service provider'}</p>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-gradient-to-r from-green-50 to-purple-50 border border-green-200 rounded-xl p-4 dark:from-green-900/20 dark:to-purple-900/20 dark:border-green-800">
                    <div className="flex items-center gap-3">
                        <IconCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="text-green-800 dark:text-green-300 font-medium">{successMessage}</span>
                    </div>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Business Information */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <IconBuilding className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Business Information</h2>
                        <span className="text-red-500">*</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Business Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="businessName"
                                value={formData.businessName}
                                onChange={handleInputChange}
                                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                    errors.businessName ? 'border-red-500' : 'border-gray-200'
                                }`}
                                placeholder="Enter business name"
                            />
                            {errors.businessName && <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Contact Person <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="contactPersonName"
                                value={formData.contactPersonName}
                                onChange={handleInputChange}
                                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                    errors.contactPersonName ? 'border-red-500' : 'border-gray-200'
                                }`}
                                placeholder="Enter contact person name"
                            />
                            {errors.contactPersonName && <p className="text-red-500 text-sm mt-1">{errors.contactPersonName}</p>}
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
                                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                    errors.email ? 'border-red-500' : 'border-gray-200'
                                }`}
                                placeholder="business@example.com"
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
                                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                    errors.phone ? 'border-red-500' : 'border-gray-200'
                                }`}
                                placeholder="+44 20 1234 5678"
                            />
                            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Type</label>
                            <select
                                name="businessDetails.businessType"
                                value={formData.businessDetails.businessType}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="Sole Trader">Sole Trader</option>
                                <option value="Partnership">Partnership</option>
                                <option value="Limited Company">Limited Company</option>
                                <option value="Corporation">Corporation</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Password Section (only for new providers) */}
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
                                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-10 ${
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
                                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-10 ${
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

                {/* Business Details */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <IconFileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Business Registration</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Registration Number</label>
                            <input
                                type="text"
                                name="businessDetails.registrationNumber"
                                value={formData.businessDetails.registrationNumber}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Enter registration number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">VAT Number</label>
                            <input
                                type="text"
                                name="businessDetails.vatNumber"
                                value={formData.businessDetails.vatNumber}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="GB123456789"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Insurance Number</label>
                            <input
                                type="text"
                                name="businessDetails.insuranceNumber"
                                value={formData.businessDetails.insuranceNumber}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Enter insurance number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">License Number</label>
                            <input
                                type="text"
                                name="businessDetails.licenseNumber"
                                value={formData.businessDetails.licenseNumber}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Enter license number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Year Established</label>
                            <input
                                type="number"
                                name="businessDetails.yearEstablished"
                                value={formData.businessDetails.yearEstablished}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="2020"
                                min="1900"
                                max={new Date().getFullYear()}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Employees</label>
                            <select
                                name="businessDetails.employeeCount"
                                value={formData.businessDetails.employeeCount}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="1-5">1-5</option>
                                <option value="6-10">6-10</option>
                                <option value="11-25">11-25</option>
                                <option value="26-50">26-50</option>
                                <option value="50+">50+</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Services Offered */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <IconTruck className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Services Offered</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(formData.services).map(([key, value]) => (
                            <label key={key} className="flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name={`services.${key}`}
                                    checked={value}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Account Settings - Updated */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <IconSettings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Account Settings</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Status</label>
                            <select
                                name="accountSettings.status"
                                value={formData.accountSettings.status}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                                name="accountSettings.verificationStatus"
                                value={formData.accountSettings.verificationStatus}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="unverified">Unverified</option>
                                <option value="pending">Pending</option>
                                <option value="verified">Verified</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Business Features</label>
                        <div className="space-y-3">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="accountSettings.featured"
                                    checked={formData.accountSettings.featured}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Featured provider (highlighted in search)</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="accountSettings.autoAcceptJobs"
                                    checked={formData.accountSettings.autoAcceptJobs}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Auto-accept jobs within criteria</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="accountSettings.instantQuotes"
                                    checked={formData.accountSettings.instantQuotes}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Provide instant quotes</span>
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
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Add any additional notes about the provider..."
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
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                {isEditing ? 'Updating...' : 'Creating...'}
                            </>
                        ) : (
                            <>
                                <IconDeviceFloppy className="w-4 h-4" />
                                {isEditing ? 'Update Provider' : 'Create Provider'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProviderForm;
