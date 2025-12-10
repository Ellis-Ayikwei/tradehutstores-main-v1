import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCog,
  faBell,
  faCreditCard,
  faPaintBrush,
  faGlobe,
  faCheckCircle,
  faExclamationTriangle,
  faInfoCircle,
  faSave,
  faUndoAlt,
  faMoneyBillWave,
  faEnvelope,
  faMobileAlt,
  faServer,
  faCloudUploadAlt,
  faPalette,
  faImage,
  faCode,
  faTrash
} from '@fortawesome/free-solid-svg-icons';

// Define system settings types
interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  supportEmail: string;
  contact_phone: string;
  defaultLanguage: string;
  timezone: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

interface NotificationSettings {
  adminEmailNotifications: boolean;
  providerEmailNotifications: boolean;
  userEmailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  emailServiceProvider: string;
  smtpServer: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
  smsApiKey: string;
  smsFrom: string;
}

interface PaymentSettings {
  currencyCode: string;
  currencySymbol: string;
  paymentGateways: {
    id: string;
    name: string;
    isActive: boolean;
    credentials: {
      apiKey?: string;
      secretKey?: string;
      merchantId?: string;
    };
    testMode: boolean;
  }[];
  serviceFeePercentage: number;
  minimumWithdrawalAmount: number;
  automaticPayouts: boolean;
  payoutSchedule: string;
}

interface AppearanceSettings {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  footerText: string;
  customCss: string;
  customJs: string;
  homePageLayout: string;
}

interface SystemSettings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  payment: PaymentSettings;
  appearance: AppearanceSettings;
}

// Available languages
const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ar', name: 'Arabic' }
];

// Available timezones
const timezones = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' }
];

// Available payment gateways
const availablePaymentGateways = [
  { id: 'stripe', name: 'Stripe' },
  { id: 'paypal', name: 'PayPal' },
  { id: 'square', name: 'Square' },
  { id: 'razorpay', name: 'Razorpay' },
  { id: 'authorize_net', name: 'Authorize.net' }
];

// Available email providers
const emailProviders = [
  { value: 'smtp', label: 'SMTP Server' },
  { value: 'sendgrid', label: 'SendGrid' },
  { value: 'mailchimp', label: 'Mailchimp' },
  { value: 'aws_ses', label: 'AWS SES' }
];

// Create Reusable Components
const SectionHeader = ({ icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="mb-8">
    <h2 className="text-xl font-semibold flex items-center text-gray-900 mb-2">
      <FontAwesomeIcon icon={icon} className="mr-3 text-blue-600" />
      {title}
    </h2>
    <p className="text-gray-600">{description}</p>
  </div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    {children}
  </div>
);

const ToggleSwitch = ({ 
  label, 
  checked, 
  onChange,
  description = ''
}: { 
  label: string, 
  checked: boolean, 
  onChange: (checked: boolean) => void,
  description?: string
}) => (
  <div className="flex items-center justify-between py-4 border-b border-gray-50 last:border-b-0">
    <div className="flex-1">
      <label className="font-medium text-gray-900">{label}</label>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
        className="sr-only peer" 
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  </div>
);

const TextInput = ({ 
  label, 
  value, 
  onChange,
  name = '',
  placeholder = '',
  type = 'text',
  required = false,
  description = ''
}: { 
  label: string, 
  value: string, 
  onChange: (value: string) => void,
  name?: string,
  placeholder?: string,
  type?: string,
  required?: boolean,
  description?: string
}) => (
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
    <input
      type={type}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
    />
  </div>
);

const TextArea = ({ 
  label, 
  value, 
  onChange, 
  rows = 3,
  placeholder = '',
  description = ''
}: { 
  label: string, 
  value: string, 
  onChange: (value: string) => void,
  rows?: number,
  placeholder?: string,
  description?: string
}) => (
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
    />
  </div>
);

const SelectField = ({ 
  label, 
  value, 
  onChange, 
  options,
  description = ''
}: { 
  label: string, 
  value: string, 
  onChange: (value: string) => void,
  options: { value: string, label: string }[],
  description?: string
}) => (
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const Alert = ({ 
  type, 
  message 
}: { 
  type: 'success' | 'error' | 'warning' | 'info', 
  message: string 
}) => {
  const icons = {
    success: faCheckCircle,
    error: faExclamationTriangle,
    warning: faExclamationTriangle,
    info: faInfoCircle
  };
  
  const colors = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  };
  
  return (
    <div className={`p-4 rounded-lg border ${colors[type]} mb-6 flex items-start`}>
      <FontAwesomeIcon icon={icons[type]} className="mr-3 mt-0.5 flex-shrink-0" />
      <div className="text-sm">{message}</div>
    </div>
  );
};

// Main component
const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    general: {
      siteName: 'MoreVans',
      siteDescription: 'The ultimate platform for van and moving services',
      supportEmail: 'support@morevans.com',
      contact_phone: '+1-555-123-4567',
      defaultLanguage: 'en',
      timezone: 'UTC',
      maintenanceMode: false,
      maintenanceMessage: 'We are currently performing maintenance. Please check back later.'
    },
    notifications: {
      adminEmailNotifications: true,
      providerEmailNotifications: true,
      userEmailNotifications: true,
      smsNotifications: false,
      pushNotifications: false,
      emailServiceProvider: 'smtp',
      smtpServer: 'smtp.example.com',
      smtpPort: '587',
      smtpUsername: 'notifications@morevans.com',
      smtpPassword: '',
      smsApiKey: '',
      smsFrom: 'MoreVans'
    },
    payment: {
      currencyCode: 'USD',
      currencySymbol: '$',
      paymentGateways: [
        {
          id: 'stripe',
          name: 'Stripe',
          isActive: true,
          credentials: {
            apiKey: '',
            secretKey: ''
          },
          testMode: true
        },
        {
          id: 'paypal',
          name: 'PayPal',
          isActive: false,
          credentials: {
            apiKey: '',
            secretKey: ''
          },
          testMode: true
        }
      ],
      serviceFeePercentage: 10,
      minimumWithdrawalAmount: 50,
      automaticPayouts: false,
      payoutSchedule: 'weekly'
    },
    appearance: {
      primaryColor: '#dc711a',
      secondaryColor: '#1a56db',
      logoUrl: '/logo192.png',
      faviconUrl: '/favicon.png',
      footerText: '© 2025 MoreVans. All rights reserved.',
      customCss: '',
      customJs: '',
      homePageLayout: 'default'
    }
  });
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update settings handler
  const updateSettings = <T extends keyof SystemSettings>(
    section: T,
    field: keyof SystemSettings[T],
    value: any
  ) => {
    setSystemSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    
    setUnsavedChanges(true);
  };

  // Handle adding a new payment gateway
  const addPaymentGateway = (gatewayId: string) => {
    const gateway = availablePaymentGateways.find(g => g.id === gatewayId);
    if (!gateway) return;
    
    if (systemSettings.payment.paymentGateways.some(g => g.id === gatewayId)) {
      return; // Gateway already exists
    }
    
    const newGateway = {
      id: gateway.id,
      name: gateway.name,
      isActive: false,
      credentials: {
        apiKey: '',
        secretKey: ''
      },
      testMode: true
    };
    
    setSystemSettings(prev => ({
      ...prev,
      payment: {
        ...prev.payment,
        paymentGateways: [...prev.payment.paymentGateways, newGateway]
      }
    }));
    
    setUnsavedChanges(true);
  };

  // Handle removing a payment gateway
  const removePaymentGateway = (gatewayId: string) => {
    setSystemSettings(prev => ({
      ...prev,
      payment: {
        ...prev.payment,
        paymentGateways: prev.payment.paymentGateways.filter(g => g.id !== gatewayId)
      }
    }));
    
    setUnsavedChanges(true);
  };

  // Handle updating a payment gateway
  const updatePaymentGateway = (gatewayId: string, field: string, value: any) => {
    setSystemSettings(prev => ({
      ...prev,
      payment: {
        ...prev.payment,
        paymentGateways: prev.payment.paymentGateways.map(g => {
          if (g.id === gatewayId) {
            if (field.startsWith('credentials.')) {
              const credentialKey = field.split('.')[1];
              return {
                ...g,
                credentials: {
                  ...g.credentials,
                  [credentialKey]: value
                }
              };
            }
            return {
              ...g,
              [field]: value
            };
          }
          return g;
        })
      }
    }));
    
    setUnsavedChanges(true);
  };

  // Handle saving the settings
  const saveSettings = async () => {
    setIsSubmitting(true);
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      setSaveMessage({
        type: 'success',
        message: 'Settings saved successfully'
      });
      
      setUnsavedChanges(false);
      
      // Hide the success message after a few seconds
      setTimeout(() => {
        setSaveMessage(null);
      }, 5000);
    } catch (error) {
      setSaveMessage({
        type: 'error',
        message: 'Failed to save settings. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmation before leaving with unsaved changes
  useEffect(() => {
    if (!unsavedChanges) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      const message = "You have unsaved changes. Are you sure you want to leave?";
      e.returnValue = message;
      return message;
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [unsavedChanges]);

  const tabs = [
    { id: 'general', label: 'General', icon: faGlobe },
    { id: 'notifications', label: 'Notifications', icon: faBell },
    { id: 'payment', label: 'Payment', icon: faCreditCard },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
              <p className="mt-2 text-gray-600">Manage your application configuration and preferences</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                disabled={!unsavedChanges || isSubmitting}
                className={`px-4 py-2 rounded-lg flex items-center text-sm font-medium transition-colors ${
                  !unsavedChanges || isSubmitting
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <FontAwesomeIcon icon={faUndoAlt} className="mr-2" />
                Discard
              </button>
              <button
                onClick={saveSettings}
                disabled={!unsavedChanges || isSubmitting}
                className={`px-6 py-2 rounded-lg flex items-center text-sm font-medium transition-colors ${
                  !unsavedChanges || isSubmitting
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                }`}
              >
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {saveMessage && (
          <Alert
            type={saveMessage.type}
            message={saveMessage.message}
          />
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Navigation Tabs */}
          <div className="border-b border-gray-100">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FontAwesomeIcon icon={tab.icon} className="mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="p-8">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-8">
                <SectionHeader
                  icon={faGlobe}
                  title="General Settings"
                  description="Configure basic information about your application"
                />

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Site Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TextInput
                      label="Site Name"
                      value={systemSettings.general.siteName}
                      onChange={(value) => updateSettings('general', 'siteName', value)}
                      placeholder="Your site name"
                      required
                    />
                    
                    <TextInput
                      label="Site Description"
                      value={systemSettings.general.siteDescription}
                      onChange={(value) => updateSettings('general', 'siteDescription', value)}
                      placeholder="Brief description of your site"
                    />
                    
                    <TextInput
                      label="Support Email"
                      type="email"
                      value={systemSettings.general.supportEmail}
                      onChange={(value) => updateSettings('general', 'supportEmail', value)}
                      placeholder="support@example.com"
                      required
                    />
                    
                    <TextInput
                      label="Contact Phone"
                      value={systemSettings.general.contact_phone}
                      onChange={(value) => updateSettings('general', 'contact_phone', value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Localization</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SelectField
                      label="Default Language"
                      value={systemSettings.general.defaultLanguage}
                      onChange={(value) => updateSettings('general', 'defaultLanguage', value)}
                      options={languages.map(lang => ({ value: lang.code, label: lang.name }))}
                    />
                    
                    <SelectField
                      label="Default Timezone"
                      value={systemSettings.general.timezone}
                      onChange={(value) => updateSettings('general', 'timezone', value)}
                      options={timezones}
                    />
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Maintenance</h3>
                  <ToggleSwitch
                    label="Maintenance Mode"
                    checked={systemSettings.general.maintenanceMode}
                    onChange={(value) => updateSettings('general', 'maintenanceMode', value)}
                    description="Enable to temporarily disable public access to the site"
                  />
                  
                  {systemSettings.general.maintenanceMode && (
                    <div className="mt-6">
                      <TextArea
                        label="Maintenance Message"
                        value={systemSettings.general.maintenanceMessage}
                        onChange={(value) => updateSettings('general', 'maintenanceMessage', value)}
                        placeholder="Message to display during maintenance"
                        rows={3}
                      />
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-8">
                <SectionHeader
                  icon={faBell}
                  title="Notification Settings"
                  description="Configure email and SMS notification preferences"
                />

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Email Notifications</h3>
                  <div className="space-y-4">
                    <ToggleSwitch
                      label="Admin Notifications"
                      checked={systemSettings.notifications.adminEmailNotifications}
                      onChange={(value) => updateSettings('notifications', 'adminEmailNotifications', value)}
                      description="Send email notifications to administrators"
                    />
                    
                    <ToggleSwitch
                      label="Provider Notifications"
                      checked={systemSettings.notifications.providerEmailNotifications}
                      onChange={(value) => updateSettings('notifications', 'providerEmailNotifications', value)}
                      description="Send email notifications to service providers"
                    />
                    
                    <ToggleSwitch
                      label="User Notifications"
                      checked={systemSettings.notifications.userEmailNotifications}
                      onChange={(value) => updateSettings('notifications', 'userEmailNotifications', value)}
                      description="Send email notifications to regular users"
                    />
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">SMS & Push Notifications</h3>
                  <div className="space-y-4">
                    <ToggleSwitch
                      label="SMS Notifications"
                      checked={systemSettings.notifications.smsNotifications}
                      onChange={(value) => updateSettings('notifications', 'smsNotifications', value)}
                      description="Send SMS notifications for important updates"
                    />
                    
                    <ToggleSwitch
                      label="Push Notifications"
                      checked={systemSettings.notifications.pushNotifications}
                      onChange={(value) => updateSettings('notifications', 'pushNotifications', value)}
                      description="Send mobile app push notifications"
                    />
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Email Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <SelectField
                      label="Email Service Provider"
                      value={systemSettings.notifications.emailServiceProvider}
                      onChange={(value) => updateSettings('notifications', 'emailServiceProvider', value)}
                      options={emailProviders}
                    />
                  </div>
                  
                  {systemSettings.notifications.emailServiceProvider === 'smtp' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <TextInput
                        label="SMTP Server"
                        value={systemSettings.notifications.smtpServer}
                        onChange={(value) => updateSettings('notifications', 'smtpServer', value)}
                        placeholder="smtp.example.com"
                      />
                      
                      <TextInput
                        label="SMTP Port"
                        value={systemSettings.notifications.smtpPort}
                        onChange={(value) => updateSettings('notifications', 'smtpPort', value)}
                        placeholder="587"
                      />
                      
                      <TextInput
                        label="SMTP Username"
                        value={systemSettings.notifications.smtpUsername}
                        onChange={(value) => updateSettings('notifications', 'smtpUsername', value)}
                        placeholder="username@example.com"
                      />
                      
                      <TextInput
                        label="SMTP Password"
                        type="password"
                        value={systemSettings.notifications.smtpPassword}
                        onChange={(value) => updateSettings('notifications', 'smtpPassword', value)}
                        placeholder="••••••••"
                      />
                    </div>
                  )}
                  
                  {(systemSettings.notifications.emailServiceProvider === 'sendgrid' || 
                    systemSettings.notifications.emailServiceProvider === 'mailchimp' || 
                    systemSettings.notifications.emailServiceProvider === 'aws_ses') && (
                    <div className="grid grid-cols-1 gap-6">
                      <TextInput
                        label="API Key"
                        type="password"
                        value={systemSettings.notifications.smtpPassword}
                        onChange={(value) => updateSettings('notifications', 'smtpPassword', value)}
                        placeholder="••••••••"
                      />
                    </div>
                  )}
                </Card>

                {systemSettings.notifications.smsNotifications && (
                  <Card>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">SMS Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <TextInput
                        label="SMS API Key"
                        type="password"
                        value={systemSettings.notifications.smsApiKey}
                        onChange={(value) => updateSettings('notifications', 'smsApiKey', value)}
                        placeholder="••••••••"
                      />
                      
                      <TextInput
                        label="SMS From Name/Number"
                        value={systemSettings.notifications.smsFrom}
                        onChange={(value) => updateSettings('notifications', 'smsFrom', value)}
                        placeholder="MoreVans"
                      />
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Payment Settings */}
            {activeTab === 'payment' && (
              <div className="space-y-8">
                <SectionHeader
                  icon={faMoneyBillWave}
                  title="Payment Settings"
                  description="Configure payment gateways and financial settings"
                />

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Currency Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TextInput
                      label="Currency Code"
                      value={systemSettings.payment.currencyCode}
                      onChange={(value) => updateSettings('payment', 'currencyCode', value)}
                      placeholder="USD"
                    />
                    
                    <TextInput
                      label="Currency Symbol"
                      value={systemSettings.payment.currencySymbol}
                      onChange={(value) => updateSettings('payment', 'currencySymbol', value)}
                      placeholder="$"
                    />
                    
                    <TextInput
                      label="Service Fee Percentage"
                      type="number"
                      value={systemSettings.payment.serviceFeePercentage.toString()}
                      onChange={(value) => updateSettings('payment', 'serviceFeePercentage', parseFloat(value) || 0)}
                      placeholder="10"
                    />
                    
                    <TextInput
                      label="Minimum Withdrawal Amount"
                      type="number"
                      value={systemSettings.payment.minimumWithdrawalAmount.toString()}
                      onChange={(value) => updateSettings('payment', 'minimumWithdrawalAmount', parseFloat(value) || 0)}
                      placeholder="50"
                    />
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Payout Settings</h3>
                  <div className="space-y-4">
                    <ToggleSwitch
                      label="Automatic Payouts"
                      checked={systemSettings.payment.automaticPayouts}
                      onChange={(value) => updateSettings('payment', 'automaticPayouts', value)}
                      description="Automatically process payouts to providers"
                    />
                    
                    <div className="pt-2">
                      <SelectField
                        label="Payout Schedule"
                        value={systemSettings.payment.payoutSchedule}
                        onChange={(value) => updateSettings('payment', 'payoutSchedule', value)}
                        options={[
                          { value: 'daily', label: 'Daily' },
                          { value: 'weekly', label: 'Weekly' },
                          { value: 'biweekly', label: 'Bi-weekly' },
                          { value: 'monthly', label: 'Monthly' }
                        ]}
                      />
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Payment Gateways</h3>
                    <div className="flex items-center space-x-2">
                      <select
                        className="px-3 py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        onChange={(e) => {
                          if (e.target.value) {
                            addPaymentGateway(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Add Gateway</option>
                        {availablePaymentGateways
                          .filter(g => !systemSettings.payment.paymentGateways.some(pg => pg.id === g.id))
                          .map(gateway => (
                            <option key={gateway.id} value={gateway.id}>{gateway.name}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {systemSettings.payment.paymentGateways.map((gateway) => (
                      <div key={gateway.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-semibold text-gray-900">{gateway.name}</h4>
                          <div className="flex items-center space-x-4">
                            <ToggleSwitch
                              label="Active"
                              checked={gateway.isActive}
                              onChange={(value) => updatePaymentGateway(gateway.id, 'isActive', value)}
                              description=""
                            />
                            <button
                              onClick={() => removePaymentGateway(gateway.id)}
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Remove gateway"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <TextInput
                            label="API Key"
                            type="password"
                            value={gateway.credentials.apiKey || ''}
                            onChange={(value) => updatePaymentGateway(gateway.id, 'credentials.apiKey', value)}
                            placeholder="••••••••"
                          />
                          
                          <TextInput
                            label="Secret Key"
                            type="password"
                            value={gateway.credentials.secretKey || ''}
                            onChange={(value) => updatePaymentGateway(gateway.id, 'credentials.secretKey', value)}
                            placeholder="••••••••"
                          />
                        </div>
                        
                        <div className="mt-4">
                          <ToggleSwitch
                            label="Test Mode"
                            checked={gateway.testMode}
                            onChange={(value) => updatePaymentGateway(gateway.id, 'testMode', value)}
                            description="Use test credentials instead of live credentials"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;