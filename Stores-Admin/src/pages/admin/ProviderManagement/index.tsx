import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  Eye,
  Star,
  Truck,
  Phone,
  Mail,
  MapPin,
  Building2,
  AlertTriangle,
  Clock,
  Shield,
  DollarSign,
  FileCheck,
  X,
  RefreshCw,
  UserPlus,
  Info
} from 'lucide-react';
import axiosInstance from '../../../services/axiosInstance';
import showRequestError from '../../../helper/showRequestError';
import showMessage from '../../../helper/showMessage';
import ErrorBoundary from '../../../components/ErrorBoundary';
import IconLoader from '../../../components/Icon/IconLoader';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faSort, faSearch, faUser, faEnvelope, faPhone, faCalendarAlt, faEdit, faTrash, faEye, faSpinner, faTruck, faBuilding } from '@fortawesome/free-solid-svg-icons';
import { Provider } from '../../types/provider';
import { fetchProviders, deleteProvider, updateProvider } from '../../store/slices/providerSlice';
import { RootState } from '../../../store';
import DraggableDataTable, { ColumnDefinition } from '../../../components/ui/DraggableDataTable';

interface ServiceArea {
  id: string;
  name: string;
  is_primary: boolean;
  price_multiplier: number;
}

interface InsurancePolicy {
  id: string;
  policy_type: 'transit' | 'cmr' | 'liability';
  coverage_amount: number;
  policy_number: string;
  expiry_date: string;
}

interface Provider {
  id: string;
  user: {
    id: string;
    email: string;
    phone_number: string;
  };
  business_type: 'limited' | 'sole_trader' | 'partnership';
  company_name: string;
  company_reg_number: string;
  vat_registered: boolean;
  vat_number: string;
  business_description: string;
  service_categories: Array<{
    id: string;
    name: string;
  }>;
  specializations: Array<{
    id: string;
    name: string;
  }>;
  service_image: string | null;
  hourly_rate: number | null;
  accepts_instant_bookings: boolean;
  service_radius_km: number;
  insurance_policies: InsurancePolicy[];
  minimum_job_value: number | null;
  verification_status: 'unverified' | 'pending' | 'verified' | 'premium';
  last_verified: string | null;
  created_at: string;
  service_areas: ServiceArea[];
}

const ProviderManagementContent: React.FC = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  
  useEffect(() => {
    fetchProviders();
  }, []);
  
  useEffect(() => {
    if (Array.isArray(providers)) {
      filterProviders();
    }
  }, [providers, searchTerm, statusFilter, verificationFilter]);
  
  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First sync the providers
      await axiosInstance.post("providers/sync_provider_users/");
      
      // Then fetch the updated list
      const response = await axiosInstance.get('/providers/');
      const providerData = Array.isArray(response.data?.results) 
        ? response.data.results 
        : Array.isArray(response.data) 
          ? response.data 
          : [];
      
      setProviders(providerData);
      console.log("the provider data", providerData)
      setFilteredProviders(providerData);
    } catch (err: any) {
      console.error('Error fetching providers:', err);
      setError(err.response?.data?.message || 'Failed to fetch providers. Please try again.');
      setProviders([]);
      setFilteredProviders([]);
    } finally {
      setLoading(false);
    }
  };
  
  const filterProviders = () => {
    if (!Array.isArray(providers)) {
      setFilteredProviders([]);
      return;
    }

    let filtered = [...providers];
    
    // Apply search term filter
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(provider => 
        provider?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider?.company_reg_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply verification filter
    if (verificationFilter !== 'all') {
      filtered = filtered.filter(provider => provider?.verification_status === verificationFilter);
    }
    
    setFilteredProviders(filtered);
    setCurrentPage(1);
  };

  const handleVerificationStatusChange = async (providerId: string, newStatus: string) => {
    try {
      await axiosInstance.patch(`/providers/${providerId}/`, {
        verification_status: newStatus,
        last_verified: new Date().toISOString()
      });
      
      // Update local state
      setProviders(providers.map(provider => 
        provider.id === providerId 
          ? { 
              ...provider, 
              verification_status: newStatus as Provider['verification_status'],
              last_verified: new Date().toISOString()
            }
          : provider
      ));
      
      showMessage('Verification status updated successfully');
      
    } catch (err: any) {
      console.error('Error updating verification status:', err);
      showRequestError(err);
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.post("providers/sync_provider_users/");
      if (response.status === 200) {
        showMessage("Providers updated successfully");
        await fetchProviders(); // Refresh the list
      } 
    } catch (error) {
      showRequestError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!window.confirm('Are you sure you want to delete this provider? This action cannot be undone.')) {
      return;
    }
    
    try {
      await axiosInstance.delete(`/providers/${providerId}/`);
      setProviders(providers.filter(provider => provider.id !== providerId));
      showMessage('Provider deleted successfully');
    } catch (err: any) {
      console.error('Error deleting provider:', err);
      showRequestError(err);
    }
  };

  const getVerificationBadgeClass = (status: string): string => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'unverified': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Safe pagination calculations
  const safeProviders = filteredProviders || [];
  const totalItems = safeProviders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentItems = safeProviders.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.min(Math.max(1, newPage), totalPages));
  };

  const handleAddProviderClick = () => {
    setShowAddProviderModal(true);
  };

  const closeAddProviderModal = () => {
    setShowAddProviderModal(false);
  };

  const handleGoToAddUser = () => {
    navigate('/admin/users/new');
    setShowAddProviderModal(false);
  };

  const providerColumns: ColumnDefinition[] = [
    {
      accessor: 'provider',
      title: 'Provider',
      width: 250,
      render: (provider: Provider) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            {provider.service_image ? (
              <img
                className="h-10 w-10 rounded-full object-cover"
                src={provider.service_image}
                alt={provider.company_name || 'Provider'}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-500" />
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {provider.company_name || 'Unnamed Company'}
            </div>
            <div className="text-sm text-gray-500 flex items-center">
              <Mail className="w-4 h-4 mr-1" />
              {provider.user?.email || 'No email'}
            </div>
            <div className="text-sm text-gray-500 flex items-center">
              <Phone className="w-4 h-4 mr-1" />
              {provider.user?.phone_number || 'No phone'}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessor: 'business_type',
      title: 'Business Type',
      width: 120,
      render: (provider: Provider) => (
        <span className="capitalize">
          {provider.business_type?.replace('_', ' ') || 'Unknown'}
        </span>
      ),
    },
    {
      accessor: 'verification_status',
      title: 'Verification',
      width: 140,
      render: (provider: Provider) => (
        <div>
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getVerificationBadgeClass(provider.verification_status || 'unverified')}`}>
            {(provider.verification_status || 'unverified').replace('_', ' ')}
          </span>
          {provider.last_verified && (
            <div className="text-xs text-gray-500 mt-1 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {new Date(provider.last_verified).toLocaleDateString()}
            </div>
          )}
        </div>
      ),
    },
    {
      accessor: 'service_area',
      title: 'Service Area',
      width: 120,
      render: (provider: Provider) => (
        <div>
          <div className="text-sm text-gray-900">
            {provider.service_radius_km || 0}km radius
          </div>
          <div className="text-xs text-gray-500">
            {(provider.service_areas || []).length} defined areas
          </div>
        </div>
      ),
    },
    {
      accessor: 'insurance',
      title: 'Insurance',
      width: 120,
      render: (provider: Provider) => (
        <div className="text-sm">
          {(provider.insurance_policies || []).length > 0 ? (
            (provider.insurance_policies || []).map(policy => (
              <div key={policy.id} className="flex items-center text-xs mb-1">
                <Shield className="w-3 h-3 mr-1" />
                {policy.policy_type}
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-400 flex items-center">
              <Shield className="w-3 h-3 mr-1" />
              No insurance
            </div>
          )}
        </div>
      ),
    },
    {
      accessor: 'created_at',
      title: 'Joined',
      width: 100,
      render: (provider: Provider) => (
        <span className="text-sm text-gray-500">
          {provider.created_at ? new Date(provider.created_at).toLocaleDateString() : 'Unknown'}
        </span>
      ),
    },
    {
      accessor: 'actions',
      title: 'Actions',
      width: 160,
      textAlign: 'right',
      render: (provider: Provider) => (
        <div className="flex justify-end space-x-2">
          <Link
            to={`/admin/providers/${provider.id}`}
            className="text-blue-600 hover:text-blue-900"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            to={`/admin/providers/${provider.id}/edit`}
            className="text-indigo-600 hover:text-indigo-900"
            title="Edit Provider"
          >
            <Edit className="w-4 h-4" />
          </Link>
          {provider.verification_status !== 'verified' && (
            <button
              onClick={() => handleVerificationStatusChange(provider.id, 'verified')}
              className="text-green-600 hover:text-green-900"
              title="Verify Provider"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleDeleteProvider(provider.id)}
            className="text-red-600 hover:text-red-900"
            title="Delete Provider"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
<IconLoader />
        </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="text-red-500 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          {error}
        </div>
        <button
          onClick={fetchProviders}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold mb-4 md:mb-0">Provider Management</h2>
        <div className="flex gap-4">
          <button
            onClick={handleSync}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center justify-center"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sync Providers
          </button>
          <button
            onClick={fetchProviders}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleAddProviderClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Provider
          </button>
        </div>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
        <DraggableDataTable
          data={filteredProviders}
          columns={providerColumns}
          title="Providers"
          loading={loading}
          storeKey="provider-management-table"
          onRefreshData={fetchProviders}
          allowSelection={false}
          // You can add bulkActions, extraFilters, etc. as needed
        />
      </div>

      {/* Add Provider Modal */}
      {showAddProviderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Add a New Provider
                </h2>
              </div>
              <button
                onClick={closeAddProviderModal}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                      How to Add a Provider
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Providers are created by adding new users with the provider user type. This ensures proper user authentication and account management.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Go to Add New User</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Navigate to the user management page to create a new user account</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Set User Type as Provider</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Select "Provider" as the user type during account creation</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Complete Registration</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">The user will complete their provider profile after account creation</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Ready to add a provider?
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Click below to go to the user management page and get started.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeAddProviderModal}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGoToAddUser}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-lg shadow-emerald-600/25 transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Go to Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProviderManagement: React.FC = () => {
  return (
    <ErrorBoundary>
      <ProviderManagementContent />
    </ErrorBoundary>
  );
};

export default ProviderManagement;