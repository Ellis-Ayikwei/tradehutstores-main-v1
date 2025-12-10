import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { 
  X, 
  Save, 
  Eye, 
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Smartphone
} from 'lucide-react';

interface SMSTemplate {
  id?: string;
  name: string;
  content: string;
  language: string;
  country: string;
  isActive: boolean;
  characterCount: number;
}

interface EditSMSTemplateProps {
  template?: SMSTemplate;
  onClose: () => void;
  onSave: (template: SMSTemplate) => void;
}

const EditSMSTemplate: React.FC<EditSMSTemplateProps> = ({ 
  template, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState<SMSTemplate>({
    id: template?.id,
    name: template?.name || '',
    content: template?.content || '',
    language: template?.language || 'en',
    country: template?.country || 'US',
    isActive: template?.isActive ?? true,
    characterCount: template?.characterCount || 0
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

  const countries = [
    { code: 'US', name: 'United States', flag: '🇺🇸', prefix: '+1' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', prefix: '+1' },
    { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', prefix: '+44' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', prefix: '+49' },
    { code: 'FR', name: 'France', flag: '🇫🇷', prefix: '+33' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸', prefix: '+34' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹', prefix: '+39' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱', prefix: '+31' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', prefix: '+61' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪', prefix: '+46' },
    { code: 'NO', name: 'Norway', flag: '🇳🇴', prefix: '+47' },
    { code: 'DK', name: 'Denmark', flag: '🇩🇰', prefix: '+45' }
  ];

  const commonVariables = [
    'customer_name',
    'service_date',
    'booking_id',
    'driver_name',
    'eta',
    'tracking_url',
    'company_name',
    'support_phone',
    'service_type',
    'price',
    'location',
    'status'
  ];

  const handleInputChange = (field: keyof SMSTemplate, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'content' && { characterCount: value.length })
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
    const newContent = formData.content + ` {${variable}}`;
    setFormData(prev => ({
      ...prev,
      content: newContent,
      characterCount: newContent.length
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'SMS content is required';
    }

    if (formData.characterCount > 160) {
      newErrors.content = 'SMS content exceeds 160 characters';
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
    commonVariables.forEach(variable => {
      const placeholder = `{${variable}}`;
      const sampleValue = getSampleValue(variable);
      previewContent = previewContent.replace(new RegExp(placeholder, 'g'), sampleValue);
    });

    return previewContent;
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
      support_phone: '+1-555-123-4567',
      service_type: 'Moving Service',
      price: '$150.00',
      location: 'New York, NY',
      status: 'Confirmed'
    };
    return sampleValues[variable] || `[${variable}]`;
  };

  const preview = generatePreview();
  const isOverLimit = formData.characterCount > 160;
  const isNearLimit = formData.characterCount > 140;

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-2xl font-semibold text-gray-800 dark:text-white">
              {template?.id ? 'Edit' : 'Create'} SMS Template
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
                  <MessageSquare className="w-5 h-5 mr-2" />
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
                      placeholder="e.g., Driver Update"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                    )}
                  </div>
                </div>

                {/* Language & Country */}
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
                      Country
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.name} ({country.prefix})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SMS Content */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      SMS Content *
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${
                        isOverLimit 
                          ? 'text-red-600 dark:text-red-400'
                          : isNearLimit
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {formData.characterCount}/160
                      </span>
                      {isOverLimit && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <textarea
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm ${
                      errors.content || isOverLimit ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Your driver {driver_name} is on the way. ETA: {eta}. Track: {tracking_url}"
                  />
                  {errors.content && (
                    <p className="text-red-500 text-sm mt-1">{errors.content}</p>
                  )}
                  {isOverLimit && (
                    <p className="text-red-500 text-sm mt-1">SMS content exceeds 160 characters limit</p>
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
                        className="px-3 py-2 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                </div>

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
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">SMS Message</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {countries.find(c => c.code === formData.country)?.name} - {languages.find(l => l.code === formData.language)?.name}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    {previewMode ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {preview}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                        {formData.content}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Characters: {previewMode ? preview.length : formData.characterCount}
                    </span>
                    <span>
                      Messages: {Math.ceil((previewMode ? preview.length : formData.characterCount) / 160)}
                    </span>
                  </div>
                </div>

                {/* Template Info */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                    Template Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700 dark:text-green-300">Language:</span>
                      <span className="text-green-900 dark:text-green-100">
                        {languages.find(l => l.code === formData.language)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700 dark:text-green-300">Country:</span>
                      <span className="text-green-900 dark:text-green-100">
                        {countries.find(c => c.code === formData.country)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700 dark:text-green-300">Phone Prefix:</span>
                      <span className="text-green-900 dark:text-green-100">
                        {countries.find(c => c.code === formData.country)?.prefix}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700 dark:text-green-300">Status:</span>
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
              {Object.keys(errors).length > 0 || isOverLimit ? (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Object.keys(errors).length > 0 || isOverLimit
                  ? `${Object.keys(errors).length + (isOverLimit ? 1 : 0)} issue(s) to fix`
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
                disabled={Object.keys(errors).length > 0 || isOverLimit}
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

export default EditSMSTemplate; 