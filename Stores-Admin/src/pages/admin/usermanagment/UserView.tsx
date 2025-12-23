import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import {
  ArrowLeft,
  Edit2,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Users,
  CheckCircle2,
  Ban,
  Star,
  Car,
  FileText,
  Save,
  X,
  Shield,
  History,
  Bell,
  Lock,
  CreditCard,
  BarChart2,
  ClipboardList,
  Eye,
  Trash2,
  Power,
  Smartphone,
  Key,
  LogOut,
  AlertTriangle,
  UserCheck,
  UserX,
  EyeOff,
  RefreshCcw
} from 'lucide-react';
import axiosInstance from '../../../services/axiosInstance';
import fetcher from '../../../services/fetcher';
import IconLoader from '../../../components/Icon/IconLoader';
import { showNotification } from '@mantine/notifications';
import UserOverview from './UserView/UserOverview';
import UserSecurity from './UserView/UserSecurity';
import UserPermissions from './UserView/UserPermissions';
import UserNotifications from './UserView/UserNotifications';
import UserActivity from './UserView/UserActivity';
import { usePermissionService } from '../../../hooks/usePermissionService';

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

interface UserActivity {
  id: string;
  activity_type: string;
  request_id?: string;
  details?: any;
  created_at: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SecurityEvent {
  type: string;
  date: string;
  ipAddress?: string;
  deviceInfo?: string;
}

type AccountStatus = 'active' | 'pending' | 'suspended' | 'inactive';

interface ProviderProfile {
  id: string;
  business_type: string;
  business_name: string;
  registration_number: string;
  vat_number: string;
  phone: string;
  email: string;
  website: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  base_location: {
    type: string;
    coordinates: [number, number];
  };
  base_location_address: string;
  service_area: any;
  max_service_radius_km: number;
  waste_license_number: string;
  waste_license_expiry: string | null;
  environmental_permit_number: string;
  environmental_permit_expiry: string | null;
  waste_types_handled: string[];
  waste_categories: string[];
  collection_methods: string[];
  vehicle_fleet_size: number;
  daily_collection_capacity_kg: number | null;
  has_compaction_equipment: boolean;
  has_recycling_facilities: boolean;
  service_hours_start: string | null;
  service_hours_end: string | null;
  emergency_collection_available: boolean;
  weekend_collection_available: boolean;
  public_liability_insurance: boolean;
  public_liability_amount: number | null;
  employers_liability_insurance: boolean;
  employers_liability_amount: number | null;
  vehicle_insurance: boolean;
  vehicle_insurance_amount: number | null;
  verification_status: string;
  verified_at: string | null;
  verified_by: string | null;
  verification_notes: string;
  is_active: boolean;
  is_available: boolean;
  rating: string;
  total_jobs_completed: number;
  total_weight_collected_kg: string;
  total_recycled_kg: string;
  collection_efficiency_rating: string;
  average_response_time_minutes: number;
  completion_rate: string;
  commission_rate: string;
  balance: string;
  total_earnings: string;
  auto_accept_jobs: boolean;
  max_distance_km: number;
  min_job_value: string;
  notification_enabled: boolean;
  vehicle_count: number;
  last_active: string | null;
  average_rating: number;
  completed_bookings_count: number;
  base_location_coordinates: {
    lat: number;
    lng: number;
  };
}

export interface UserAccount {
  id: string;
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  user_type: 'customer' | 'provider' | 'admin';
  account_status: AccountStatus;
  date_joined: string;
  last_active: string | null;
  profile_picture?: string | null;
  rating: string;
  stripe_customer_id?: string;
  notification_preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    marketing: boolean;
  };
  device_tokens: string[];
  user_addresses?: Address;
  // Provider specific fields - now nested in provider_profile
  provider_profile?: ProviderProfile;
  customer_profile?: any;
  // Flat provider fields for form compatibility
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
  number_of_completed_bookings?: number;
  business_type?: string;
  vat_registered?: boolean;
  business_description?: string;
  website?: string;
  founded_year?: number;
  operating_areas?: any[];
  service_categories?: any[];
  services_offered?: any[];
  specializations?: any[];
  service_image?: string;
  base_location?: any;
  hourly_rate?: number;
  accepts_instant_bookings?: boolean;
  service_radius_km?: number;
  minimum_job_value?: number;
  verification_status?: string;
  last_verified?: string;
  service_areas?: any[];
  documents?: any[];
  reviews?: any[];
  payments?: any[];
  average_rating?: number;
  completed_bookings_count?: number;
  vehicle_count?: number;
  // Additional fields
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  groups: string[];
  user_permissions: string[];
  roles: string[];
  user_activities: UserActivity[];
  bins: any[];
  activities?: UserActivity[];
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
  securityHistory?: SecurityEvent[];
  preferences?: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    fontSize: number;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
      marketing: boolean;
    };
    autoSave?: boolean;
    analytics?: boolean;
  };
  suspension_reason?: string;
}

const defaultUser: UserAccount = {
  id: '',
  email: '',
  phone_number: '',
  first_name: '',
  last_name: '',
  user_type: 'customer',
  account_status: 'active',
  date_joined: '',
  last_active: null,
  profile_picture: null,
  rating: '0.00',
  notification_preferences: {
    email: false,
    sms: false,
    push: false,
    marketing: false
  },
  device_tokens: [],
  user_activities: [],
  bins: [],
  is_staff: false,
  is_superuser: false,
  is_active: true,
  groups: [],
  user_permissions: [],
  roles: [],
  two_factor_enabled: false,
  two_factor_method: null,
};

const UserView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserAccount>(defaultUser);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<UserAccount>(defaultUser);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('overview');

  // Security tab state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [loginAlerts, setLoginAlerts] = useState(false);
  const [recoveryMethods, setRecoveryMethods] = useState({ email: true, phone: false });
  const [allowedIPs, setAllowedIPs] = useState<string[]>([]);
  const [newIP, setNewIP] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // User management state
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [deactivationReason, setDeactivationReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  // Manage Groups modal state
  const [showManageGroups, setShowManageGroups] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const { groups: groupService, userGroups, utils } = usePermissionService();
  const [allGroups, setAllGroups] = useState<{ id: number; name: string }[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const { data: userResponse, error: fetchError, isLoading: isUserLoading, mutate } = useSWR(id ? `/users/${id}/` : null, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
console.log("the user data", userResponse)
  useEffect(() => {
    if (userResponse) {
      const userData: UserAccount = {
        ...defaultUser,
        ...userResponse,
        groups: userResponse.groups || [],
        user_permissions: userResponse.user_permissions || [],
        roles: userResponse.roles || []
      };
      setUser(userData);
      setEditedUser(userData);
    }
    setLoading(false);
  }, [userResponse]);

  useEffect(() => {
    if (user) {
      setSessionTimeout(user.sessionTimeout || 30);
      setLoginAlerts(user.loginAlerts || false);
      setRecoveryMethods(user.recoveryMethods || { email: true, phone: false });
      setAllowedIPs(user.allowedIPs || []);
    }
  }, [user]);
  
  const fetchUserDetails = async () => {
    setError(null);
    await mutate();
  };

  const handleEdit = () => {
    setIsEditing(true);
    setValidationErrors({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedUser(user);
    setValidationErrors({});
  };

  const handleSaveWithUser = async (userToSave: UserAccount) => {
    console.log("handleSaveWithUser called with:", userToSave)
    
    try {
      setSaving(true);
      console.log("userToSave", userToSave)
      
      // Create a complete user object with all state
      const updatedUser = {
        ...userToSave,
        sessionTimeout,
        loginAlerts,
        recoveryMethods,
        allowedIPs,
        is_staff: userToSave.is_staff,
        notification_preferences: {
          ...userToSave.notification_preferences
        },
        user_addresses: userToSave.user_addresses ? {
          ...userToSave.user_addresses
        } : undefined,
        two_factor_enabled: userToSave.two_factor_enabled,
        two_factor_method: userToSave.two_factor_method,
        // Include only specific provider_profile fields if user type is provider
        ...(userToSave.user_type === 'provider' && {
          provider_profile: {
            ...userToSave.provider_profile,
            company_name: userToSave.business_name,
            address_line1: userToSave.provider_profile?.base_location_data?.address,
            vat_number: userToSave.vat_number,
            company_reg_number: userToSave.company_registration_number,
            vehicle_count: userToSave.number_of_vehicles,
            completed_bookings_count: userToSave.number_of_completed_bookings,
            business_type: userToSave.business_type,
            vat_registered: userToSave.vat_registered,
            business_description: userToSave.business_description,
            website: userToSave.website,
            founded_year: userToSave.founded_year,
            operating_areas: userToSave.operating_areas,
            service_categories: userToSave.service_categories,
            services_offered: userToSave.services_offered,
            specializations: userToSave.specializations,
            service_image: userToSave.service_image,
            base_location: userToSave.base_location,
            base_location_data: userToSave.base_location_data,
            hourly_rate: userToSave.hourly_rate,
            accepts_instant_bookings: userToSave.accepts_instant_bookings,
            service_radius_km: userToSave.service_radius_km,
            minimum_job_value: userToSave.minimum_job_value,
            verification_status: userToSave.verification_status,
            last_verified: userToSave.last_verified,
            service_areas: userToSave.service_areas,
            documents: userToSave.documents,
            reviews: userToSave.reviews,
            payments: userToSave.payments,
            average_rating: userToSave.average_rating,
          }
        })
      };

      const response = await axiosInstance.patch(`/users/${id}/admin_update/`, updatedUser, { headers: { 'Content-Type': 'application/json' } });
      
      if (response.status === 200) {
       showNotification({
        message: 'User updated successfully',
        type: 'Success',
        showHide: true,
       });
        await mutate(async (current: any) => current, {
          optimisticData: {
            ...(userResponse || {}),
            ...response.data,
          },
          revalidate: true,
          populateCache: true,
        });
        setIsEditing(false);
        setValidationErrors({});
        setError(null);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update user details. Please try again.';
      setError(errorMessage);
      console.error('Error updating user details:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    console.log("clicked")
    console.log("editedUser is null", editedUser)
    if (!editedUser) {
      console.log("editedUser is null", editedUser)
      return;
    }
    if (!validateUser(editedUser)) {
      console.log("validationErrors", validationErrors)
      console.log("editedUser for validation:", editedUser)
      return;
    }

    await handleSaveWithUser(editedUser);
  };

  const validateUser = (userData: Partial<UserAccount>): boolean => {
    const errors: Record<string, string> = {};
    
    // Basic validation
    if (!userData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(userData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!userData.first_name) {
      errors.first_name = 'First name is required';
    }
    
    if (!userData.last_name) {
      errors.last_name = 'Last name is required';
    }
    
    if (!userData.phone_number) {
      errors.phone_number = 'Phone number is required';
    }
    
    // Provider-specific validation - check flat structure
    if (userData.user_type === 'provider') {
      if (!userData.business_name) {
        errors['business_name'] = 'Business name is required for providers';
      }
      if (!userData.vat_number) {
        errors['vat_number'] = 'VAT number is required for providers';
      }
      if (!userData.base_location_data?.address) {
        errors['base_location_data'] = 'Base location is required for providers';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    if (!editedUser) return;
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      
      if (parent === 'provider_profile') {
        // Handle provider_profile nested fields
        setEditedUser({
          ...editedUser,
          provider_profile: {
            ...editedUser.provider_profile!,
            [child]: value
          }
        });
      } else {
        // Handle other nested fields
        const parentValue = editedUser[parent as keyof UserAccount];
        if (parentValue && typeof parentValue === 'object') {
          setEditedUser({
            ...editedUser,
            [parent]: {
              ...parentValue,
              [child]: value
            }
          });
        }
      }
    } else {
      // Special handling for user_type changes
      if (field === 'user_type') {
        setEditedUser({
          ...editedUser,
          [field]: value,
          // Reset provider profile when changing from provider to other types
          provider_profile: value === 'provider' ? editedUser.provider_profile : undefined
        });
      } else {
        setEditedUser({
          ...editedUser,
          [field]: value
        });
      }
    }
    
    // Clear any validation errors for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    if (!editedUser) return;
    setEditedUser({
      ...editedUser,
      notification_preferences: {
        ...editedUser.notification_preferences,
        [field]: value
      }
    });
  };

  // User Management Functions
  const handleSuspend = () => {
    setSelectedUser(user);
    setShowSuspendModal(true);
    setSuspensionReason(user.suspension_reason || '');
  };

  const handleConfirmSuspend = async () => {
    if (!selectedUser) return;
    
    try {
      setActionLoading(true);
      const newStatus = selectedUser.account_status === 'suspended' ? 'active' : 'suspended';
      
      await axiosInstance.patch(`/users/${selectedUser.id}/`, {
        account_status: newStatus,
        suspension_reason: suspensionReason,
      });

      // Update local state
      const updatedUser = {
        ...selectedUser,
        account_status: newStatus as AccountStatus,
        suspension_reason: suspensionReason,
      };
      setUser(updatedUser);
      setEditedUser(updatedUser);

      setShowSuspendModal(false);
      setSuspensionReason('');
      setSelectedUser(null);
      
      showNotification({
          message: `User ${newStatus === 'suspended' ? 'suspended' : 'reactivated'} successfully`,
          type: 'Success',
        showHide: true,
      });
    } catch (err) {
      setError('Failed to update user status. Please try again.');
      console.error('Error updating user status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    
    try {
      setActionLoading(true);
      await axiosInstance.delete(`/users/${selectedUser.id}/`);
      
      setShowDeleteModal(false);
      setSelectedUser(null);
      
      showNotification({
        message: 'User deleted successfully',
        type: 'Success',
        showHide: true,
      });
      
      // Navigate back to users list
      navigate('/admin/users');
    } catch (err) {
      setError('Failed to delete user. Please try again.');
      console.error('Error deleting user:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyUser = async () => {
    try {
      setActionLoading(true);
      await axiosInstance.patch(`/users/${user.id}/`, {
        account_status: 'active',
      });

      // Update local state
      const updatedUser = {
        ...user,
        account_status: 'active' as AccountStatus,
      };
      setUser(updatedUser);
      setEditedUser(updatedUser);
      
      showNotification({
        message: 'User verified successfully',
        type: 'Success',
        showHide: true,
      });
    } catch (err) {
      setError('Failed to verify user. Please try again.');
      console.error('Error verifying user:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateUser = () => {
    setSelectedUser(user);
    setShowActivateModal(true);
  };

  const handleConfirmActivate = async () => {
    if (!selectedUser) return;
    
    try {
      setActionLoading(true);
      await axiosInstance.patch(`/users/${selectedUser.id}/activate/`, {
        is_active: true,
        account_status: 'active',
      });

      // Update local state
      const updatedUser = {
        ...selectedUser,
        is_active: true,
        account_status: 'active' as AccountStatus,
      };
      setUser(updatedUser);
      setEditedUser(updatedUser);

      setShowActivateModal(false);
      setSelectedUser(null);
      
      showNotification({
        message: 'User activated successfully',
        type: 'Success',
        showHide: true,
      });
    } catch (err) {
      setError('Failed to activate user. Please try again.');
      console.error('Error activating user:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableUser = () => {
    setSelectedUser(user);
    setShowDeactivateModal(true);
    setDeactivationReason('');
  };

  const handleConfirmDeactivate = async () => {
    if (!selectedUser) return;
    
    try {
      setActionLoading(true);
      await axiosInstance.patch(`/users/${selectedUser.id}/deactivate`, {
        is_active: false,
        account_status: 'inactive',
        suspension_reason: deactivationReason,
      });

      // Update local state
      const updatedUser = {
        ...selectedUser,
        is_active: false,
        account_status: 'inactive' as AccountStatus,
        suspension_reason: deactivationReason,
      };
      setUser(updatedUser);
      setEditedUser(updatedUser);

      setShowDeactivateModal(false);
      setDeactivationReason('');
      setSelectedUser(null);
      
      showNotification({
        message: 'User deactivated successfully',
        type: 'Warning',
        showHide: true,
      });
    } catch (err) {
      setError('Failed to deactivate user. Please try again.');
      console.error('Error deactivating user:', err);
    } finally {
      setActionLoading(false);
    }
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

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold';
    
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'suspended':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'inactive':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const renderInput = (label: string, field: string, value: any, type: string = 'text', required: boolean = false) => {
    const error = validationErrors[field];
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {isEditing ? (
          <div>
            <input
              type={type}
              value={value || ''}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        ) : (
          <p className="text-gray-900">{value || 'N/A'}</p>
        )}
      </div>
    );
  };

  const renderSelect = (label: string, field: string, value: string, options: string[], required: boolean = false) => {
    const error = validationErrors[field];
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {isEditing ? (
          <div>
            <select
              value={value}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {options.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        ) : (
          <p className="text-gray-900 capitalize">{value || 'N/A'}</p>
        )}
      </div>
    );
  };

  // Convert from nested structure to flat structure for child components
  const convertToFlatUser = (user: UserAccount): any => {
    return {
      ...user,
      // Flatten provider_profile fields to top level for backward compatibility
      business_name: user.provider_profile?.company_name || '',
      business_address: user.provider_profile?.address_line1 || '',
      vat_number: user.provider_profile?.vat_number || '',
      company_registration_number: user.provider_profile?.company_reg_number || '',
      number_of_vehicles: user.provider_profile?.vehicle_count || 0,
      number_of_completed_bookings: user.provider_profile?.completed_bookings_count || 0,
      rating: parseFloat(user.rating) || 0,
      last_active: user.last_active || '',
      groups: user.groups || [],
      user_permissions: user.user_permissions || [],
      roles: user.roles || [],
      activities: user.user_activities || [],
      device_tokens: user.device_tokens || [],
      is_staff: user.is_staff || false,
      is_superuser: user.is_superuser || false,
      two_factor_enabled: user.two_factor_enabled || false,
      two_factor_method: user.two_factor_method || null,
      // Add missing properties that child components expect
      notification_preferences: user.notification_preferences || {
        email: false,
        sms: false,
        push: false,
        marketing: false
      },
      user_addresses: user.user_addresses,
      bins: user.bins || [],
      // Add provider-specific fields
      business_type: user.provider_profile?.business_type || '',
      vat_registered: user.provider_profile?.vat_registered || false,
      business_description: user.provider_profile?.business_description || '',
      website: user.provider_profile?.website || '',
      founded_year: user.provider_profile?.founded_year || null,
      operating_areas: user.provider_profile?.operating_areas || [],
      service_categories: user.provider_profile?.service_categories || [],
      services_offered: user.provider_profile?.services_offered || [],
      specializations: user.provider_profile?.specializations || [],
      service_image: user.provider_profile?.service_image || null,
      base_location: user.provider_profile?.base_location || null,
      base_location_data: user.provider_profile?.base_location_data || null,
      hourly_rate: user.provider_profile?.hourly_rate || null,
      accepts_instant_bookings: user.provider_profile?.accepts_instant_bookings || false,
      service_radius_km: user.provider_profile?.service_radius_km || 0,
      minimum_job_value: user.provider_profile?.minimum_job_value || null,
      verification_status: user.provider_profile?.verification_status || 'unverified',
      last_verified: user.provider_profile?.last_verified || null,
      service_areas: user.provider_profile?.service_areas || [],
      documents: user.provider_profile?.documents || [],
      reviews: user.provider_profile?.reviews || [],
      payments: user.provider_profile?.payments || [],
      average_rating: user.provider_profile?.average_rating || 0,
      vehicle_count: user.provider_profile?.vehicle_count || 0,
    };
  };

  // Convert from flat structure back to nested structure
  const convertFromFlatUser = (flatUser: any): UserAccount => {
    return {
      ...user,
      ...flatUser,
      rating: flatUser.rating?.toString() || '0.00',
      last_active: flatUser.last_active || null,
      groups: flatUser.groups || [],
      user_permissions: flatUser.user_permissions || [],
      roles: flatUser.roles || [],
      user_activities: flatUser.activities || [],
      device_tokens: flatUser.device_tokens || [],
      is_staff: flatUser.is_staff || false,
      is_superuser: flatUser.is_superuser || false,
      two_factor_enabled: flatUser.two_factor_enabled || false,
      two_factor_method: flatUser.two_factor_method || null,
      // Update provider_profile if it exists
      ...(flatUser.user_type === 'provider' && {
        provider_profile: {
          ...user.provider_profile,
          company_name: flatUser.business_name,
          address_line1: flatUser.business_address,
          vat_number: flatUser.vat_number,
          company_reg_number: flatUser.company_registration_number,
          completed_bookings_count: flatUser.number_of_completed_bookings,
          business_type: flatUser.business_type,
          vat_registered: flatUser.vat_registered,
          business_description: flatUser.business_description,
          website: flatUser.website,
          founded_year: flatUser.founded_year,
          operating_areas: flatUser.operating_areas,
          service_categories: flatUser.service_categories,
          services_offered: flatUser.services_offered,
          specializations: flatUser.specializations,
          service_image: flatUser.service_image,
          base_location: flatUser.base_location,
          base_location_data: flatUser.base_location_data,
          hourly_rate: flatUser.hourly_rate,
          accepts_instant_bookings: flatUser.accepts_instant_bookings,
          service_radius_km: flatUser.service_radius_km,
          minimum_job_value: flatUser.minimum_job_value,
          verification_status: flatUser.verification_status,
          last_verified: flatUser.last_verified,
          service_areas: flatUser.service_areas,
          documents: flatUser.documents,
          reviews: flatUser.reviews,
          payments: flatUser.payments,
          average_rating: flatUser.average_rating,
          vehicle_count: flatUser.vehicle_count,
        }
      })
    };
  };

  const handleOverviewSave = (updatedUser: any) => {
    console.log("handleOverviewSave called with:", updatedUser);
    
    // Validate the flat structure data directly
    if (!validateUser(updatedUser)) {
      console.log("validationErrors", validationErrors);
      console.log("updatedUser for validation:", updatedUser);
      return;
    }
    
    const convertedUser = convertFromFlatUser(updatedUser);
    console.log("convertedUser:", convertedUser);
    setEditedUser(convertedUser);
    
    // Now call the actual save with the converted user
    handleSaveWithUser(convertedUser);
  };

  const handleOverviewCancel = () => {
    setIsEditing(false);
    setEditedUser(user);
  };

  const handleSecuritySave = (updatedUser: UserAccount) => {
    setUser(updatedUser);
    setEditedUser(updatedUser);
    setIsEditing(false);
  };
  const handleSecurityCancel = () => {
    setIsEditing(false);
  };

  const handlePermissionsSave = (updatedUser: UserAccount) => {
    setUser(updatedUser);
    setEditedUser(updatedUser);
    setIsEditing(false);
  };
  const handlePermissionsCancel = () => {
    setIsEditing(false);
  };

  const handleNotificationsSave = (updatedUser: UserAccount) => {
    setUser(updatedUser);
    setEditedUser(updatedUser);
    setIsEditing(false);
  };
  const handleNotificationsCancel = () => {
    setIsEditing(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <UserOverview
            user={convertToFlatUser(isEditing ? editedUser : user)}
            setUser={(updatedUser: any) => {
              const convertedUser = convertFromFlatUser(updatedUser);
              if (isEditing) {
                setEditedUser(convertedUser);
              } else {
                setUser(convertedUser);
              }
            }}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onSave={handleOverviewSave}
            onCancel={handleOverviewCancel}
            validationErrors={validationErrors}
          />
        );
      case 'security':
        return (
          <UserSecurity
            user={convertToFlatUser(user)}
            isEditing={isEditing}
            onSave={(updatedUser: any) => {
              const convertedUser = convertFromFlatUser(updatedUser);
              handleSecuritySave(convertedUser);
            }}
            onCancel={handleSecurityCancel}
          />
        );
      case 'permissions':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Access & Roles</h3>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isEditing ? editedUser.is_staff : user.is_staff}
                    onChange={(e) => isEditing && setEditedUser({ ...editedUser, is_staff: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700">Is staff (admin site access)</span>
                </label>
                <button
                  onClick={async () => {
                    setGroupsLoading(true);
                    try {
                      const gs = await groupService.getAll();
                      setAllGroups(gs);
                      setSelectedGroupIds([]);
                      setShowManageGroups(true);
                    } finally {
                      setGroupsLoading(false);
                    }
                  }}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                  title="Manage user groups"
                >
                  Manage Groups
                </button>
              </div>
            </div>

            <UserPermissions
              user={convertToFlatUser(user)}
              isEditing={isEditing}
              onSave={(updatedUser: any) => {
                const convertedUser = convertFromFlatUser(updatedUser);
                handlePermissionsSave(convertedUser);
              }}
              onCancel={handlePermissionsCancel}
            />
          </div>
        );
      case 'notifications':
        return (
          <UserNotifications
            user={convertToFlatUser(user)}
            isEditing={isEditing}
            onSave={(updatedUser: any) => {
              const convertedUser = convertFromFlatUser(updatedUser);
              handleNotificationsSave(convertedUser);
            }}
            onCancel={handleNotificationsCancel}
          />
        );
      case 'activity':
        return (
          <UserActivity
            user={convertToFlatUser(user)}
          />
        );
      default:
        return null;
    }
  };

  const renderActivityIcon = (activity: UserActivity) => {
    const IconComponent = activity.icon || History;
    return <IconComponent className="w-5 h-5 text-blue-500" />;
  };

  // Manage Groups Modal state and handlers
  const availableGroups = allGroups.filter(
    (g) => !(user.groups || []).some((ug: any) => ug.id === g.id)
  );

  const handleAddUserToGroups = async () => {
    if (!user?.id || selectedGroupIds.length === 0) return;
    try {
      setActionLoading(true);
      for (const gid of selectedGroupIds) {
        await groupService.addUsers(gid, [user.id]);
      }
      showNotification({ title: 'Success', message: 'User added to selected groups', color: 'green' });
      await mutate();
      setShowManageGroups(false);
      setSelectedGroupIds([]);
    } catch (e) {
      setError('Failed to update groups');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <IconLoader />
      </div>
    );
  }
  
  if (error || !user) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="text-red-500">{error || 'User not found'}</div>
        <button
          onClick={fetchUserDetails}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="px-4 py-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Link to="/admin/users" className="text-blue-600 hover:text-blue-800 mr-4">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-xl font-semibold">{user.first_name} {user.last_name}</h2>
          </div>
          <div className="flex gap-2">
            {/* Status Badge */}
            <span className={`${getStatusBadge(user.account_status)} flex items-center px-3 py-2`}>
              {user.is_active ? (
                <UserCheck className="w-4 h-4 mr-2" />
              ) : (
                <UserX className="w-4 h-4 mr-2" />
              )}
              {user.is_active ? "Active" : "Inactive"}
            </span>

            {/* Action Buttons */}
            {!isEditing && (
              <>
                {user.account_status === 'pending' && (
                  <button
                    onClick={handleVerifyUser}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center disabled:opacity-50"
                    title="Verify User"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Verify
                  </button>
                )}
                {!user.is_active && (
                  <button
                    onClick={handleActivateUser}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center disabled:opacity-50"
                    title="Activate User"
                  >
                    <Power className="w-4 h-4 mr-2" />
                    Activate
                  </button>
                )}
                {user.is_active && (
                  <button
                    onClick={handleDisableUser}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 flex items-center disabled:opacity-50"
                    title="Disable User"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Disable
                  </button>
                )}
                <button
                  onClick={handleSuspend}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center disabled:opacity-50"
                  title={user.account_status === 'suspended' ? 'Reactivate User' : 'Suspend User'}
                >
                  {user.account_status === 'suspended' ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Reactivate
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Suspend
                    </>
                  )}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center disabled:opacity-50"
                  title="Delete User"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
                <button
                  onClick={handleEdit}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center disabled:opacity-50"
                  title="Edit User"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={() => mutate()}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center disabled:opacity-50"
                  title="Refresh User"
                >
                  <RefreshCcw className="w-4 h-4" />
                  
                </button>
              </>
            )}
            {isEditing && activeTab !== 'overview' && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center ${saving ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className={`px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center ${saving ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-4 border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'permissions', label: 'Roles & Permissions', icon: Lock },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'activity', label: 'Activity', icon: History }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Suspend/Reactivate Modal */}
      {showSuspendModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {selectedUser.account_status === 'suspended' ? 'Reactivate User Account' : 'Suspend User Account'}
            </h3>

            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {selectedUser.account_status === 'suspended'
                  ? 'Are you sure you want to reactivate this user account?'
                  : 'Are you sure you want to suspend this user account? Please provide a reason:'}
              </p>

              {selectedUser.account_status !== 'suspended' && (
                <textarea
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="Enter reason for suspension..."
                />
              )}

              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <p className="font-semibold text-gray-900 dark:text-white mb-2">User Details:</p>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.id})
                  </p>
                  <p>{selectedUser.email}</p>
                  <p className="capitalize">{selectedUser.user_type}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedUser(null);
                  setSuspensionReason('');
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors ${
                  selectedUser.account_status === 'suspended' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
                }`}
                onClick={handleConfirmSuspend}
                disabled={actionLoading || (selectedUser.account_status !== 'suspended' && !suspensionReason.trim())}
              >
                {actionLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {selectedUser.account_status === 'suspended' ? 'Reactivating...' : 'Suspending...'}
                  </>
                ) : (
                  selectedUser.account_status === 'suspended' ? 'Reactivate' : 'Suspend'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Delete User Account</h3>

            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to permanently delete this user account? This action cannot be undone.
              </p>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <p className="font-semibold text-red-900 dark:text-red-400 mb-2">User Details:</p>
                <div className="space-y-1 text-sm text-red-700 dark:text-red-300">
                  <p>
                    {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.id})
                  </p>
                  <p>{selectedUser.email}</p>
                  <p className="capitalize">{selectedUser.user_type}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50" 
                onClick={handleConfirmDelete}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Deleting...
                  </>
                  ) : (
                    'Delete Permanently'
                  )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activate Modal */}
      {showActivateModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Activate User Account</h3>

            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to activate this user account? The user will be able to access the system again.
              </p>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <p className="font-semibold text-green-900 dark:text-green-400 mb-2">User Details:</p>
                <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                  <p>
                    {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.id})
                  </p>
                  <p>{selectedUser.email}</p>
                  <p className="capitalize">{selectedUser.user_type}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => {
                  setShowActivateModal(false);
                  setSelectedUser(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50"
                onClick={handleConfirmActivate}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Activating...
                  </>
                ) : (
                  'Activate User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      {showDeactivateModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Deactivate User Account</h3>

            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to deactivate this user account? Please provide a reason for deactivation:
              </p>

              <textarea
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                placeholder="Enter reason for deactivation..."
              />

              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <p className="font-semibold text-yellow-900 dark:text-yellow-400 mb-2">User Details:</p>
                <div className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>
                    {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.id})
                  </p>
                  <p>{selectedUser.email}</p>
                  <p className="capitalize">{selectedUser.user_type}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => {
                  setShowDeactivateModal(false);
                  setSelectedUser(null);
                  setDeactivationReason('');
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50"
                onClick={handleConfirmDeactivate}
                disabled={actionLoading || !deactivationReason.trim()}
              >
                {actionLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Deactivating...
                  </>
                ) : (
                  'Deactivate User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Manage Groups Modal */}
      {showManageGroups && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Manage Groups</h3>
              <button onClick={() => setShowManageGroups(false)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Select groups to add this user to:</p>
              <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                {groupsLoading ? (
                  <div className="text-sm text-gray-500">Loading groups...</div>
                ) : availableGroups.length > 0 ? (
                  availableGroups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedGroupIds.includes(g.id)}
                        onChange={(e) => {
                          setSelectedGroupIds((prev) =>
                            e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)
                          );
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200">{g.name}</span>
                    </label>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">No available groups to add.</div>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowManageGroups(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleAddUserToGroups}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm disabled:opacity-50"
                disabled={actionLoading || selectedGroupIds.length === 0}
              >
                {actionLoading ? 'Saving...' : 'Add to Groups'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserView;