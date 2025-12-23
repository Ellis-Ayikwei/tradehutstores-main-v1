import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Save, Loader2, Plus, Minus, Package, Star } from 'lucide-react';

interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  services_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  service_category: {
    id: string;
    name: string;
    slug: string;
  };
  icon: string | null;
  providers_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  item_categories?: Array<{ id: string; name: string }>; // Updated to match API response
}

interface ServiceFormData {
  name: string;
  description: string;
  service_category: string;
  icon: string;
  item_categories: string[]; // New field for item categories
}

interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
}

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServiceFormData | CategoryFormData) => Promise<void>;
  modalType: 'category' | 'service';
  editingItem: ServiceCategory | Service | null;
  categories: ServiceCategory[];
  loading: boolean;
  itemCategories?: Array<{ id: string; name: string }>; // Available item categories
}

const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  modalType,
  editingItem,
  categories,
  loading,
  itemCategories = []
}) => {
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    icon: ''
  });

  const [serviceFormData, setServiceFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    service_category: '',
    icon: '',
    item_categories: []
  });

  const [selectedItemCategories, setSelectedItemCategories] = useState<string[]>([]);

  // Initialize form data when editing
  React.useEffect(() => {
    if (editingItem) {
      if (modalType === 'category') {
        const category = editingItem as ServiceCategory;
        setCategoryFormData({
          name: category?.name || '',
          description: category.description || '',
          icon: category.icon || ''
        });
      } else {
        const service = editingItem as Service;
        setServiceFormData({
          name: service?.name || '',
          description: service.description || '',
          service_category: service.service_category?.id || '',
          icon: service.icon || '',
          item_categories: service.item_categories?.map(cat => cat.id) || []
        });
        setSelectedItemCategories(service.item_categories?.map(cat => cat.id) || []);
      }
    } else {
      // Reset form data for new items
      setCategoryFormData({ name: '', description: '', icon: '' });
      setServiceFormData({ name: '', description: '', service_category: '', icon: '', item_categories: [] });
      setSelectedItemCategories([]);
    }
  }, [editingItem, modalType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (modalType === 'service') {
      const dataToSubmit = {
        ...serviceFormData,
        item_categories: selectedItemCategories
      };
      await onSubmit(dataToSubmit);
    } else {
      await onSubmit(categoryFormData);
    }
  };

  const handleItemCategoryToggle = (categoryId: string) => {
    setSelectedItemCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const addNewItemCategory = () => {
    const newCategoryName = prompt('Enter new item category name:');
    if (newCategoryName && newCategoryName.trim()) {
      // This would typically make an API call to create the item category
      // For now, we'll just add it to the local state
      const newCategory = {
        id: `temp_${Date.now()}`,
        name: newCategoryName.trim()
      };
      // You would need to implement the API call here
      console.log('Creating new item category:', newCategory);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      {modalType === 'category' ? (
                        <Package className="w-5 h-5 text-white" />
                      ) : (
                        <Star className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
                        {editingItem ? 'Edit' : 'Add'} {modalType === 'category' ? 'Category' : 'Service'}
                      </Dialog.Title>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {editingItem ? 'Update the details below' : 'Fill in the details to create a new item'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {modalType === 'category' ? (
                    <>
                      {/* Category Form Fields */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={categoryFormData.name}
                            onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                            placeholder="Enter category name"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Description
                          </label>
                          <textarea
                            value={categoryFormData.description}
                            onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})}
                            rows={3}
                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                            placeholder="Enter category description"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Icon
                          </label>
                          <input
                            type="text"
                            value={categoryFormData.icon}
                            onChange={(e) => setCategoryFormData({...categoryFormData, icon: e.target.value})}
                            placeholder="fas fa-truck"
                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Service Form Fields */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={serviceFormData.name}
                            onChange={(e) => setServiceFormData({...serviceFormData, name: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                            placeholder="Enter service name"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Category *
                          </label>
                          <select
                            value={serviceFormData.service_category}
                            onChange={(e) => setServiceFormData({...serviceFormData, service_category: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                            required
                          >
                            <option value="">Select a category</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category?.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Description
                          </label>
                          <textarea
                            value={serviceFormData.description}
                            onChange={(e) => setServiceFormData({...serviceFormData, description: e.target.value})}
                            rows={3}
                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                            placeholder="Enter service description"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Icon
                          </label>
                          <input
                            type="text"
                            value={serviceFormData.icon}
                            onChange={(e) => setServiceFormData({...serviceFormData, icon: e.target.value})}
                            placeholder="fas fa-truck"
                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                          />
                        </div>

                        {/* Item Categories Section */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Item Categories
                            </label>
                            <button
                              type="button"
                              onClick={addNewItemCategory}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium flex items-center"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add New
                            </button>
                          </div>
                          
                          <div className="border-2 border-gray-200 dark:border-gray-600 rounded-lg p-4 min-h-[120px]">
                            {itemCategories.length === 0 ? (
                              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No item categories available</p>
                                <p className="text-sm">Click "Add New" to create one</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                {itemCategories.map((category) => (
                                  <div
                                    key={category.id}
                                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                      selectedItemCategories.includes(category.id)
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                                    onClick={() => handleItemCategoryToggle(category.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {category.name}
                                      </span>
                                      {selectedItemCategories.includes(category.id) ? (
                                        <Minus className="w-4 h-4 text-blue-500" />
                                      ) : (
                                        <Plus className="w-4 h-4 text-gray-400" />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {selectedItemCategories.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                Selected categories ({selectedItemCategories.length}):
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {selectedItemCategories.map((categoryId) => {
                                  const category = itemCategories.find(c => c.id === categoryId);
                                  return (
                                    <span
                                      key={categoryId}
                                      className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-sm font-medium"
                                    >
                                      {category?.name}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-3 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {editingItem ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ServiceModal;
