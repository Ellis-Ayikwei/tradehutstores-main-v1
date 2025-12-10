import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { 
  X, 
  Save, 
  Eye, 
  Code, 
  Globe,
  Mail,
  Languages,
  MapPin,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  content: string;
  language: string;
  region: string;
  isActive: boolean;
  variables: string[];
}

interface EditEmailTemplateProps {
  template?: EmailTemplate;
  onClose: () => void;
  onSave: (template: EmailTemplate) => void;
}

const EditEmailTemplate: React.FC<EditEmailTemplateProps> = ({ 
  template, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState<EmailTemplate>({
    id: template?.id,
    name: template?.name || '',
    subject: template?.subject || '',
    content: template?.content || '',
    language: template?.language || 'en',
    region: template?.region || 'US',
    isActive: template?.isActive ?? true,
    variables: template?.variables || []
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const regions = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'EU', name: 'European Union', flag: '🇪🇺' },
    { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸' }
  ];

  const commonVariables = [
    'customer_name',
    'service_date',
    'booking_id',
    'driver_name',
    'eta',
    'tracking_url',
    'company_name',
    'support_email',
    'service_type',
    'price',
    'location',
    'status'
  ];

  const handleInputChange = (field: keyof EmailTemplate, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const addVariable = (variable: string) => {
    if (!formData.variables.includes(variable)) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, variable]
      }));
    }
  };

  const removeVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== variable)
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Email subject is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Email content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const generatePreview = () => {
    let previewContent = formData.content;
    formData.variables.forEach(variable => {
      const placeholder = `{${variable}}`;
      const sampleValue = getSampleValue(variable);
      previewContent = previewContent.replace(new RegExp(placeholder, 'g'), sampleValue);
    });

    return {
      subject: formData.subject.replace(/\{(\w+)\}/g, (match, variable) => getSampleValue(variable)),
      content: previewContent
    };
  };

  const getSampleValue = (variable: string) => {
    const sampleValues: Record<string, string> = {
      customer_name: 'John Doe',
      service_date: '2024-01-15',
      booking_id: 'BK-2024-001',
      driver_name: 'Mike Johnson',
      eta: '2:30 PM',
      tracking_url: 'https://track.morevans.com/abc123',
      company_name: 'MoreVans',
      support_email: 'support@morevans.com',
      service_type: 'Moving Service',
      price: '$150.00',
      location: 'New York, NY',
      status: 'Confirmed'
    };
    return sampleValues[variable] || `[${variable}]`;
  };

  const preview = generatePreview();

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-2xl font-semibold text-gray-800 dark:text-white">
              {template?.id ? 'Edit' : 'Create'} Email Template
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  Template Details
                </h3>

                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                        errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="e.g., Booking Confirmation"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Subject *
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                        errors.subject ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="e.g., Your booking has been confirmed"
                    />
                    {errors.subject && (
                      <p className="text-red-500 text-sm mt-1">{errors.subject}</p>
                    )}
                  </div>
                </div>

                {/* Language & Region */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Language
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Region
                    </label>
                    <select
                      value={formData.region}
                      onChange={(e) => handleInputChange('region', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      {regions.map((region) => (
                        <option key={region.code} value={region.code}>
                          {region.flag} {region.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Email Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Content *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    rows={8}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm ${
                      errors.content ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Dear {customer_name}, your booking for {service_date} has been confirmed..."
                  />
                  {errors.content && (
                    <p className="text-red-500 text-sm mt-1">{errors.content}</p>
                  )}
                </div>

                {/* Variables */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Available Variables
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {commonVariables.map((variable) => (
                      <button
                        key={variable}
                        onClick={() => addVariable(variable)}
                        className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                          formData.variables.includes(variable)
                            ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Variables */}
                {formData.variables.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Selected Variables
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {formData.variables.map((variable) => (
                        <span
                          key={variable}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-sm"
                        >
                          {variable}
                          <button
                            onClick={() => removeVariable(variable)}
                            className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Template is active
                  </label>
                </div>
              </div>

              {/* Preview Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Preview
                  </h3>
                  <button
                    onClick={() => setPreviewMode(!previewMode)}
                    className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {previewMode ? 'Raw' : 'Preview'}
                  </button>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  {previewMode ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Subject:
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {preview.subject}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Content:
                        </label>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {preview.content}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Subject:
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {formData.subject}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Content:
                        </label>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                          {formData.content}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Template Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Template Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-300">Language:</span>
                      <span className="text-blue-900 dark:text-blue-100">
                        {languages.find(l => l.code === formData.language)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-300">Region:</span>
                      <span className="text-blue-900 dark:text-blue-100">
                        {regions.find(r => r.code === formData.region)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-300">Variables:</span>
                      <span className="text-blue-900 dark:text-blue-100">
                        {formData.variables.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-300">Status:</span>
                      <span className={`text-sm font-medium ${
                        formData.isActive 
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {formData.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center space-x-2">
              {Object.keys(errors).length > 0 ? (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Object.keys(errors).length > 0 
                  ? `${Object.keys(errors).length} error(s) to fix`
                  : 'All fields are valid'
                }
              </span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={Object.keys(errors).length > 0}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="mr-2 h-4 w-4" />
                {template?.id ? 'Update' : 'Create'} Template
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default EditEmailTemplate; 