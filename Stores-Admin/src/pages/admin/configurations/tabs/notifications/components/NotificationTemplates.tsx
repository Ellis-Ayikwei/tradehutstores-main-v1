import React, { useState } from 'react';
import { 
  Globe, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Plus,
  Edit,
  Trash,
  Copy,
  Eye,
  Languages
} from 'lucide-react';
import { columnTypes } from '../../../ui/ColumnHelpers';

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  language: string;
  region: string;
  subject?: string;
  content: string;
  isActive: boolean;
  variables: string[];
}

const NotificationTemplates: React.FC = () => {
  const [activeType, setActiveType] = useState<'all' | 'email' | 'sms' | 'push'>('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');

  const templates: NotificationTemplate[] = [
    {
      id: '1',
      name: 'Booking Confirmation',
      type: 'email',
      language: 'en',
      region: 'US',
      subject: 'Your booking has been confirmed',
      content: 'Dear {customer_name}, your booking for {service_date} has been confirmed. Booking ID: {booking_id}',
      isActive: true,
      variables: ['customer_name', 'service_date', 'booking_id']
    },
    {
      id: '2',
      name: 'Booking Confirmation (Spanish)',
      type: 'email',
      language: 'es',
      region: 'ES',
      subject: 'Su reserva ha sido confirmada',
      content: 'Estimado {customer_name}, su reserva para {service_date} ha sido confirmada. ID de reserva: {booking_id}',
      isActive: true,
      variables: ['customer_name', 'service_date', 'booking_id']
    },
    {
      id: '3',
      name: 'Driver Update',
      type: 'sms',
      language: 'en',
      region: 'US',
      content: 'Your driver {driver_name} is on the way. ETA: {eta}. Track: {tracking_url}',
      isActive: true,
      variables: ['driver_name', 'eta', 'tracking_url']
    },
    {
      id: '4',
      name: 'Service Complete',
      type: 'push',
      language: 'en',
      region: 'US',
      content: 'Your service has been completed. Rate your experience!',
      isActive: true,
      variables: []
    }
  ];

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
    { code: 'sv', name: 'Swedish', flag: '🇸🇪' }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesType = activeType === 'all' || template.type === activeType;
    const matchesLanguage = selectedLanguage === 'all' || template.language === selectedLanguage;
    return matchesType && matchesLanguage;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'sms': return MessageSquare;
      case 'push': return Smartphone;
      default: return Globe;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'sms': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'push': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  // Define columns with proper width management to prevent overlap
  const columns = [
    columnTypes.shortText('name', 'Template Name', {
      render: (template) => (
        <div className="font-medium text-gray-900 dark:text-white">
          {template.name}
        </div>
      )
    }),
    columnTypes.status('type', 'Type', {
      render: (template) => {
        const TypeIcon = getTypeIcon(template.type);
        return (
          <div className="flex items-center space-x-2">
            <div className={`p-1 rounded ${getTypeColor(template.type)}`}>
              <TypeIcon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium capitalize">{template.type}</span>
          </div>
        );
      }
    }),
    columnTypes.shortText('language', 'Language', {
      render: (template) => {
        const lang = languages.find(l => l.code === template.language);
        return (
          <div className="flex items-center space-x-2">
            <span className="text-lg">{lang?.flag}</span>
            <span className="text-sm">{lang?.name}</span>
          </div>
        );
      }
    }),
    columnTypes.shortText('region', 'Region', {
      render: (template) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {template.region}
        </span>
      )
    }),
    columnTypes.text('content', 'Content', {
      render: (template) => (
        <div className="max-w-xs">
          <div className="text-sm text-gray-700 dark:text-gray-300 truncate" title={template.content}>
            {template.content}
          </div>
          {template.variables.length > 0 && (
            <div className="mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {template.variables.length} variable{template.variables.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )
    }),
    columnTypes.boolean('isActive', 'Status', {
      render: (template) => (
        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
          template.isActive 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
        }`}>
          {template.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    }),
    columnTypes.actions('actions', 'Actions', {
      render: (template) => (
        <div className="flex items-center space-x-2">
          <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <Eye className="w-4 h-4" />
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <Edit className="w-4 h-4" />
          </button>
          <button className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <Copy className="w-4 h-4" />
          </button>
          <button className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <Trash className="w-4 h-4" />
          </button>
        </div>
      )
    })
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={activeType}
                onChange={(e) => setActiveType(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="all">All Types</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="all">All Languages</option>
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Template
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => {
          const TypeIcon = getTypeIcon(template.type);
          return (
            <div key={template.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getTypeColor(template.type)}`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{template.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {template.type.toUpperCase()} - {template.language.toUpperCase()} - {template.region}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {template.subject && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Subject:</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{template.subject}</p>
                  </div>
                )}

                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Content:</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{template.content}</p>
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

                {template.variables.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Variables:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.variables.map((variable) => (
                        <span key={variable} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-xs">
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Languages className="text-gray-400 h-6 w-6" />
          </div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">No templates found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {activeType !== 'all' || selectedLanguage !== 'all' 
              ? 'Try adjusting your filter criteria.'
              : 'Get started by creating your first notification template.'
            }
          </p>
          {(activeType === 'all' && selectedLanguage === 'all') && (
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm">
              <Plus className="mr-2 h-4 w-4" />
              Create First Template
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationTemplates; 