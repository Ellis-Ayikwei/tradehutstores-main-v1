import React, { useState, useEffect } from 'react';
import { Key, Mail, Eye, EyeOff, CheckCircle2, X, Shield, Smartphone, Phone, History, UserCheck, UserX, Clock, Send, Eye as ViewIcon, RefreshCw, Wrench, Copy, Check } from 'lucide-react';
import axiosInstance from '../../../../services/axiosInstance';
import { showNotification } from '@mantine/notifications';
import useSWR from 'swr';

interface SecurityEvent {
  type: string;
  date: string;
  ipAddress?: string;
  deviceInfo?: string;
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
  user_addresses?: any;
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
  securityHistory?: SecurityEvent[];
  preferences?: any;
}

interface UserSecurityProps {
  user: UserAccount;
  isEditing: boolean;
  onSave: (user: UserAccount) => void;
  onCancel: () => void;
}

const UserSecurity: React.FC<UserSecurityProps> = ({ user, isEditing, onSave, onCancel }) => {
  // State
  const [sessionTimeout, setSessionTimeout] = useState(user.sessionTimeout || 30);
  const [loginAlerts, setLoginAlerts] = useState(user.loginAlerts || false);
  const [allowedIPs, setAllowedIPs] = useState<string[]>(user.allowedIPs || []);
  const [newIP, setNewIP] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    newPassword: string[];
    confirmPassword: string[];
  }>({
    newPassword: [],
    confirmPassword: []
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.two_factor_enabled);
  const [twoFactorMethod, setTwoFactorMethod] = useState(user.two_factor_method);
  
  // OTP Management State
  const [showOtpData, setShowOtpData] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);

  // SWR for OTP polling
  const { data: otpData, error: otpError, mutate: mutateOtp } = useSWR(
    showOtpData ? `/auth/admin/users/${user.id}/otps/` : null,
    async (url: string) => {
      const response = await axiosInstance.get(url);
      return {
        login_otp: response.data.otps.login?.otp_code || null,
        verify_otp: response.data.otps.signup?.otp_code || null,
        login_otp_expires: response.data.otps.login?.expires_at || null,
        verify_otp_expires: response.data.otps.signup?.expires_at || null,
        total_active_otps: response.data.total_active_otps
      };
    },
    {
      refreshInterval: showOtpData ? 5000 : 0, // Poll every 5 seconds when showing OTP data
      revalidateOnFocus: true,
      dedupingInterval: 2000
    }
  );

  useEffect(() => {
    setSessionTimeout(user.sessionTimeout || 30);
    setLoginAlerts(user.loginAlerts || false);
    setAllowedIPs(user.allowedIPs || []);
    setTwoFactorEnabled(user.two_factor_enabled);
    setTwoFactorMethod(user.two_factor_method);
  }, [user]);

  // Password validation
  const validatePassword = (password: string) => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!password.match(/[A-Z]/)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!password.match(/[a-z]/)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!password.match(/[0-9]/)) {
      errors.push('Password must contain at least one number');
    }
    if (!password.match(/[^A-Za-z0-9]/)) {
      errors.push('Password must contain at least one special character');
    }
    
    return errors;
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^A-Za-z0-9]/)) strength++;
    return strength;
  };

  const validateConfirmPassword = (confirm: string, original: string) => {
    const errors: string[] = [];
    
    if (confirm !== original) {
      errors.push('Passwords do not match');
    }
    
    return errors;
  };

  const handlePasswordChange = async () => {
    // Clear previous errors
    setError(null);
    setPasswordErrors({ newPassword: [], confirmPassword: [] });

    // Validate new password
    const newPasswordErrors = validatePassword(newPassword);
    const confirmPasswordErrors = validateConfirmPassword(confirmPassword, newPassword);

    if (newPasswordErrors.length > 0 || confirmPasswordErrors.length > 0) {
      setPasswordErrors({
        newPassword: newPasswordErrors,
        confirmPassword: confirmPasswordErrors
      });
      return;
    }

    try {
      setSaving(true);
      await axiosInstance.post(`/users/${user.id}/admin_change_password/`, {
        new_password: newPassword
      });
      setShowPasswordForm(false);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({ newPassword: [], confirmPassword: [] });
      showNotification({
        title: 'Success',
        message: 'Password changed successfully',
        color: 'green'
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendResetPasswordLink = async () => {
    try {
      await axiosInstance.post(`/users/${user.id}/send_reset_password_link/`);
      showNotification({
        title: 'Success',
        message: 'Reset password link sent successfully',
        color: 'green'
      });
    } catch (err) {
      setError('Failed to send reset password link. Please try again.');
    }
  };

  // 2FA
  const handleToggle2FA = async (enabled: boolean) => {
    try {
      await axiosInstance.post(`/users/${user.id}/toggle-2fa/`, { enabled });
      setTwoFactorEnabled(enabled);
      setTwoFactorMethod(enabled ? twoFactorMethod || 'email' : null);
    } catch (err) {
      setError('Failed to update 2FA settings. Please try again.');
    }
  };

  const handle2FAMethodChange = async (method: '2fa_app' | 'sms' | 'email') => {
    try {
      await axiosInstance.post(`/users/${user.id}/update-2fa-method/`, { method });
      setTwoFactorMethod(method);
    } catch (err) {
      setError('Failed to update 2FA method. Please try again.');
    }
  };

  // IP Allowlist
  const isValidIP = (ip: string) => /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/.test(ip);
  const handleAddIP = () => {
    if (newIP && isValidIP(newIP) && !allowedIPs.includes(newIP)) {
      setAllowedIPs([...allowedIPs, newIP]);
      setNewIP('');
    }
  };
  const handleRemoveIP = (index: number) => {
    setAllowedIPs(allowedIPs.filter((_, i) => i !== index));
  };

  // User Activation/Verification
  const handleActivateUser = async () => {
    try {
      setOtpLoading(true);
      await axiosInstance.post(`/users/${user.id}/activate/`);
      showNotification({
        title: 'Success',
        message: 'User activated successfully',
        color: 'green'
      });
      // Refresh user data
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to activate user');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleDeactivateUser = async () => {
    try {
      setOtpLoading(true);
      await axiosInstance.post(`/users/${user.id}/deactivate/`);
      showNotification({
        title: 'Success',
        message: 'User deactivated successfully',
        color: 'green'
      });
      // Refresh user data
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate user');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyUser = async () => {
    try {
      setOtpLoading(true);
      // Use the new verify endpoint
      await axiosInstance.post(`/users/${user.id}/verify/`);
      showNotification({
        title: 'Success',
        message: 'User verified successfully',
        color: 'green'
      });
      // Refresh user data
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify user');
    } finally {
      setOtpLoading(false);
    }
  };

  // Copy to clipboard function with fallback
  const copyToClipboard = async (text: string, otpType: string) => {
    try {
      // Try modern clipboard API first (requires secure context)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          setCopiedOtp(otpType);
          showNotification({
            title: 'Copied!',
            message: `${otpType} OTP copied to clipboard`,
            color: 'green'
          });
          setTimeout(() => setCopiedOtp(null), 2000);
          return;
        } catch (clipboardError) {
          // Fall through to fallback method
          console.warn('Clipboard API failed, trying fallback:', clipboardError);
        }
      }

      // Fallback: Create a temporary textarea element
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopiedOtp(otpType);
          showNotification({
            title: 'Copied!',
            message: `${otpType} OTP copied to clipboard`,
            color: 'green'
          });
          setTimeout(() => setCopiedOtp(null), 2000);
        } else {
          throw new Error('execCommand copy failed');
        }
      } catch (fallbackError) {
        throw new Error('Both clipboard methods failed');
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (err: any) {
      console.error('Copy to clipboard failed:', err);
      showNotification({
        title: 'Error',
        message: 'Failed to copy to clipboard. Please copy manually.',
        color: 'red'
      });
    }
  };

  // OTP Management Functions
  const handleViewOTPs = async () => {
    try {
      setOtpLoading(true);
      setShowOtpData(true);
      await mutateOtp(); // Trigger initial fetch
      showNotification({
        title: 'Success',
        message: 'OTP data loaded successfully',
        color: 'green'
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch OTP data');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleGenerateLoginOTP = async () => {
    try {
      setOtpLoading(true);
      // Use existing admin OTP send endpoint
      const response = await axiosInstance.post('/auth/admin/otp/send/', {
        user_id: user.id,
        otp_type: 'login'
      });
      showNotification({
        title: 'Success',
        message: 'Login OTP generated and sent successfully',
        color: 'green'
      });
      // Refresh OTP data
      await mutateOtp();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate login OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleGenerateVerifyOTP = async () => {
    try {
      setOtpLoading(true);
      // Use existing admin OTP send endpoint with signup type for verification
      const response = await axiosInstance.post('/auth/admin/otp/send/', {
        user_id: user.id,
        otp_type: 'signup'
      });
      showNotification({
        title: 'Success',
        message: 'Verify OTP generated and sent successfully',
        color: 'green'
      });
      // Refresh OTP data
      await mutateOtp();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate verify OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSendLoginOTP = async () => {
    try {
      setOtpLoading(true);
      // Use existing admin OTP send endpoint
      await axiosInstance.post('/auth/admin/otp/send/', {
        user_id: user.id,
        otp_type: 'login'
      });
      showNotification({
        title: 'Success',
        message: 'Login OTP sent to user email successfully',
        color: 'green'
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send login OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSendVerifyOTP = async () => {
    try {
      setOtpLoading(true);
      // Use existing admin OTP send endpoint with signup type for verification
      await axiosInstance.post('/auth/admin/otp/send/', {
        user_id: user.id,
        otp_type: 'signup'
      });
      showNotification({
        title: 'Success',
        message: 'Verify OTP sent to user email successfully',
        color: 'green'
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send verify OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // Additional OTP Functions
  const handleSendPasswordResetOTP = async () => {
    try {
      setOtpLoading(true);
      await axiosInstance.post('/auth/admin/otp/send/', {
        user_id: user.id,
        otp_type: 'password_reset'
      });
      showNotification({
        title: 'Success',
        message: 'Password reset OTP sent to user email successfully',
        color: 'green'
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send password reset OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSendEmailChangeOTP = async () => {
    try {
      setOtpLoading(true);
      await axiosInstance.post('/auth/admin/otp/send/', {
        user_id: user.id,
        otp_type: 'email_change'
      });
      showNotification({
        title: 'Success',
        message: 'Email change OTP sent to user email successfully',
        color: 'green'
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send email change OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSendPhoneChangeOTP = async () => {
    try {
      setOtpLoading(true);
      await axiosInstance.post('/auth/admin/otp/send/', {
        user_id: user.id,
        otp_type: 'phone_change'
      });
      showNotification({
        title: 'Success',
        message: 'Phone change OTP sent to user email successfully',
        color: 'green'
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send phone change OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResetOTPLimits = async (otpType: string) => {
    try {
      setOtpLoading(true);
      await axiosInstance.post('/auth/admin/otp/reset-limits/', {
        user_id: user.id,
        otp_type: otpType
      });
      showNotification({
        title: 'Success',
        message: 'Otp Reset Successful',
        color: 'green'
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send phone change OTP');
    } finally {
      setOtpLoading(false);
    }


  }

  // Save security settings
  const handleSave = () => {
    const updatedUser = {
      ...user,
      sessionTimeout,
      loginAlerts,
      allowedIPs,
      two_factor_enabled: twoFactorEnabled,
      two_factor_method: twoFactorMethod
    };
    onSave(updatedUser);
  };

  // Format date
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

  return (
    <div className="space-y-6">
      {/* Password Management */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold flex items-center">
            <Key className="w-5 h-5 mr-2" /> Password Management
          </h3>
        </div>
        <div className="p-6">
          {!showPasswordForm && (
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Last changed: {user.last_password_change ? formatDate(user.last_password_change) : 'Never'}</p>
                {user.password_expires_at && (
                  <p className="text-sm text-gray-600">Expires: {formatDate(user.password_expires_at)}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                >
                  <Key className="w-4 h-4 mr-2" /> Change Password
                </button>
                <button
                  onClick={handleSendResetPasswordLink}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center"
                >
                  <Mail className="w-4 h-4 mr-2" /> Send Reset Password Link
                </button>
              </div>
            </div>
          )}
          {showPasswordForm && (
            <div className="space-y-4 mt-4 relative">
              {saving && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="font-medium">Updating password...</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => {
                      const value = e.target.value;
                      setNewPassword(value);
                      setPasswordStrength(calculatePasswordStrength(value));
                      
                      // Real-time validation
                      const errors = validatePassword(value);
                      setPasswordErrors(prev => ({ ...prev, newPassword: errors }));
                    }}
                    className={`w-full p-2 border rounded pr-10 ${
                      passwordErrors.newPassword.length > 0 ? 'border-red-500 focus:border-red-500' : ''
                    } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(v => !v)}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:text-gray-700'}`}
                    tabIndex={-1}
                    disabled={saving}
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="mt-2 flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-full rounded ${
                        i < passwordStrength
                          ? passwordStrength < 2
                            ? 'bg-red-500'
                            : passwordStrength < 4
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                {passwordErrors.newPassword.length > 0 && (
                  <div className="mt-2">
                    {passwordErrors.newPassword.map((error, index) => (
                      <p key={index} className="text-sm text-red-600 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {error}
                      </p>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Password must contain at least 8 characters, including uppercase, numbers, and special characters
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => {
                      const value = e.target.value;
                      setConfirmPassword(value);
                      
                      // Real-time validation for confirm password
                      const errors = validateConfirmPassword(value, newPassword);
                      setPasswordErrors(prev => ({ ...prev, confirmPassword: errors }));
                    }}
                    className={`w-full p-2 border rounded pr-10 ${
                      passwordErrors.confirmPassword.length > 0 ? 'border-red-500 focus:border-red-500' : ''
                    } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:text-gray-700'}`}
                    tabIndex={-1}
                    disabled={saving}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordErrors.confirmPassword.length > 0 && (
                  <div className="mt-2">
                    {passwordErrors.confirmPassword.map((error, index) => (
                      <p key={index} className="text-sm text-red-600 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePasswordChange}
                  disabled={saving || passwordErrors.newPassword.length > 0 || passwordErrors.confirmPassword.length > 0}
                  className={`px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center min-w-[140px] transition-all duration-200 ${
                    saving || passwordErrors.newPassword.length > 0 || passwordErrors.confirmPassword.length > 0
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      <span className="font-medium">Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      <span className="font-medium">Update Password</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordErrors({ newPassword: [], confirmPassword: [] });
                    setError(null);
                  }}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Two-Factor Authentication */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold flex items-center">
            <Shield className="w-5 h-5 mr-2" /> Two-Factor Authentication
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">2FA Status</h4>
              <p className="text-sm text-gray-500">
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                {twoFactorMethod && ` (${twoFactorMethod.replace('_', ' ').toUpperCase()})`}
              </p>
            </div>
            <button
              onClick={() => handleToggle2FA(!twoFactorEnabled)}
              className={`px-4 py-2 ${
                twoFactorEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              } text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${
                twoFactorEnabled ? 'red' : 'green'
              }-500 flex items-center`}
            >
              {twoFactorEnabled ? (
                <X className="w-4 h-4 mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>
          {twoFactorEnabled && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">2FA Method</label>
              <div className="flex gap-3">
                <button
                  onClick={() => handle2FAMethodChange('2fa_app')}
                  className={`px-4 py-2 rounded-md ${
                    twoFactorMethod === '2fa_app'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Smartphone className="w-4 h-4 mr-2" /> Authenticator App
                </button>
                <button
                  onClick={() => handle2FAMethodChange('sms')}
                  className={`px-4 py-2 rounded-md ${
                    twoFactorMethod === 'sms'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Phone className="w-4 h-4 mr-2" /> SMS
                </button>
                <button
                  onClick={() => handle2FAMethodChange('email')}
                  className={`px-4 py-2 rounded-md ${
                    twoFactorMethod === 'email'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Mail className="w-4 h-4 mr-2" /> Email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Activation & Verification */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold flex items-center">
            <UserCheck className="w-5 h-5 mr-2" /> User Management
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <h4 className="font-medium mb-2">Account Status</h4>
              <p className={`text-sm px-3 py-1 rounded-full inline-block ${
                user.account_status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : user.account_status === 'suspended'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user.account_status.toUpperCase()}
              </p>
            </div>
            <div className="text-center">
              <h4 className="font-medium mb-2">Verification Status</h4>
              <p className={`text-sm px-3 py-1 rounded-full inline-block ${
                user.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {user.is_active ? 'VERIFIED' : 'UNVERIFIED'}
              </p>
            </div>
            <div className="text-center">
              <h4 className="font-medium mb-2">User Type</h4>
              <p className="text-sm px-3 py-1 rounded-full inline-block bg-blue-100 text-blue-800">
                {user.user_type.toUpperCase()}
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {user.account_status === 'active' ? (
              <button
                onClick={handleDeactivateUser}
                disabled={otpLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center disabled:opacity-50"
              >
                <UserX className="w-4 h-4 mr-2" />
                {otpLoading ? 'Processing...' : 'Deactivate User'}
              </button>
            ) : (
              <button
                onClick={handleActivateUser}
                disabled={otpLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                {otpLoading ? 'Processing...' : 'Activate User'}
              </button>
            )}
            
            <button
              onClick={handleVerifyUser}
              disabled={otpLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {otpLoading ? 'Processing...' : 'Verify User'}
            </button>
          </div>
        </div>
      </div>

      {/* OTP Management */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold flex items-center">
            <Clock className="w-5 h-5 mr-2" /> OTP Management
          </h3>
        </div>
        <div className="p-6">
          {/* View OTPs Button */}
          <div className="mb-6">
            <button
              onClick={handleViewOTPs}
              disabled={otpLoading}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center disabled:opacity-50"
            >
              <ViewIcon className="w-4 h-4 mr-2" />
              {otpLoading ? 'Loading...' : 'View Current OTPs'}
            </button>
          </div>

          {/* OTP Display */}
          {showOtpData && (
            <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-lg text-gray-800 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-600" />
                  Current OTPs
                </h4>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Live Updates</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Login OTP */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                    <h5 className="text-sm font-semibold text-white flex items-center">
                      <Key className="w-4 h-4 mr-2" />
                      Login OTP
                    </h5>
                  </div>
                  <div className="p-4">
                    {otpData?.login_otp ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-2xl font-bold text-gray-800 tracking-wider">
                            {otpData.login_otp}
                          </p>
                          <button
                            onClick={() => copyToClipboard(otpData.login_otp!, 'Login')}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                              copiedOtp === 'Login'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title="Copy to clipboard"
                          >
                            {copiedOtp === 'Login' ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {otpData.login_otp_expires && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>Expires: {formatDate(otpData.login_otp_expires)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <X className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">No active login OTP</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verify OTP */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3">
                    <h5 className="text-sm font-semibold text-white flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Verify OTP
                    </h5>
                  </div>
                  <div className="p-4">
                    {otpData?.verify_otp ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-2xl font-bold text-gray-800 tracking-wider">
                            {otpData.verify_otp}
                          </p>
                          <button
                            onClick={() => copyToClipboard(otpData.verify_otp!, 'Verify')}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                              copiedOtp === 'Verify'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title="Copy to clipboard"
                          >
                            {copiedOtp === 'Verify' ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {otpData.verify_otp_expires && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>Expires: {formatDate(otpData.verify_otp_expires)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <X className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">No active verify OTP</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* OTP Status Summary */}
              {otpData && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Active OTPs:</span>
                    <span className="font-semibold text-blue-600">
                      {otpData.total_active_otps || 0}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OTP Actions */}
          <div className="space-y-6">
            {/* Login OTP Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Key className="w-5 h-5 mr-2 text-blue-600" />
                Login OTP Actions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={handleGenerateLoginOTP}
                  disabled={otpLoading}
                  className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${otpLoading ? 'animate-spin' : ''}`} />
                  {otpLoading ? 'Generating...' : 'Generate Login OTP'}
                </button>
                <button
                  onClick={handleSendLoginOTP}
                  disabled={otpLoading}
                  className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-center disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Send className={`w-4 h-4 mr-2 ${otpLoading ? 'animate-pulse' : ''}`} />
                  {otpLoading ? 'Sending...' : 'Send Login OTP'}
                </button>
                <button
                  onClick={() => handleResetOTPLimits("login")}
                  disabled={otpLoading}
                  className="px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-center disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Wrench className={`w-4 h-4 mr-2 ${otpLoading ? 'animate-pulse' : ''}`} />
                  {otpLoading ? 'Resetting...' : 'Reset OTP Limit'}
                </button>
              </div>
            </div>

            {/* Verify OTP Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2 text-purple-600" />
                Verify OTP Actions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={handleGenerateVerifyOTP}
                  disabled={otpLoading}
                  className="px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${otpLoading ? 'animate-spin' : ''}`} />
                  {otpLoading ? 'Generating...' : 'Generate Verify OTP'}
                </button>
                <button
                  onClick={handleSendVerifyOTP}
                  disabled={otpLoading}
                  className="px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-center disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Send className={`w-4 h-4 mr-2 ${otpLoading ? 'animate-pulse' : ''}`} />
                  {otpLoading ? 'Sending...' : 'Send Verify OTP'}
                </button>
                <button
                  onClick={() => handleResetOTPLimits("sign_up")}
                  disabled={otpLoading}
                  className="px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 flex items-center justify-center disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Wrench className={`w-4 h-4 mr-2 ${otpLoading ? 'animate-pulse' : ''}`} />
                  {otpLoading ? 'Resetting...' : 'Reset OTP Limit'}
                </button>
              </div>
            </div>

            {/* Additional OTP Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Password Reset OTP */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Key className="w-4 h-4 mr-2 text-red-600" />
                  Password Reset
                </h4>
                <button
                  onClick={handleSendPasswordResetOTP}
                  disabled={otpLoading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Send className={`w-4 h-4 mr-2 ${otpLoading ? 'animate-pulse' : ''}`} />
                  {otpLoading ? 'Sending...' : 'Send Reset OTP'}
                </button>
              </div>

              {/* Email Change OTP */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-indigo-600" />
                  Email Change
                </h4>
                <button
                  onClick={handleSendEmailChangeOTP}
                  disabled={otpLoading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Send className={`w-4 h-4 mr-2 ${otpLoading ? 'animate-pulse' : ''}`} />
                  {otpLoading ? 'Sending...' : 'Send Email OTP'}
                </button>
              </div>

              {/* Phone Change OTP */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-teal-600" />
                  Phone Change
                </h4>
                <button
                  onClick={handleSendPhoneChangeOTP}
                  disabled={otpLoading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 flex items-center justify-center disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Send className={`w-4 h-4 mr-2 ${otpLoading ? 'animate-pulse' : ''}`} />
                  {otpLoading ? 'Sending...' : 'Send Phone OTP'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Management */}
      {/* <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold flex items-center">
            <History className="w-5 h-5 mr-2" /> Session Management
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Session Timeout</h4>
                <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
              </div>
              <select
                value={sessionTimeout}
                onChange={e => setSessionTimeout(Number(e.target.value))}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Login Alerts</h4>
                <p className="text-sm text-gray-500">Email notifications for new device logins</p>
              </div>
              <button
                onClick={() => setLoginAlerts(!loginAlerts)}
                className={`px-4 py-2 rounded-lg ${
                  loginAlerts ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {loginAlerts ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>
      </div> */}
      {/* IP Allowlist */}
      {/* <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold flex items-center">
            <Shield className="w-5 h-5 mr-2" /> IP Access Control
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newIP}
                onChange={e => setNewIP(e.target.value)}
                placeholder="Enter IP address"
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={handleAddIP}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add IP
              </button>
            </div>
            <div className="space-y-2">
              {allowedIPs.map((ip, index) => (
                <div key={ip} className="flex items-center justify-between py-2 border-b">
                  <span className="font-mono">{ip}</span>
                  <button
                    onClick={() => handleRemoveIP(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div> */}
      {/* Security History */}
      {/* <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold flex items-center">
            <History className="w-5 h-5 mr-2" /> Security History
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-2">
            {user.securityHistory?.map((event, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium">{event.type}</p>
                  <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{event.ipAddress}</p>
                  <p className="text-xs text-gray-500">{event.deviceInfo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div> */}
      {/* Save/Cancel Buttons */}
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
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
};

export default UserSecurity; 