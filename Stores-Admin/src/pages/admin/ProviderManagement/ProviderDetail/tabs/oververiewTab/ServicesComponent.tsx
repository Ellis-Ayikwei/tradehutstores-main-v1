import React, { useState } from 'react';
import {
  Truck,
  Edit,
  Save,
  X,
  Plus,
  Target,
  DollarSign,
  Car,
  AlertCircle
} from 'lucide-react';
import { Provider } from '../../types';
import { updateProvider } from '../../../../../../services/providerServices';

interface ServicesComponentProps {
  provider: Provider;
  onProviderUpdate: () => void;
}

export const ServicesComponent: React.FC<ServicesComponentProps> = ({
  provider,
  onProviderUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newOperatingArea, setNewOperatingArea] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [formData, setFormData] = useState({
    operating_areas: provider.operating_areas || [],
    service_categories: provider.service_categories || [],
    specializations: provider.specializations || [],
    payment_methods: provider.payment_methods || [],
  });

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      operating_areas: provider.operating_areas || [],
      service_categories: provider.service_categories || [],
      specializations: provider.specializations || [],
      payment_methods: provider.payment_methods || [],
    });
    setError(null);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      await updateProvider(provider.id, formData);
      onProviderUpdate();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update services information');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOperatingArea = () => {
    if (newOperatingArea.trim() && !formData.operating_areas.includes(newOperatingArea.trim())) {
      setFormData(prev => ({
        ...prev,
        operating_areas: [...prev.operating_areas, newOperatingArea.trim()]
      }));
      setNewOperatingArea('');
    }
  };

  const handleRemoveOperatingArea = (index: number) => {
    setFormData(prev => ({
      ...prev,
      operating_areas: prev.operating_areas.filter((_, i) => i !== index)
    }));
  };

  const handleAddServiceCategory = () => {
    if (newServiceCategory.trim() && !formData.service_categories.includes(newServiceCategory.trim())) {
      setFormData(prev => ({
        ...prev,
        service_categories: [...prev.service_categories, newServiceCategory.trim()]
      }));
      setNewServiceCategory('');
    }
  };

  const handleRemoveServiceCategory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      service_categories: prev.service_categories.filter((_, i) => i !== index)
    }));
  };

  const handleAddSpecialization = () => {
    if (newSpecialization.trim() && !formData.specializations.includes(newSpecialization.trim())) {
      setFormData(prev => ({
        ...prev,
        specializations: [...prev.specializations, newSpecialization.trim()]
      }));
      setNewSpecialization('');
    }
  };

  const handleRemoveSpecialization = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter((_, i) => i !== index)
    }));
  };

  const handleAddPaymentMethod = () => {
    if (newPaymentMethod.trim() && !formData.payment_methods.includes(newPaymentMethod.trim())) {
      setFormData(prev => ({
        ...prev,
        payment_methods: [...prev.payment_methods, newPaymentMethod.trim()]
      }));
      setNewPaymentMethod('');
    }
  };

  const handleRemovePaymentMethod = (index: number) => {
    setFormData(prev => ({
      ...prev,
      payment_methods: prev.payment_methods.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center">
          <Truck className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold">Services & Specializations</h3>
        </div>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-6">
            {/* Operating Areas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operating Areas
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newOperatingArea}
                  onChange={(e) => setNewOperatingArea(e.target.value)}
                  placeholder="Add operating area..."
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddOperatingArea}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.operating_areas.map((area, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {typeof area === 'string' ? area : area.address || area}
                    <button
                      type="button"
                      onClick={() => handleRemoveOperatingArea(index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Service Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Categories
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value)}
                  placeholder="Add service category..."
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddServiceCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.service_categories.map((category, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {category}
                    <button
                      type="button"
                      onClick={() => handleRemoveServiceCategory(index)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Specializations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specializations
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newSpecialization}
                  onChange={(e) => setNewSpecialization(e.target.value)}
                  placeholder="Add specialization..."
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddSpecialization}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.specializations.map((specialization, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {specialization}
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecialization(index)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Methods
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  placeholder="Add payment method..."
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddPaymentMethod}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.payment_methods.map((method, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                  >
                    {method}
                    <button
                      type="button"
                      onClick={() => handleRemovePaymentMethod(index)}
                      className="text-orange-600 hover:text-orange-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-1" />
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Operating Areas */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-4">Operating Areas</h4>
              <div className="flex flex-wrap gap-2">
                {provider.operating_areas && provider.operating_areas.length > 0 ? (
                  provider.operating_areas.map((area, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {typeof area === 'string' ? area : area.address || area}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No operating areas specified</span>
                )}
              </div>
            </div>

            {/* Service Categories */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-4">Service Categories</h4>
              <div className="flex flex-wrap gap-2">
                {provider.service_categories && provider.service_categories.length > 0 ? (
                  provider.service_categories.map((category, index) => (
                    <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      {category}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No service categories specified</span>
                )}
              </div>
            </div>

            {/* Specializations */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-4">Specializations</h4>
              <div className="flex flex-wrap gap-2">
                {provider.specializations && provider.specializations.length > 0 ? (
                  provider.specializations.map((specialization, index) => (
                    <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                      {specialization}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No specializations specified</span>
                )}
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-4">Payment Methods</h4>
              <div className="flex flex-wrap gap-2">
                {provider.payment_methods && provider.payment_methods.length > 0 ? (
                  provider.payment_methods.map((method, index) => (
                    <span key={index} className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
                      {method}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No payment methods specified</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
