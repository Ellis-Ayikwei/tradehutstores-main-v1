import React, { useState, useEffect } from 'react';
import { Car, Edit, Trash2, Plus, X, Save, Loader2 } from 'lucide-react';
import DraggableDataTable from '../../../../../../components/ui/DraggableDataTable';
import axiosInstance from '../../../../../../services/axiosInstance';
import { useBulkActions } from '../../../../../../hooks/useBulkActions';

interface VehicleType {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VehicleSize {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface VehicleCategory {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  image: string | null;
  color: string | null;
  tab_color: string | null;
  is_active: boolean;
  type: {
    id: string;
    name: string;
  };
  vehicle_size: {
    id: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

interface VehicleCategoryFormData {
  name: string;
  description: string;
  icon: string;
  image: string;
  color: string;
  tab_color: string;
  type_id: string;
  vehicle_size_id: string;
  is_active: boolean;
}

const VehicleCategoriesTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<VehicleCategory | null>(null);
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [vehicleSizes, setVehicleSizes] = useState<VehicleSize[]>([]);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>('');
  const [categoryFormData, setCategoryFormData] = useState<VehicleCategoryFormData>({
    name: '',
    description: '',
    icon: '',
    image: '',
    color: '',
    tab_color: '',
    type_id: '',
    vehicle_size_id: '',
    is_active: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesResponse, typesResponse, sizesResponse] = await Promise.all([
        axiosInstance.get('/vehicle-categories/'),
        axiosInstance.get('/vehicle-types/'),
        axiosInstance.get('/vehicle-sizes/')
      ]);
      

      console.log(categoriesResponse.data);
      const categoriesData = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : categoriesResponse.data.results || [];
      const typesData = Array.isArray(typesResponse.data) ? typesResponse.data : typesResponse.data.results || [];
      const sizesData = Array.isArray(sizesResponse.data) ? sizesResponse.data : sizesResponse.data.results || [];
      
      setVehicleCategories(categoriesData);
      setVehicleTypes(typesData);
      setVehicleSizes(sizesData);
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
        endpoint: '/vehicle-categories/{id}/activate/',
        method: 'PUT'
      },
      deactivate: {
        endpoint: '/vehicle-categories/{id}/deactivate/',
        method: 'PUT'
      },
      delete: {
        endpoint: '/vehicle-categories/{id}/',
        method: 'DELETE'
      }
    },
    fetchData,
    setError
  });

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddNew = () => {
    setEditingItem(null);
    setCategoryFormData({ 
      name: '', 
      description: '', 
      icon: '', 
      image: '', 
      color: '', 
      tab_color: '', 
      type_id: '', 
      vehicle_size_id: '', 
      is_active: true 
    });
    setShowModal(true);
  };

  const handleEdit = (item: VehicleCategory) => {
    setEditingItem(item);
    setCategoryFormData({
      name: item?.name,
      description: item?.description,
      icon: item?.icon || '',
      image: item?.image || '',
      color: item?.color || '',
      tab_color: item?.tab_color || '',
      type_id: item?.type?.id || '',
      vehicle_size_id: item?.vehicle_size?.id || '',
      is_active: item?.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await axiosInstance.delete(`/vehicle-categories/${id}/`);
      setVehicleCategories(vehicleCategories.filter(category => category.id !== id));
    } catch (err: any) {
      setError('Failed to delete item: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingItem) {
        await axiosInstance.put(`/vehicle-categories/${editingItem.id}/`, categoryFormData);
      } else {
        await axiosInstance.post('/vehicle-categories/', categoryFormData);
      }
      
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError('Failed to save item: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Column definitions for vehicle categories
  const categoriesColumns = [
    {
      accessor: 'name',
      title: 'Name',
      width: 200,
      render: (record: VehicleCategory) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <Car className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{record?.name || 'N/A'}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{record?.description || 'N/A'}</div>
          </div>
        </div>
      )
    },
    {
      accessor: 'type',
      title: 'Type',
      width: 150,
      render: (record: VehicleCategory) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{record?.type?.name || 'N/A'}</span>
      )
    },
    {
      accessor: 'vehicle_size',
      title: 'Size',
      width: 150,
      render: (record: VehicleCategory) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{record?.vehicle_size?.name || 'N/A'}</span>
      )
    },
    {
      accessor: 'is_active',
      title: 'Status',
      width: 100,
      render: (record: VehicleCategory) => (
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
      render: (record: VehicleCategory) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(record.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      accessor: 'actions',
      title: 'Actions',
      width: 120,
      render: (record: VehicleCategory) => (
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

  const getCurrentData = () => {
    // Filter categories by selected type and size
    let filtered = vehicleCategories;
    if (selectedTypeFilter) {
      filtered = filtered.filter(category => category.type?.id === selectedTypeFilter);
    }
    if (selectedSizeFilter) {
      filtered = filtered.filter(category => category?.vehicle_size?.id === selectedSizeFilter);
    }
    return filtered;
  };

  const handleClearFilters = () => {
    setSelectedTypeFilter('');
    setSelectedSizeFilter('');
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
          <span>Activate</span>
        )}
      </button>
      <button
        onClick={() => handleBulkDeactivate(selectedRecords)}
        disabled={bulkActionLoading}
        className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {bulkActionLoading ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <span>Deactivate</span>
        )}
      </button>
      <button
        onClick={() => handleBulkDelete(selectedRecords)}
        disabled={bulkActionLoading}
        className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {bulkActionLoading ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <span>Delete</span>
        )}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Vehicle Categories</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage vehicle categories and their configurations
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh data"
          >
            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Category
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <DraggableDataTable
          data={getCurrentData()}
          columns={categoriesColumns}
          title="Vehicle Categories"
          loading={loading}
          allowSelection={true}
          bulkActions={BulkActions}
          extraFilters={
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">All Types</option>
                  {vehicleTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Size:</span>
                <select
                  value={selectedSizeFilter}
                  onChange={(e) => setSelectedSizeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">All Sizes</option>
                  {vehicleSizes.map((size) => (
                    <option key={size.id} value={size.id}>
                      {size?.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          }
          onSelectionChange={(selectedRows: any[]) => {
            console.log('Selected rows:', selectedRows);
          }}
        />
      </div>

      {/* CRUD Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingItem ? 'Edit' : 'Add'} Vehicle Category
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={categoryFormData?.name}
                  onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type *
                </label>
                <select
                  value={categoryFormData.type_id}
                  onChange={(e) => setCategoryFormData({...categoryFormData, type_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Select a type</option>
                  {vehicleTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Size *
                </label>
                <select
                  value={categoryFormData.vehicle_size_id}
                  onChange={(e) => setCategoryFormData({...categoryFormData, vehicle_size_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Select a size</option>
                  {vehicleSizes.map((size) => (
                    <option key={size.id} value={size.id}>
                      {size?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Icon
                </label>
                <input
                  type="text"
                  value={categoryFormData.icon}
                  onChange={(e) => setCategoryFormData({...categoryFormData, icon: e.target.value})}
                  placeholder="fas fa-truck"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <input
                  type="text"
                  value={categoryFormData.color}
                  onChange={(e) => setCategoryFormData({...categoryFormData, color: e.target.value})}
                  placeholder="#3B82F6"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={categoryFormData.is_active}
                    onChange={(e) => setCategoryFormData({...categoryFormData, is_active: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleCategoriesTab; 