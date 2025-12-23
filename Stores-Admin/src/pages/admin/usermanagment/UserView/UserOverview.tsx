import React from 'react';
import { MapPin, User, Building2, Mail, Phone, Calendar, CreditCard, CheckCircle, AlertCircle, Info } from 'lucide-react';
import AddressAutocomplete from '../../../../components/ui/AddressAutocomplete';

interface Address {
  id: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  address_type: 'billing' | 'shipping' | 'both';
}

interface UserAccount {
  id: string;
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  user_type: 'customer' | 'provider' | 'admin';
  account_status: 'active' | 'pending' | 'suspended' | 'inactive';
  date_joined: string;
  last_active: string;
  profile_picture?: string;
  rating: number;
  stripe_customer_id?: string;
  notification_preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    marketing: boolean;
  };
  device_tokens: string[];
  user_addresses?: Address;
  business_name?: string;
  base_location?: {
    lat: number;
    lng: number;
  };
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
  number_of_completed_bookings: number;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  groups: string[];
  user_permissions: string[];
  roles: string[];
  activities?: any[];
  two_factor_enabled: boolean;
  two_factor_method: '2fa_app' | 'sms' | 'email' | null;
  last_password_change?: string;
  password_expires_at?: string;
  login_attempts?: number;
  last_failed_login?: string;
  sessionTimeout?: number;
  loginAlerts?: boolean;
  recoveryMethods?: {
    email: boolean;
    phone: boolean;
  };
  allowedIPs?: string[];
  securityHistory?: any[];
  preferences?: any;
}

interface UserOverviewProps {
  user: UserAccount;
  setUser: (user: UserAccount) => void;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  onSave: (user: UserAccount) => void;
  onCancel: () => void;
  validationErrors?: Record<string, string>;
}

const UserOverview: React.FC<UserOverviewProps> = ({ user, setUser, isEditing, setIsEditing, onSave, onCancel, validationErrors = {} }) => {
  const [localUser, setLocalUser] = React.useState(user);

  React.useEffect(() => {
    setLocalUser(user);
  }, [user]);

  const handleInputChange = (field: string, value: any) => {
    const updatedUser = { ...localUser, [field]: value };
    setLocalUser(updatedUser);
  };

  const handleAddressChange = (field: string, value: any) => {
    const updatedUser = {
      ...localUser,
      user_addresses: {
        ...localUser.user_addresses!,
        [field]: value
      }
    } as UserAccount;
    setLocalUser(updatedUser);
  };

  const handleBaseLocationChange = (address: string) => {
    const updatedUser = {
      ...localUser,
      base_location_data: {
        ...localUser.base_location_data,
        address: address
      }
    } as UserAccount;
    setLocalUser(updatedUser);
  };

  const handleBaseLocationSelect = (addressData: any) => {
    const updatedUser = {
      ...localUser,
      base_location_data: {
        address: addressData.formatted_address,
        coordinates: addressData.coordinates
      },
      base_location: addressData.coordinates
    } as UserAccount;
    setLocalUser(updatedUser);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderInput = (label: string, field: string, value: any, type: string = 'text', required: boolean = false, onChange?: (field: string, value: any) => void) => {
    const error = validationErrors[field];
    return (
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {isEditing ? (
          <div>
            <input
              type={type}
              value={value || ''}
              onChange={e => (onChange ? onChange(field, e.target.value) : handleInputChange(field, e.target.value))}
              className={`w-full px-4 py-3 border-2 ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm`}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
            {error && (
              <div className="flex items-center mt-2">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-900 font-medium">{value || 'N/A'}</p>
          </div>
        )}
      </div>
    );
  };

  const renderSelect = (label: string, field: string, value: string, options: string[], required: boolean = false) => {
    const error = validationErrors[field];
    return (
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {isEditing ? (
          <div>
            <select
              value={value}
              onChange={e => handleInputChange(field, e.target.value)}
              className={`w-full px-4 py-3 border-2 ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm`}
            >
              {options.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
            {error && (
              <div className="flex items-center mt-2">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-900 font-medium capitalize">{value || 'N/A'}</p>
          </div>
        )}
      </div>
    );
  };

  const renderBaseLocation = (label: string, required: boolean = false) => {
    const error = validationErrors['base_location_data'];
    const baseLocationData = localUser.base_location_data || { address: '' };
    
    return (
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {isEditing ? (
          <div className="space-y-3">
            <AddressAutocomplete
              value={baseLocationData.address}
              onAddressChange={handleBaseLocationChange}
              onAddressSelect={handleBaseLocationSelect}
              placeholder="Enter base location address..."
              showDetails={false}
            />
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 flex items-start">
                <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>This is the primary location where the provider operates from. It helps customers understand your service area.</span>
              </p>
            </div>
            {error && (
              <div className="flex items-center mt-2">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
            <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-gray-900 font-medium">
                {baseLocationData.address || 'No base location set'}
              </p>
              {!baseLocationData.address && (
                <p className="text-sm text-gray-500 mt-1">
                  Base location helps customers understand your service area
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleSave = () => {
    console.log("UserOverview handleSave called with:", localUser);
    onSave(localUser);
  };

  const handleCancel = () => {
    setLocalUser(user);
    onCancel();
  };

  return (
    <div className="space-y-6">
      {/* Validation Errors Display */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-6 shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Validation Errors
              </h3>
              <div className="text-sm text-red-700">
                <p className="mb-3">Please fix the following errors before saving:</p>
                <ul className="space-y-2">
                  {Object.entries(validationErrors).map(([field, error]) => (
                    <li key={field} className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="font-medium capitalize">{field.replace(/_/g, ' ')}:</span>
                      <span className="ml-2">{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provider Update Notice */}
      {user.user_type === 'provider' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-6 shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Info className="h-6 w-6 text-blue-500" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                Provider Information Notice
              </h3>
              <div className="text-sm text-blue-700">
                <p className="mb-2">
                  For complete provider management including services, location, and business details, 
                  please use the <strong className="text-blue-800">Provider Management</strong> page in the sidebar.
                </p>
                <div className="bg-blue-100 rounded-md p-3 mt-3">
                  <p className="text-xs text-blue-600">
                    💡 <strong>Tip:</strong> The Provider Management page offers advanced features like service categories, 
                    pricing, availability settings, and detailed business information.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex justify-end gap-4 mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
          <button
            onClick={handleCancel}
            className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 border border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md flex items-center"
          >
            <span className="font-medium">Cancel</span>
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 shadow-sm hover:shadow-md flex items-center"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            <span className="font-medium">Save Changes</span>
          </button>
        </div>
      )}
      
      {/* Basic Information Card */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <User className="w-6 h-6 mr-3 text-blue-600" />
            Basic Information
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput('First Name', 'first_name', localUser.first_name, 'text', true)}
            {renderInput('Last Name', 'last_name', localUser.last_name, 'text', true)}
            {renderInput('Email', 'email', localUser.email, 'email', true)}
            {renderInput('Phone Number', 'phone_number', localUser.phone_number, 'tel', true)}
            {renderSelect('User Type', 'user_type', localUser.user_type, ['customer', 'provider', 'admin'], true)}
            {renderSelect('Account Status', 'account_status', localUser.account_status, ['active', 'pending', 'suspended', 'inactive'], true)}
          </div>
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
              Account Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                <span className="font-medium text-gray-600">Joined:</span>
                <span className="ml-2 text-gray-800">{formatDate(localUser.date_joined)}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                <span className="font-medium text-gray-600">Last Active:</span>
                <span className="ml-2 text-gray-800">{formatDate(localUser.last_active)}</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                <span className="font-medium text-gray-600">Completed Bookings:</span>
                <span className="ml-2 text-gray-800 font-semibold">{localUser.number_of_completed_bookings}</span>
              </div>
              {localUser.stripe_customer_id && (
                <div className="flex items-center">
                  <CreditCard className="w-4 h-4 text-blue-400 mr-2" />
                  <span className="font-medium text-gray-600">Stripe Customer ID:</span>
                  <span className="ml-2 text-gray-800 font-mono text-xs">{localUser.stripe_customer_id}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Provider Information Card - Only show when user type is provider */}
      {(localUser.user_type === 'provider') && (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <Building2 className="w-6 h-6 mr-3 text-purple-600" />
              Provider Information
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderInput('Business Name', 'business_name', localUser.business_name, 'text', true)}
              {renderBaseLocation('Base Location', true)}
              {renderInput('VAT Number', 'vat_number', localUser.vat_number, 'text', true)}
              {renderInput('Company Registration Number', 'company_registration_number', localUser.company_registration_number, 'text', true)}
              {renderInput('Number of Vehicles', 'number_of_vehicles', localUser.number_of_vehicles, 'number')}
            </div>
          </div>
        </div>
      )}
      {/* Address Information Card */}
      {localUser.user_addresses && (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <MapPin className="w-6 h-6 mr-3 text-green-600" />
              Address Information
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {renderInput('Address Line 1', 'address_line1', localUser.user_addresses.address_line1, 'text', true, handleAddressChange)}
              {renderInput('Address Line 2', 'address_line2', localUser.user_addresses.address_line2, 'text', false, handleAddressChange)}
              {renderInput('City', 'city', localUser.user_addresses.city, 'text', true, handleAddressChange)}
              {renderInput('State', 'state', localUser.user_addresses.state, 'text', false, handleAddressChange)}
              {renderInput('Postal Code', 'postal_code', localUser.user_addresses.postal_code, 'text', true, handleAddressChange)}
              {renderInput('Country', 'country', localUser.user_addresses.country, 'text', true, handleAddressChange)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserOverview; 