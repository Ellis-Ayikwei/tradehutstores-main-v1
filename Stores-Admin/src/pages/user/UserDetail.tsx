import { faBuilding, faFlask, faGear, faLock, faShieldHalved, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState, useEffect } from 'react';

// Type Definitions
interface UserData {
    profile: {
        businessName: string;
        businessDescription: string;
        services: string[];
        photos: string[];
        teamMembers: TeamMember[];
        certifications: string[];
        serviceAreas: string[];
    };
    account: {
        email: string;
        username: string;
        address: Address;
        paymentMethods: string[];
        lastLogin: string;
        newPassword: string;
    };
    security: SecuritySettings;
    preferences: UserPreferences;
    bank: BankDetails;
}

interface TeamMember {
    name: string;
    role: string;
}

interface Address {
    street: string;
    city: string;
    postalCode: string;
    country: string;
}

interface SecuritySettings {
    twoFactorEnabled: boolean;
    activeSessions: SessionInfo[];
}

interface SessionInfo {
    device: string;
    lastActive: string;
}

interface UserPreferences {
    notifications: NotificationSettings;
    theme: string;
    language: string;
    categories: string[];
    analytics: boolean;
    fontSize: number;
    timezone: string;
}

interface NotificationSettings {
    email: boolean;
    sms: boolean;
    push: boolean;
}

interface BankDetails {
    accountNumber: string;
    sortCode: string;
    bankName: string;
}

// Props interface for the main component
interface UserProfileTabsProps {
    userData: UserData;
    isProvider?: boolean;
    isEditing?: boolean;
}

// Default data structure
const defaultUserData: UserData = {
    profile: {
        businessName: "",
        businessDescription: "",
        services: [],
        photos: [],
        teamMembers: [],
        certifications: [],
        serviceAreas: []
    },
    account: {
        email: "",
        username: "",
        address: {
            street: "",
            city: "",
            postalCode: "",
            country: ""
        },
        paymentMethods: [],
        lastLogin: "",
        newPassword: ""
    },
    security: {
        twoFactorEnabled: false,
        activeSessions: []
    },
    preferences: {
        notifications: {
            email: false,
            sms: false,
            push: false
        },
        theme: "light",
        language: "en",
        categories: [],
        analytics: false,
        fontSize: 16,
        timezone: "UTC"
    },
    bank: {
        accountNumber: "",
        sortCode: "",
        bankName: ""
    }
};

// Main Component
const UserProfileTabs = ({ userData = defaultUserData, isProvider = true, isEditing = false }: UserProfileTabsProps) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [localUserData, setLocalUserData] = useState<UserData>(userData || defaultUserData);

    // Update local state when props change
    useEffect(() => {
        if (userData) {
            setLocalUserData(userData);
        }
    }, [userData]);

    const handleProfileUpdate = (field: keyof UserData['profile'], value: string | string[]) => {
        setLocalUserData((prev) => ({
            ...prev,
            profile: { ...prev.profile, [field]: value },
        }));
    };

    const handleAccountUpdate = (field: keyof UserData['account'], value: string | Address) => {
        setLocalUserData((prev) => ({
            ...prev,
            account: { ...prev.account, [field]: value },
        }));
    };

    const toggleTwoFactor = () => {
        setLocalUserData((prev) => ({
            ...prev,
            security: { ...prev.security, twoFactorEnabled: !prev.security.twoFactorEnabled },
        }));
    };

    const handlePreferenceChange = (field: keyof UserPreferences, value: string | string[] | NotificationSettings) => {
        setLocalUserData((prev) => ({
            ...prev,
            preferences: { ...prev.preferences, [field]: value },
        }));
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 border-b mb-6">
                {[
                    { id: 'profile', label: isProvider ? 'Business Profile' : 'User Profile', icon: isProvider ? faBuilding : faUser },
                    { id: 'account', label: 'Account', icon: faUser },
                    { id: 'security', label: 'Security', icon: faShieldHalved },
                    { id: 'preferences', label: 'Preferences', icon: faGear },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 flex items-center gap-2 ${activeTab === tab.id ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
                    >
                        <FontAwesomeIcon icon={tab.icon} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'profile' && <ProfileTab profile={localUserData.profile} isProvider={isProvider} editMode={isEditing} />}
            {activeTab === 'account' && <AccountTab account={localUserData.account} bank={localUserData.bank} onAccountUpdate={handleAccountUpdate} isProvider={isProvider} editMode={isEditing} />}
            {activeTab === 'security' && <SecurityTab security={localUserData.security} onTwoFactorToggle={toggleTwoFactor} editMode={isEditing} />}
            {activeTab === 'preferences' && <PreferencesTab preferences={localUserData.preferences} onPreferenceChange={handlePreferenceChange} editMode={isEditing} />}
        </div>
    );
};

// Sub-components
import { faTrash, faUpload, faStar, faVanShuttle, faCreditCard, faUserCog, faIdCard } from '@fortawesome/free-solid-svg-icons';

interface ProfileTabProps {
    profile: UserData['profile'];
    isProvider: boolean;
    editMode: boolean;
}

const ProfileTab = ({ profile, isProvider, editMode }: ProfileTabProps) => {
    if (!profile) {
        return <div className="bg-white rounded-lg p-6 shadow-sm">Loading profile data...</div>;
    }

    const [businessDesc, setBusinessDesc] = useState(profile.businessDescription || "");
    const [photos, setPhotos] = useState<string[]>(profile.photos || []);
    const [vanPhotos, setVanPhotos] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>(profile.services || []);
    const [bidPreference, setBidPreference] = useState('');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        const files = e.target.files;
        if (files) {
            const newPhotos = Array.from(files).map((file) => URL.createObjectURL(file));
            setter((prev) => [...prev, ...newPhotos]);
        }
    };

    const handleDeletePhoto = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        setter((prev) => prev.filter((_, i) => i !== index));
    };

    const wordCount = 390 - businessDesc.split(/\s+/).length;

    // For customer profile
    const customerCategories = [
        'Furniture Moving', 
        'Home Relocation', 
        'Office Relocation', 
        'Vehicle Transport',
        'Antiques & Fine Art',
        'Parcels & Small Items'
    ];

    // For provider profile
    const providerCategories = [
        'Furniture & Appliances',
        'Home Removals',
        'Specialist & Antiques',
        'Cars & Vehicles',
        'Boats',
        'Freight',
        'Industrial',
        'Livestock',
        'Piano',
        'Motorbikes',
        'Vehicle Parts',
        'Clearance',
        'Office Removals',
        'Packaged Items & Parcels',
        'Man Power Only',
    ];

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm space-y-6">
                {/* Business/User Details */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">{isProvider ? 'Business Details' : 'User Details'}</h3>
                    <div>
                        <label className="block text-gray-600 mb-2">{isProvider ? 'Business name' : 'Full name'}</label>
                        <input 
                            type="text" 
                            value={profile.businessName} 
                            readOnly={!editMode} 
                            className={`w-full p-2 border rounded ${!editMode ? 'bg-gray-50' : ''}`} 
                        />
                    </div>

                    {isProvider && (
                        <div>
                            <label className="block text-gray-600 mb-2">
                                Business description
                                <span className="text-sm text-gray-500 ml-2">({wordCount} words remaining)</span>
                            </label>
                            <textarea
                                value={businessDesc}
                                onChange={(e) => setBusinessDesc(e.target.value)}
                                readOnly={!editMode}
                                className={`w-full p-2 border rounded h-32 ${!editMode ? 'bg-gray-50' : ''}`}
                                placeholder="Please do not enter company names or contact details..."
                            />
                        </div>
                    )}
                </div>

                {/* Photos Section */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">{isProvider ? 'Business Photos' : 'Profile Photos'}</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {photos.map((photo, index) => (
                            <div key={index} className="relative group">
                                <img src={photo} alt={isProvider ? "Business" : "Profile"} className="w-full h-32 object-cover rounded-lg" />
                                {editMode && (
                                    <button onClick={() => handleDeletePhoto(index, setPhotos)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                                        <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {editMode && (
                            <label className="border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer h-32">
                                <input type="file" className="hidden" accept="image/jpeg, image/gif" onChange={(e) => handleFileUpload(e, setPhotos)} />
                                <FontAwesomeIcon icon={faUpload} className="text-gray-400 mr-2" />
                                Upload Photo
                            </label>
                        )}
                    </div>
                </div>

                {/* Vehicle Details - Provider Only */}
                {isProvider && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Your Van</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {vanPhotos.map((photo, index) => (
                                <div key={index} className="relative group">
                                    <img src={photo} alt="Van" className="w-full h-32 object-cover rounded-lg" />
                                    {editMode && (
                                        <button onClick={() => handleDeletePhoto(index, setVanPhotos)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                                            <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {editMode && (
                                <label className="border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer h-32">
                                    <input type="file" className="hidden" accept="image/jpeg, image/gif" onChange={(e) => handleFileUpload(e, setVanPhotos)} />
                                    <FontAwesomeIcon icon={faUpload} className="text-gray-400 mr-2" />
                                    Upload Van Photo
                                </label>
                            )}
                        </div>
                    </div>
                )}

                {/* Insurance and Payment Sections - Provider Only */}
                {isProvider && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold">Insurance</h3>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" className="form-checkbox" disabled={!editMode} />
                                    Goods in transit insurance (£10,000)
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" className="form-checkbox" disabled={!editMode} />
                                    CMR Insurance (£0)
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold">Payment Methods</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {['Cash', 'Cheque', 'Visa', 'Mastercard', 'Paypal', 'Bank Transfer'].map((method) => (
                                    <label key={method} className="flex items-center gap-2">
                                        <input type="checkbox" className="form-checkbox" disabled={!editMode} />
                                        {method}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Categories Section */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">{isProvider ? 'Job Specializations' : 'Service Preferences'}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {(isProvider ? providerCategories : customerCategories).map((category) => (
                            <label 
                                key={category} 
                                className={`flex items-center gap-2 ${!editMode && !selectedCategories.includes(category) ? 'text-gray-400' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedCategories.includes(category)}
                                    onChange={(e) => {
                                        if (e.target.checked && selectedCategories.length < 8) {
                                            setSelectedCategories([...selectedCategories, category]);
                                        } else if (!e.target.checked) {
                                            setSelectedCategories(selectedCategories.filter((c) => c !== category));
                                        }
                                    }}
                                    className="form-checkbox"
                                    disabled={!editMode || (selectedCategories.length >= 8 && !selectedCategories.includes(category))}
                                />
                                {category}
                            </label>
                        ))}
                    </div>
                    <p className="text-sm text-gray-500">Selected {selectedCategories.length} of 8 {isProvider ? 'specializations' : 'preferences'}</p>
                </div>

                {/* Bid Preferences - Provider Only */}
                {isProvider && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Bid Preferences</h3>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2">
                                <input 
                                    type="radio" 
                                    name="bidPreference" 
                                    value="stopAll" 
                                    checked={bidPreference === 'stopAll'} 
                                    onChange={(e) => setBidPreference(e.target.value)} 
                                    className="form-radio" 
                                    disabled={!editMode}
                                />
                                Stop allowing customers to invite me to jobs
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="bidPreference"
                                    value="stopEmails"
                                    checked={bidPreference === 'stopEmails'}
                                    onChange={(e) => setBidPreference(e.target.value)}
                                    className="form-radio"
                                    disabled={!editMode}
                                />
                                Stop sending me job invitation emails, but allow customers to invite me
                            </label>
                        </div>
                    </div>
                )}

                {/* Communication Preferences - For Customer */}
                {!isProvider && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Communication Preferences</h3>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    className="form-checkbox" 
                                    disabled={!editMode}
                                />
                                Receive service provider quotes via email
                            </label>
                            <label className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    className="form-checkbox" 
                                    disabled={!editMode}
                                />
                                Receive SMS notifications for booking updates
                            </label>
                            <label className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    className="form-checkbox" 
                                    disabled={!editMode}
                                />
                                Subscribe to promotional offers and discounts
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface AccountTabProps {
    account: UserData['account'];
    bank: BankDetails;
    isProvider?: boolean;
    editMode?: boolean;
    onAccountUpdate: (field: keyof UserData['account'], value: string) => void;
}

const AccountTab = ({ account, bank, isProvider = true, editMode = false, onAccountUpdate }: AccountTabProps) => {
    if (!account || !bank) {
        return <div className="bg-white rounded-lg p-6 shadow-sm">Loading account data...</div>;
    }

    return (
        <div className="bg-white rounded-lg p-6 shadow-sm space-y-8">
            <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Account Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-600 mb-1">Email Address</label>
                        <input 
                            type="email" 
                            value={account.email} 
                            onChange={(e) => onAccountUpdate('email', e.target.value)} 
                            className={`w-full p-2 border rounded ${!editMode ? 'bg-gray-50' : ''}`}
                            readOnly={!editMode}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-600 mb-1">Username</label>
                        <p className="font-medium">{account.username}</p>
                        <p className="text-sm text-gray-500">You cannot change your user name</p>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t">
                <h2 className="text-xl font-semibold mb-4">Address Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(account.address).map(([key, value]) => (
                        <div key={key}>
                            <label className="block text-gray-600 mb-1">{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                            <input
                                type="text"
                                value={value}
                                onChange={(e) =>
                                    onAccountUpdate('address', {
                                        ...account.address,
                                        [key]: e.target.value,
                                    })
                                }
                                className={`w-full p-2 border rounded ${!editMode ? 'bg-gray-50' : ''}`}
                                readOnly={!editMode}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Bank Details - Mainly for Provider */}
            {isProvider && (
                <div className="pt-6 border-t">
                    <h2 className="text-xl font-semibold mb-4">Bank Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(bank).map(([key, value]) => (
                            <div key={key}>
                                <label className="block text-gray-600 mb-1">{key.split(/(?=[A-Z])/).join(' ')}</label>
                                <p className="font-medium">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Payment Methods - For Customer */}
            {!isProvider && (
                <div className="pt-6 border-t">
                    <h2 className="text-xl font-semibold mb-4">Payment Methods</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center">
                                <FontAwesomeIcon icon={faCreditCard} className="text-blue-600 mr-3" size="lg" />
                                <div>
                                    <p className="font-medium">Visa ending in 4242</p>
                                    <p className="text-sm text-gray-500">Expires 12/2025</p>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                {editMode && (
                                    <>
                                        <button className="text-blue-600 hover:text-blue-800">Edit</button>
                                        <button className="text-red-600 hover:text-red-800">Remove</button>
                                    </>
                                )}
                                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">Default</span>
                            </div>
                        </div>
                        
                        {editMode && (
                            <button className="flex items-center text-blue-600 font-medium">
                                <FontAwesomeIcon icon={faCreditCard} className="mr-2" />
                                Add Payment Method
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* For Customer - Previous Orders Summary */}
            {!isProvider && (
                <div className="pt-6 border-t">
                    <h2 className="text-xl font-semibold mb-4">Order History</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium">Order #MV12345</p>
                                <p className="text-sm text-gray-500">April 5, 2025</p>
                            </div>
                            <div className="text-right">
                                <p className="font-medium">£350.00</p>
                                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">Completed</span>
                            </div>
                        </div>
                        <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium">Order #MV12256</p>
                                <p className="text-sm text-gray-500">March 22, 2025</p>
                            </div>
                            <div className="text-right">
                                <p className="font-medium">£120.50</p>
                                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">Completed</span>
                            </div>
                        </div>
                    </div>
                    <button className="mt-4 text-blue-600 font-medium">View All Orders</button>
                </div>
            )}
        </div>
    );
};

interface SecurityTabProps {
    security: SecuritySettings;
    editMode?: boolean;
    onTwoFactorToggle: () => void;
}

const SecurityTab = ({ security, editMode = false, onTwoFactorToggle }: SecurityTabProps) => {
    if (!security) {
        return <div className="bg-white rounded-lg p-6 shadow-sm">Loading security data...</div>;
    }

    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [sessionTimeout, setSessionTimeout] = useState('30');
    const [loginAlerts, setLoginAlerts] = useState(true);
    const [recoveryMethods, setRecoveryMethods] = useState({
        email: true,
        phone: false,
    });
    const [allowedIPs, setAllowedIPs] = useState<string[]>([]);
    const [newIP, setNewIP] = useState('');

    const calculatePasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^A-Za-z0-9]/)) strength++;
        return strength;
    };

    const handleAddIP = () => {
        if (newIP && isValidIP(newIP) && editMode) {
            setAllowedIPs([...allowedIPs, newIP]);
            setNewIP('');
        }
    };

    const isValidIP = (ip: string) => /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/.test(ip);

    return (
        <div className="bg-white rounded-lg p-6 shadow-sm space-y-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faShieldHalved} />
                Security Settings
            </h2>

            <div className="space-y-6">
                {/* Authentication Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Authentication</h3>

                    <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium">Two-Factor Authentication</h4>
                                <p className="text-sm text-gray-600">{security.twoFactorEnabled ? 'Enabled' : 'Disabled'} via Authenticator App</p>
                            </div>
                            {editMode && (
                                <button onClick={onTwoFactorToggle} className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200">
                                    {security.twoFactorEnabled ? 'Disable' : 'Enable'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-medium">Password Management</h4>
                                <p className="text-sm text-gray-600">Last changed: 3 days ago</p>
                            </div>
                            {editMode && (
                                <button onClick={() => setShowPasswordForm(!showPasswordForm)} className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200">
                                    {showPasswordForm ? 'Cancel' : 'Change Password'}
                                </button>
                            )}
                        </div>

                        {showPasswordForm && (
                            <div className="space-y-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Current Password</label>
                                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full p-2 border rounded" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            setPasswordStrength(calculatePasswordStrength(e.target.value));
                                        }}
                                        className="w-full p-2 border rounded"
                                    />
                                    <div className="mt-2 flex gap-1">
                                        {[...Array(4)].map((_, i) => (
                                            <div
                                                key={i}
                                                className={`h-2 w-full rounded ${
                                                    i < passwordStrength ? (passwordStrength < 2 ? 'bg-red-500' : passwordStrength < 4 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-200'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-2 border rounded" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Session Management */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Session Management</h3>

                    <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-medium">Active Sessions</h4>
                                <p className="text-sm text-gray-600">{security.activeSessions.length} active sessions</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {security.activeSessions.map((session) => (
                                <div key={session.device} className="flex items-center justify-between py-2">
                                    <div>
                                        <p className="text-gray-800">{session.device}</p>
                                        <p className="text-sm text-gray-600">Last active: {session.lastActive}</p>
                                    </div>
                                    {editMode && (
                                        <button className="text-red-600 hover:text-red-800">Revoke</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium">Session Timeout</h4>
                                <p className="text-sm text-gray-600">Auto-logout after {sessionTimeout} minutes of inactivity</p>
                            </div>
                            {editMode && (
                                <select value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} className="px-4 py-2 border rounded-lg">
                                    <option value="15">15 minutes</option>
                                    <option value="30">30 minutes</option>
                                    <option value="60">1 hour</option>
                                    <option value="120">2 hours</option>
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                {/* Security Preferences */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Security Preferences</h3>

                    <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium">Login Alerts</h4>
                                <p className="text-sm text-gray-600">{loginAlerts ? 'Enabled' : 'Disabled'} - Receive email notifications for new logins</p>
                            </div>
                            {editMode && (
                                <button onClick={() => setLoginAlerts(!loginAlerts)} className={`px-4 py-2 rounded-lg ${loginAlerts ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {loginAlerts ? 'Disable' : 'Enable'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium">Account Recovery</h4>
                                <p className="text-sm text-gray-600">
                                    {recoveryMethods.email && 'Email '}
                                    {recoveryMethods.phone && 'Phone '}
                                    {!recoveryMethods.email && !recoveryMethods.phone && 'No recovery methods set'}
                                </p>
                            </div>
                            {editMode && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setRecoveryMethods((prev) => ({ ...prev, email: !prev.email }))}
                                        className={`px-4 py-2 rounded-lg ${recoveryMethods.email ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                                    >
                                        Email
                                    </button>
                                    <button
                                        onClick={() => setRecoveryMethods((prev) => ({ ...prev, phone: !prev.phone }))}
                                        className={`px-4 py-2 rounded-lg ${recoveryMethods.phone ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                                    >
                                        Phone
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* IP Allowlist */}
                <div className="p-4 border rounded-lg">
                    <div className="mb-4">
                        <h4 className="font-medium">Allowed IP Addresses</h4>
                        <p className="text-sm text-gray-600">Restrict access to specific IP addresses</p>
                    </div>

                    {editMode && (
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" 
                                value={newIP} 
                                onChange={(e) => setNewIP(e.target.value)} 
                                placeholder="Enter IP address" 
                                className="flex-1 p-2 border rounded" 
                            />
                            <button 
                                onClick={handleAddIP} 
                                className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200"
                            >
                                Add IP
                            </button>
                        </div>
                    )}

                    <div className="space-y-2">
                        {allowedIPs.map((ip, index) => (
                            <div key={ip} className="flex items-center justify-between py-2">
                                <span className="font-mono">{ip}</span>
                                {editMode && (
                                    <button onClick={() => setAllowedIPs(allowedIPs.filter((_, i) => i !== index))} className="text-red-600 hover:text-red-800">
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Security History */}
                <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-4">Security History</h4>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-gray-800">Password changed</p>
                                <p className="text-sm text-gray-600">2 days ago</p>
                            </div>
                            <span className="text-sm text-gray-500">From 192.168.1.1</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-gray-800">Two-factor authentication enabled</p>
                                <p className="text-sm text-gray-600">1 week ago</p>
                            </div>
                            <span className="text-sm text-gray-500">From Chrome on Windows</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface PreferencesTabProps {
    preferences: UserPreferences;
    editMode?: boolean;
    onPreferenceChange: (field: keyof UserPreferences, value: any) => void;
}

const PreferencesTab = ({ preferences, editMode = false, onPreferenceChange }: PreferencesTabProps) => {
    if (!preferences) {
        return <div className="bg-white rounded-lg p-6 shadow-sm">Loading preferences...</div>;
    }

    return (
        <div className="bg-white rounded-lg p-6 shadow-sm space-y-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faGear} />
                System Preferences
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Notifications Section */}
                <div>
                    <label className="block text-gray-600 mb-2">Notification Preferences</label>
                    <div className="space-y-2">
                        {Object.entries(preferences.notifications).map(([key, value]) => (
                            <label key={key} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                <input
                                    type="checkbox"
                                    checked={value}
                                    onChange={(e) => {
                                        if (editMode) {
                                            onPreferenceChange('notifications', {
                                                ...preferences.notifications,
                                                [key]: e.target.checked,
                                            });
                                        }
                                    }}
                                    className="form-checkbox h-4 w-4 text-blue-600"
                                    disabled={!editMode}
                                />
                                <span className="text-gray-700">{key.charAt(0).toUpperCase() + key.slice(1)} Notifications</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Appearance Section */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-gray-600 mb-2">Theme</label>
                        <select 
                            className={`w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 ${!editMode ? 'bg-gray-50' : ''}`}
                            value={preferences.theme} 
                            onChange={(e) => onPreferenceChange('theme', e.target.value)}
                            disabled={!editMode}
                        >
                            <option value="light">Light Theme</option>
                            <option value="dark">Dark Theme</option>
                            <option value="system">System Default</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-600 mb-2">Font Size</label>
                        <input
                            type="range"
                            min="12"
                            max="24"
                            value={preferences.fontSize}
                            onChange={(e) => onPreferenceChange('fontSize', parseInt(e.target.value))}
                            className="w-full accent-blue-600"
                            disabled={!editMode}
                        />
                        <div className="flex justify-between text-sm text-gray-500 mt-1">
                            <span>Small</span>
                            <span>{preferences.fontSize}px</span>
                            <span>Large</span>
                        </div>
                    </div>
                </div>

                {/* Language & Region */}
                <div>
                    <label className="block text-gray-600 mb-2">Language</label>
                    <select
                        className={`w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 ${!editMode ? 'bg-gray-50' : ''}`}
                        value={preferences.language}
                        onChange={(e) => onPreferenceChange('language', e.target.value)}
                        disabled={!editMode}
                    >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                    </select>
                </div>

                <div>
                    <label className="block text-gray-600 mb-2">Timezone</label>
                    <select
                        className={`w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 ${!editMode ? 'bg-gray-50' : ''}`}
                        value={preferences.timezone}
                        onChange={(e) => onPreferenceChange('timezone', e.target.value)}
                        disabled={!editMode}
                    >
                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                        <option value="EST">Eastern Time (EST)</option>
                        <option value="PST">Pacific Time (PST)</option>
                        <option value="CET">Central European Time (CET)</option>
                    </select>
                </div>
            </div>

            {/* Security Section */}
            <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faShieldHalved} />
                    Security Preferences
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                            <input
                                type="checkbox"
                                checked={preferences.twoFactorAuth}
                                onChange={(e) => {
                                    if (editMode) {
                                        onPreferenceChange('twoFactorAuth', e.target.checked);
                                    }
                                }}
                                className="form-checkbox h-4 w-4 text-blue-600"
                                disabled={!editMode}
                            />
                            <span className="text-gray-700">Two-Factor Authentication</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                            <input
                                type="checkbox"
                                checked={preferences.passwordExpiration}
                                onChange={(e) => {
                                    if (editMode) {
                                        onPreferenceChange('passwordExpiration', e.target.checked);
                                    }
                                }}
                                className="form-checkbox h-4 w-4 text-blue-600"
                                disabled={!editMode}
                            />
                            <span className="text-gray-700">Require Password Change Every 90 Days</span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-gray-600 mb-2">Session Timeout</label>
                        <select
                            className={`w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 ${!editMode ? 'bg-gray-50' : ''}`}
                            value={preferences.sessionTimeout}
                            onChange={(e) => {
                                if (editMode) {
                                    onPreferenceChange('sessionTimeout', parseInt(e.target.value));
                                }
                            }}
                            disabled={!editMode}
                        >
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">1 hour</option>
                            <option value="1440">24 hours</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Advanced Preferences */}
            <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faFlask} />
                    Advanced Settings
                </h3>
                <div className="space-y-2">
                    <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                        <input
                            type="checkbox"
                            checked={preferences.autoSave}
                            onChange={(e) => {
                                if (editMode) {
                                    onPreferenceChange('autoSave', e.target.checked);
                                }
                            }}
                            className="form-checkbox h-4 w-4 text-blue-600"
                            disabled={!editMode}
                        />
                        <span className="text-gray-700">Auto-save Changes Every 5 Minutes</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                        <input
                            type="checkbox"
                            checked={preferences.analytics}
                            onChange={(e) => {
                                if (editMode) {
                                    onPreferenceChange('analytics', e.target.checked);
                                }
                            }}
                            className="form-checkbox h-4 w-4 text-blue-600"
                            disabled={!editMode}
                        />
                        <span className="text-gray-700">Share Usage Analytics</span>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default UserProfileTabs;
