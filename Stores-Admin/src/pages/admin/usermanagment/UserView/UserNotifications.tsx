import React, { useState } from 'react';

// Use the full UserAccount interface from UserView.tsx
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

interface UserNotificationsProps {
  user: UserAccount;
  isEditing: boolean;
  onSave: (user: UserAccount) => void;
  onCancel: () => void;
}

const UserNotifications: React.FC<UserNotificationsProps> = ({ user, isEditing, onSave, onCancel }) => {
  const [localUser, setLocalUser] = useState<UserAccount>(user);
  const [saving, setSaving] = useState(false);

  const handleCheckboxChange = (field: string, value: boolean) => {
    setLocalUser({
      ...localUser,
      notification_preferences: {
        ...localUser.notification_preferences,
        [field]: value
      }
    });
  };

  const handleSave = () => {
    setSaving(true);
    onSave(localUser);
    setSaving(false);
  };

  const notificationTypes = ['email', 'sms', 'push', 'marketing'] as const;
  type NotificationType = typeof notificationTypes[number];

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold">Notification Preferences</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notificationTypes.map((type) => (
            <div key={type}>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                {type.charAt(0).toUpperCase() + type.slice(1)} Notifications
              </label>
              {isEditing ? (
                <input
                  type="checkbox"
                  checked={localUser.notification_preferences[type] || false}
                  onChange={e => handleCheckboxChange(type, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              ) : (
                <p className="text-gray-900">{localUser.notification_preferences[type] ? 'Enabled' : 'Disabled'}</p>
              )}
            </div>
          ))}
        </div>
        {isEditing && (
          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserNotifications; 