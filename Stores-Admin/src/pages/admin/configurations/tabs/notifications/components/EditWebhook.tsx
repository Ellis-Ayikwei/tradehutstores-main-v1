import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Save, Zap, AlertTriangle, CheckCircle, TestTube, RefreshCw } from 'lucide-react';

interface Webhook {
  id?: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  isActive: boolean;
  supportedEvents: string[];
  timeout: number;
  retryAttempts: number;
}

interface EditWebhookProps {
  webhook?: Webhook;
  onClose: () => void;
  onSave: (webhook: Webhook) => void;
}

const EditWebhook: React.FC<EditWebhookProps> = ({ webhook, onClose, onSave }) => {
  const [formData, setFormData] = useState<Webhook>({
    id: webhook?.id,
    name: webhook?.name || '',
    url: webhook?.url || '',
    method: webhook?.method || 'POST',
    headers: webhook?.headers || {},
    isActive: webhook?.isActive ?? true,
    supportedEvents: webhook?.supportedEvents || [],
    timeout: webhook?.timeout || 30,
    retryAttempts: webhook?.retryAttempts || 3
  });

  const [isTesting, setIsTesting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const methods = ['GET', 'POST', 'PUT', 'PATCH'];
  const events = [
    'booking_created',
    'booking_updated',
    'driver_assigned',
    'payment_received',
    'service_completed',
    'all'
  ];

  const handleInputChange = (field: keyof Webhook, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addHeader = () => {
    const key = `header_${Object.keys(formData.headers).length + 1}`;
    setFormData(prev => ({
      ...prev,
      headers: { ...prev.headers, [key]: '' }
    }));
  };

  const updateHeader = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      headers: { ...prev.headers, [key]: value }
    }));
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...formData.headers };
    delete newHeaders[key];
    setFormData(prev => ({ ...prev, headers: newHeaders }));
  };

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      supportedEvents: prev.supportedEvents.includes(event)
        ? prev.supportedEvents.filter(e => e !== event)
        : [...prev.supportedEvents, event]
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Webhook name is required';
    if (!formData.url.trim()) newErrors.url = 'Webhook URL is required';
    if (!formData.url.startsWith('http')) newErrors.url = 'URL must start with http:// or https://';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTesting(false);
  };

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-2xl font-semibold text-gray-800 dark:text-white">
              {webhook?.id ? 'Edit' : 'Create'} Webhook
            </Dialog.Title>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Webhook Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Webhook Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                        errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="e.g., Slack Integration"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Webhook URL *
                    </label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => handleInputChange('url', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                        errors.url ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="https://hooks.slack.com/services/..."
                    />
                    {errors.url && <p className="text-red-500 text-sm mt-1">{errors.url}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        HTTP Method
                      </label>
                      <select
                        value={formData.method}
                        onChange={(e) => handleInputChange('method', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        {methods.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        value={formData.timeout}
                        onChange={(e) => handleInputChange('timeout', parseInt(e.target.value))}
                        min={5}
                        max={300}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Retry Attempts
                    </label>
                    <input
                      type="number"
                      value={formData.retryAttempts}
                      onChange={(e) => handleInputChange('retryAttempts', parseInt(e.target.value))}
                      min={0}
                      max={10}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Headers */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Headers
                      </label>
                      <button
                        onClick={addHeader}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        + Add Header
                      </button>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(formData.headers).map(([key, value]) => (
                        <div key={key} className="flex space-x-2">
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                              const newHeaders = { ...formData.headers };
                              delete newHeaders[key];
                              newHeaders[e.target.value] = value;
                              setFormData(prev => ({ ...prev, headers: newHeaders }));
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                            placeholder="Header name"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateHeader(key, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                            placeholder="Header value"
                          />
                          <button
                            onClick={() => removeHeader(key)}
                            className="px-3 py-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Events */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Supported Events
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {events.map((event) => (
                        <label key={event} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.supportedEvents.includes(event)}
                            onChange={() => toggleEvent(event)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                            {event.replace('_', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => handleInputChange('isActive', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Webhook is active
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Webhook Preview
                </h3>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formData.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formData.method} - {formData.url}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Headers:</p>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-xs">
                        {Object.entries(formData.headers).map(([key, value]) => (
                          <div key={key} className="text-gray-600 dark:text-gray-400">
                            {key}: {value}
                          </div>
                        ))}
                        {Object.keys(formData.headers).length === 0 && (
                          <div className="text-gray-400 italic">No headers configured</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Events:</p>
                      <div className="flex flex-wrap gap-1">
                        {formData.supportedEvents.map((event) => (
                          <span key={event} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-xs">
                            {event}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={handleTest}
                        disabled={isTesting}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
                      >
                        {isTesting ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="mr-2 h-4 w-4" />
                        )}
                        {isTesting ? 'Testing...' : 'Test Webhook'}
                      </button>
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
                {webhook?.id ? 'Update' : 'Create'} Webhook
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default EditWebhook; 