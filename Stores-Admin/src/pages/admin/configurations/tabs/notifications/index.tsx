import React, { useState } from 'react';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Globe, 
  Settings,
  Zap,
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import EmailNotifications from './components/EmailNotifications';
import SMSNotifications from './components/SMSNotifications';
import PushNotifications from './components/PushNotifications';
import WebhookNotifications from './components/WebhookNotifications';
import NotificationTemplates from './components/NotificationTemplates';
import NotificationSettings from './components/NotificationSettings';

interface NotificationTab {
  key: string;
  label: string;
  icon: any;
  component: React.ComponentType;
  description: string;
}

const NotificationsConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState('email');

  const notificationTabs: NotificationTab[] = [
    {
      key: 'email',
      label: 'Email Notifications',
      icon: Mail,
      component: EmailNotifications,
      description: 'Configure email notification settings and templates'
    },
    {
      key: 'sms',
      label: 'SMS Notifications',
      icon: MessageSquare,
      component: SMSNotifications,
      description: 'Manage SMS notification providers and settings'
    },
    {
      key: 'push',
      label: 'Push Notifications',
      icon: Smartphone,
      component: PushNotifications,
      description: 'Configure push notifications for mobile apps'
    },
    {
      key: 'webhooks',
      label: 'Webhooks',
      icon: Zap,
      component: WebhookNotifications,
      description: 'Set up webhook integrations for external services'
    },
    {
      key: 'templates',
      label: 'Templates',
      icon: Globe,
      component: NotificationTemplates,
      description: 'Manage notification templates and content'
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: Settings,
      component: NotificationSettings,
      description: 'General notification system settings'
    }
  ];

  const ActiveComponent = notificationTabs.find(tab => tab.key === activeTab)?.component || EmailNotifications;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notification Configuration
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Configure international notification settings for email, SMS, push notifications, and webhooks
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="text-green-600 dark:text-green-400 h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Active Channels</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">4</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Globe className="text-blue-600 dark:text-blue-400 h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Supported Regions</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">12</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Clock className="text-purple-600 dark:text-purple-400 h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Delivery Rate</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">99.8%</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <AlertTriangle className="text-orange-600 dark:text-orange-400 h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Failed Today</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">23</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {notificationTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {React.createElement(tab.icon, { className: "w-4 h-4" })}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Description */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-start space-x-3">
            {React.createElement(notificationTabs.find(tab => tab.key === activeTab)?.icon || Bell, {
              className: "w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"
            })}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {notificationTabs.find(tab => tab.key === activeTab)?.label}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {notificationTabs.find(tab => tab.key === activeTab)?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
};

export default NotificationsConfig; 