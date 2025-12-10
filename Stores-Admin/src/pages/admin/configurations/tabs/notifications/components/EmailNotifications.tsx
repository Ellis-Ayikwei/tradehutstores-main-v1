import React, { useState } from 'react';
import { 
  Mail, 
  Globe, 
  Shield, 
  Settings, 
  CheckCircle, 
  AlertTriangle,
  Plus,
  Edit,
  Trash,
  TestTube,
  Save,
  RefreshCw
} from 'lucide-react';

interface EmailProvider {
  id: string;
  name: string;
  type: 'smtp' | 'api' | 'webhook';
  host?: string;
  port?: number;
  username?: string;
  apiKey?: string;
  region?: string;
  isActive: boolean;
  supportedRegions: string[];
  deliveryRate: number;
  lastTested: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  language: string;
  region: string;
  isActive: boolean;
}

const EmailNotifications: React.FC = () => {
  const [activeSection, setActiveSection] = useState('providers');
  const [isTesting, setIsTesting] = useState(false);

  const emailProviders: EmailProvider[] = [
    {
      id: '1',
      name: 'SendGrid',
      type: 'api',
      apiKey: '***',
      region: 'US',
      isActive: true,
      supportedRegions: ['US', 'EU', 'APAC'],
      deliveryRate: 99.9,
      lastTested: '2024-01-15'
    },
    {
      id: '2',
      name: 'Amazon SES',
      type: 'api',
      apiKey: '***',
      region: 'EU',
      isActive: true,
      supportedRegions: ['US', 'EU', 'APAC'],
      deliveryRate: 99.8,
      lastTested: '2024-01-14'
    },
    {
      id: '3',
      name: 'SMTP Server',
      type: 'smtp',
      host: 'smtp.company.com',
      port: 587,
      username: 'noreply@company.com',
      isActive: false,
      supportedRegions: ['US'],
      deliveryRate: 95.2,
      lastTested: '2024-01-10'
    }
  ];

  const emailTemplates: EmailTemplate[] = [
    {
      id: '1',
      name: 'Booking Confirmation',
      subject: 'Your booking has been confirmed',
      content: 'Dear {customer_name}, your booking for {service_date} has been confirmed...',
      language: 'en',
      region: 'US',
      isActive: true
    },
    {
      id: '2',
      name: 'Booking Confirmation (Spanish)',
      subject: 'Su reserva ha sido confirmada',
      content: 'Estimado {customer_name}, su reserva para {service_date} ha sido confirmada...',
      language: 'es',
      region: 'ES',
      isActive: true
    }
  ];

  const regions = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'EU', name: 'European Union', flag: '🇪🇺' },
    { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
    { code: 'NO', name: 'Norway', flag: '🇳🇴' }
  ];

  const handleTestProvider = async (providerId: string) => {
    setIsTesting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTesting(false);
  };

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveSection('providers')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeSection === 'providers'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          Email Providers
        </button>
        <button
          onClick={() => setActiveSection('templates')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeSection === 'templates'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          Email Templates
        </button>
        <button
          onClick={() => setActiveSection('settings')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeSection === 'settings'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          Settings
        </button>
      </div>

      {/* Email Providers Section */}
      {activeSection === 'providers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Providers</h3>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Provider
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {emailProviders.map((provider) => (
              <div key={provider.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${provider.isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <Mail className={`w-5 h-5 ${provider.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{provider.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{provider.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      provider.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {provider.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Delivery Rate</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{provider.deliveryRate}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Last Tested</span>
                    <span className="text-sm text-gray-900 dark:text-white">{provider.lastTested}</span>
                  </div>

                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Supported Regions</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {provider.supportedRegions.map((region) => (
                        <span key={region} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-xs">
                          {region}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => handleTestProvider(provider.id)}
                    disabled={isTesting}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
                  >
                    {isTesting ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="mr-2 h-4 w-4" />
                    )}
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Templates Section */}
      {activeSection === 'templates' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Templates</h3>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Template
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {emailTemplates.map((template) => (
              <div key={template.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{template.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{template.subject}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Language</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{template.language.toUpperCase()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Region</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{template.region}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      template.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
                    {template.content.substring(0, 100)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Section */}
      {activeSection === 'settings' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">General Settings</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default From Email
                  </label>
                  <input
                    type="email"
                    defaultValue="noreply@morevans.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default From Name
                  </label>
                  <input
                    type="text"
                    defaultValue="MoreVans"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Retry Attempts
                  </label>
                  <input
                    type="number"
                    defaultValue={3}
                    min={1}
                    max={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Regional Settings</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Region
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
                    {regions.map((region) => (
                      <option key={region.code} value={region.code}>
                        {region.flag} {region.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Zone
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auto-retry"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="auto-retry" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Enable automatic retry for failed emails
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailNotifications; 