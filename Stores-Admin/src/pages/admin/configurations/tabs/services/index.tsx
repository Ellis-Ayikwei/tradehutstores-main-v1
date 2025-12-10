import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Star, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  Tag,
  Users,
  Building,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  Loader2,
  Save
} from 'lucide-react';
import DraggableDataTable from '../../../../../components/ui/DraggableDataTable';
import axiosInstance from '../../../../../services/axiosInstance';
import { useBulkActions } from '../../../../../hooks/useBulkActions';
import ServiceModal from './components/ServiceModal';

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

const ServicesConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'services'>('categories');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'category' | 'service'>('category');
  const [editingItem, setEditingItem] = useState<ServiceCategory | Service | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [itemCategories, setItemCategories] = useState<Array<{ id: string; name: string }>>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'categories') {
        const response = await axiosInstance.get('/service-categories/');
        // Handle both array and object responses
        const data = Array.isArray(response.data) ? response.data : response.data.results || [];
        console.log("logged data", data)
        setCategories(data);
      } else {
        const response = await axiosInstance.get('/services/');
        // Handle both array and object responses
        const data = Array.isArray(response.data) ? response.data : response.data.results || [];
        console.log("the logged", data)
        setServices(data);
      }
      
      // Fetch item categories for services
      try {
        const itemCategoriesResponse = await axiosInstance.get('/item-categories/');
        const itemCategoriesData = Array.isArray(itemCategoriesResponse.data) 
          ? itemCategoriesResponse.data 
          : itemCategoriesResponse.data.results || [];
        setItemCategories(itemCategoriesData);
      } catch (itemErr) {
        console.log('Item categories not available yet:', itemErr);
        // This is expected if the backend doesn't have item categories yet
      }
    } catch (err: any) {
      setError('Failed to load data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Use the bulk actions hook with configuration
  const { bulkActionLoading, handleBulkActivate, handleBulkDeactivate, handleBulkDelete } = useBulkActions({
    config: {
      activate: {
        endpoint: activeTab === 'categories' ? '/service-categories/{id}/activate/' : '/services/{id}/activate/',
        method: 'PUT'
      },
      deactivate: {
        endpoint: activeTab === 'categories' ? '/service-categories/{id}/deactivate/' : '/services/{id}/deactivate/',
        method: 'PUT'
      },
      delete: {
        endpoint: activeTab === 'categories' ? '/service-categories/{id}/' : '/services/{id}/',
        method: 'DELETE'
      }
    },
    fetchData,
    setError
  });

  const tabs = [
    { key: 'categories', label: 'Service Categories', icon: Package },
    { key: 'services', label: 'Services', icon: Star }
  ] as const;

  // Form data state
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
  
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleAddNew = (type: 'category' | 'service') => {
    setModalType(type);
    setEditingItem(null);
    if (type === 'category') {
      setCategoryFormData({ name: '', description: '', icon: '' });
    } else {
      setServiceFormData({ name: '', description: '', service_category: '', icon: '', item_categories: [] });
    }
    setShowModal(true);
  };

  const handleEdit = (item: ServiceCategory | Service) => {
    setEditingItem(item);
    setModalType(activeTab === 'categories' ? 'category' : 'service');
    
    if (activeTab === 'categories') {
      const category = item as ServiceCategory;
      setCategoryFormData({
        name: category?.name,
        description: category.description,
        icon: category.icon || ''
      });
    } else {
      const service = item as Service;
      setServiceFormData({
        name: service?.name,
        description: service.description,
        service_category: service.service_category.id,
        icon: service.icon || '',
        item_categories: service.item_categories?.map(cat => cat.id) || []
      });
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      if (activeTab === 'categories') {
        await axiosInstance.delete(`/service-categories/${id}/`);
        setCategories(categories.filter(cat => cat.id !== id));
      } else {
        await axiosInstance.delete(`/services/${id}/`);
        setServices(services.filter(service => service.id !== id));
      }
    } catch (err: any) {
      setError('Failed to delete item: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSubmit = async (data: ServiceFormData | CategoryFormData) => {
    setLoading(true);

    try {
      if (modalType === 'category') {
        const categoryData = data as CategoryFormData;
        if (editingItem) {
          await axiosInstance.put(`/service-categories/${editingItem.id}/`, categoryData);
        } else {
          await axiosInstance.post('/service-categories/', categoryData);
        }
      } else {
        const serviceData = data as ServiceFormData;
        if (editingItem) {
          await axiosInstance.put(`/services/${editingItem.id}/`, serviceData);
        } else {
          await axiosInstance.post('/services/', serviceData);
        }
      }
      
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError('Failed to save item: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Column definitions for categories
  const categoriesColumns = [
    {
      accessor: 'name',
      title: 'Name',
      width: 200,
      render: (record: ServiceCategory) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{record?.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{record.description}</div>
          </div>
        </div>
      )
    },
    {
      accessor: 'slug',
      title: 'Slug',
      width: 150,
      render: (record: ServiceCategory) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{record.slug}</span>
      )
    },
    {
      accessor: 'services_count',
      title: 'Services',
      width: 100,
      render: (record: ServiceCategory) => (
        <span className="font-medium text-green-600 dark:text-green-400">{record.services_count}</span>
      )
    },
    {
      accessor: 'is_active',
      title: 'Status',
      width: 100,
      render: (record: ServiceCategory) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          record.is_active 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {record.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      accessor: 'created_at',
      title: 'Created',
      width: 120,
      render: (record: ServiceCategory) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(record.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      accessor: 'actions',
      title: 'Actions',
      width: 120,
      render: (record: ServiceCategory) => (
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => handleEdit(record)}
            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDelete(record.id)}
            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  // Column definitions for services
  const servicesColumns = [
    {
      accessor: 'name',
      title: 'Name',
      width: 200,
      render: (record: Service) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Star className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{record?.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{record.description}</div>
          </div>
        </div>
      )
    },
    {
      accessor: 'service_category',
      title: 'Category',
      width: 150,
      render: (record: Service) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{record.service_category?.name}</span>
      )
    },
    {
      accessor: 'providers_count',
      title: 'Providers',
      width: 100,
      render: (record: Service) => (
        <span className="font-medium text-blue-600 dark:text-blue-400">{record.providers_count}</span>
      )
    },
    {
      accessor: 'is_active',
      title: 'Status',
      width: 100,
      render: (record: Service) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          record.is_active
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {record.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      accessor: 'created_at',
      title: 'Created',
      width: 120,
      render: (record: Service) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(record.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      accessor: 'actions',
      title: 'Actions',
      width: 120,
      render: (record: Service) => (
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => handleEdit(record)}
            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDelete(record.id)}
            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const getCurrentColumns = () => {
    return activeTab === 'categories' ? categoriesColumns : servicesColumns;
  };

  const getCurrentData = () => {
    if (activeTab === 'categories') {
      return categories;
    } else {
      // Filter services by selected category
      if (selectedCategoryFilter) {
        return services.filter(service => service.service_category.id === selectedCategoryFilter);
      }
      return services;
    }
  };

  const handleClearFilters = () => {
    setSelectedCategoryFilter('');
  };

  // Bulk actions component
  const BulkActions = (selectedRecords: any[]) => (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {selectedRecords.length} item(s) selected
      </span>
      <button
        onClick={() => handleBulkActivate(selectedRecords)}
        disabled={bulkActionLoading}
        className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {bulkActionLoading ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <CheckCircle className="w-4 h-4 mr-1" />
        )}
        Activate
      </button>
      <button
        onClick={() => handleBulkDeactivate(selectedRecords)}
        disabled={bulkActionLoading}
        className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {bulkActionLoading ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <XCircle className="w-4 h-4 mr-1" />
        )}
        Deactivate
      </button>
      <button
        onClick={() => handleBulkDelete(selectedRecords)}
        disabled={bulkActionLoading}
        className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {bulkActionLoading ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4 mr-1" />
        )}
        Delete
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Service Configuration</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage service categories and services
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => handleAddNew(activeTab === 'categories' ? 'category' : 'service')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New {activeTab === 'categories' ? 'Category' : 'Service'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <DraggableDataTable
          data={getCurrentData()}
          columns={getCurrentColumns()}
          title={activeTab === 'categories' ? 'Service Categories' : 'Services'}
          loading={loading}
          allowSelection={true}
          bulkActions={BulkActions}
          extraFilters={
            activeTab === 'services' ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category:</span>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category?.name} ({category.services_count} services)
                      </option>
                    ))}
                  </select>
                  {selectedCategoryFilter && (
                    <button
                      onClick={() => setSelectedCategoryFilter('')}
                      className="inline-flex items-center px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            ) : undefined
          }
          onClearFilters={activeTab === 'services' ? handleClearFilters : undefined}
          hasActiveFilters={activeTab === 'services' && selectedCategoryFilter !== ''}
          onSelectionChange={(selectedRows: any[]) => {
            console.log('Selected rows:', selectedRows);
          }}
        />
      </div>

      {/* Service Modal */}
      <ServiceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        modalType={modalType}
        editingItem={editingItem}
        categories={categories}
        loading={loading}
        itemCategories={itemCategories}
      />
    </div>
  );
};

export default ServicesConfig; 