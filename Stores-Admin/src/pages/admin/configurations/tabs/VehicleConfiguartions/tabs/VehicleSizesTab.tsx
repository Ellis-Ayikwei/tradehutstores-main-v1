import React, { useState, useEffect } from 'react';
import { Package, Edit, Trash2, Plus, X, Save, Loader2 } from 'lucide-react';
import DraggableDataTable from '../../../../../../components/ui/DraggableDataTable';
import axiosInstance from '../../../../../../services/axiosInstance';
import { useBulkActions } from '../../../../../../hooks/useBulkActions';

interface VehicleSize {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface VehicleSizeFormData {
  name: string;
  description: string;
}

const VehicleSizesTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<VehicleSize | null>(null);
  const [vehicleSizes, setVehicleSizes] = useState<VehicleSize[]>([]);
  const [sizeFormData, setSizeFormData] = useState<VehicleSizeFormData>({
    name: '',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/vehicle-sizes/');
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setVehicleSizes(data);
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
        endpoint: '/vehicle-sizes/{id}/activate/',
        method: 'PUT'
      },
      deactivate: {
        endpoint: '/vehicle-sizes/{id}/deactivate/',
        method: 'PUT'
      },
      delete: {
        endpoint: '/vehicle-sizes/{id}/',
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
    setSizeFormData({ name: '', description: '' });
    setShowModal(true);
  };

  const handleEdit = (item: VehicleSize) => {
    setEditingItem(item);
    setSizeFormData({
      name: item.name,
      description: item.description
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await axiosInstance.delete(`/vehicle-sizes/${id}/`);
      setVehicleSizes(vehicleSizes.filter(size => size.id !== id));
    } catch (err: any) {
      setError('Failed to delete item: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingItem) {
        await axiosInstance.put(`/vehicle-sizes/${editingItem.id}/`, sizeFormData);
      } else {
        await axiosInstance.post('/vehicle-sizes/', sizeFormData);
      }
      
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError('Failed to save item: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Column definitions for vehicle sizes
  const sizesColumns = [
    {
      accessor: 'name',
      title: 'Name',
      width: 200,
      render: (record: VehicleSize) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{record.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{record.description}</div>
          </div>
        </div>
      )
    },
    {
      accessor: 'created_at',
      title: 'Created',
      width: 120,
      render: (record: VehicleSize) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(record.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      accessor: 'actions',
      title: 'Actions',
      width: 120,
      render: (record: VehicleSize) => (
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Vehicle Sizes</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage vehicle sizes and their configurations
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
            Add New Size
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <DraggableDataTable
          data={vehicleSizes}
          columns={sizesColumns}
          title="Vehicle Sizes"
          loading={loading}
          allowSelection={true}
          bulkActions={BulkActions}
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
                {editingItem ? 'Edit' : 'Add'} Vehicle Size
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
                  value={sizeFormData.name}
                  onChange={(e) => setSizeFormData({...sizeFormData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={sizeFormData.description}
                  onChange={(e) => setSizeFormData({...sizeFormData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
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

export default VehicleSizesTab; 