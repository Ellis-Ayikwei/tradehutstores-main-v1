import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DriversTab from './tabs/driversTab/DriversTab';
import { JobsTab } from './tabs/jobsTab/JobsTab';
import { OverviewTab } from './tabs/oververiewTab/OverviewTab';
import { ReviewsTab } from './tabs/reviewsTab/ReviewsTab';
import { VehiclesTab } from './tabs/vehiclesTab/VehiclesTab';

import IconLoader from '../../../../components/Icon/IconLoader';
import axiosInstance from '../../../../services/axiosInstance';
import confirmDialog from '../../../../helper/confirmDialog';
import { ProviderHeader } from './ProviderHeader';
import { NavigationTabs } from '../../usermanagment/NavigationTabs';
import { Provider } from './types';
import { PaymentsTab } from './tabs/paymentsTab/PaymentsTab';
import DocumentsTab from './tabs/documentsTab/DocumentsTab';
import LocationTab from './tabs/locationTab/LocationTab';
import ServicesTab from './tabs/servicesTab/ServicesTab';

const ProviderDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [provider, setProvider] = useState<Provider | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [showActivateModal, setShowActivateModal] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);

    const [saveLoading, setSaveLoading] = useState({
        activate: false,
        suspend: false,
        verify: false,
        unverify: false,
        delete: false,
    });

    useEffect(() => {
        fetchProviderDetails();
    }, [id]);

    const fetchProviderDetails = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axiosInstance.get(`/providers/${id}/`);
            setProvider(response.data);
            console.log('the provider data is ', response.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch provider details');
            console.error('Error fetching provider details:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleActivateProvider = async () => {
        setSaveLoading({ ...saveLoading, activate: true });
        try {
            await axiosInstance.patch(`/providers/${id}/activate/`);
            if (provider) {
                setProvider({ ...provider, user: { ...provider.user, account_status: 'active' } });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to activate provider');
        } finally {
            setSaveLoading({ ...saveLoading, activate: false });
        }
    };

    const handleSuspendProvider = async () => {
        setSaveLoading({ ...saveLoading, suspend: true });
        const confirmed = await confirmDialog({
            title: 'Suspend Provider',
            body: `Are you sure you want to suspend ${provider?.company_name}? This will prevent them from accessing the platform and accepting new jobs.`,
            note: 'The provider will be notified of this action and can contact support for reinstatement.',
            finalQuestion: 'Do you want to proceed with suspending this provider?',
            type: 'warning',
            confirmText: 'Suspend',
        });

        if (!confirmed) return;

        try {
            await axiosInstance.patch(`/providers/${id}/suspend/`);
            if (provider) {
                setProvider({ ...provider, user: { ...provider.user, account_status: 'suspended' } });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to suspend provider');
        } finally {
            setSaveLoading({ ...saveLoading, suspend: false });
        }
    };

    const handleVerifyProvider = async () => {
        setSaveLoading({ ...saveLoading, verify: true });
        const confirmed = await confirmDialog({
            title: 'Verify Provider',
            body: `Are you sure you want to verify ${provider?.company_name}? This will allow them to access the platform and accept new jobs.`,
            note: 'The provider will be notified of this action and can contact support for verification.',
            finalQuestion: 'Do you want to proceed with verifying this provider?',
            type: 'warning',
            confirmText: 'Verify',
        });
        try {
            await axiosInstance.patch(`/providers/${id}/verify/`);
            if (provider) {
                setProvider({ ...provider, verification_status: 'verified' });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to verify provider');
        } finally {
            setSaveLoading({ ...saveLoading, verify: false });
        }
    };

    const handleUnverifyProvider = async () => {
        setSaveLoading({ ...saveLoading, unverify: true });
        const confirmed = await confirmDialog({
            title: 'Unverify Provider',
            body: `Are you sure you want to unverify ${provider?.company_name}? This will prevent them from accessing the platform and accepting new jobs.`,
            note: 'The provider will be notified of this action and can contact support for verification.',
            finalQuestion: 'Do you want to proceed with unverifying this provider?',
            type: 'warning',
            confirmText: 'Unverify',
        });
        try {
            await axiosInstance.patch(`/providers/${id}/unverify/`);
            if (provider) {
                setProvider({ ...provider, verification_status: 'unverified' });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to unverify provider');
        } finally {
            setSaveLoading({ ...saveLoading, unverify: false });
        }
    };	

    const handleDeleteProvider = async () => {
        setSaveLoading({ ...saveLoading, delete: true });
        if (window.confirm('Are you sure you want to delete this provider?')) {
            try {
                await axiosInstance.delete(`/providers/${id}/`);
                navigate('/admin/providers');
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to delete provider');
            } finally {
                setSaveLoading({ ...saveLoading, delete: false });
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <IconLoader />
            </div>
        );
    }

    if (error || !provider) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
                <div className="flex items-center">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="mr-3" />
                    <p>{error || 'Provider not found'}</p>
                </div>
                <div className="mt-4 flex gap-4">
                    <button
                        onClick={fetchProviderDetails}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                    >
                        Try Again
                    </button>
                    <Link to="/admin/providers" className="text-red-700 hover:text-red-900 font-medium">
                        Back to Providers
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="mx-auto py-8">
                <ProviderHeader provider={provider} onActivate={handleActivateProvider} onSuspend={handleSuspendProvider} onVerify={handleVerifyProvider} onUnverify={handleUnverifyProvider} onDelete={handleDeleteProvider} saveLoading={saveLoading} />

                {/* <div className="mt-6">
          <ProviderSummary provider={provider} />
        </div> */}

                <div className="mt-6">
                    <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
                </div>

                <div className="mt-6">
                    {activeTab === 'overview' && <OverviewTab provider={provider} mutateProvider={fetchProviderDetails}/>}
                    {activeTab === 'vehicles' && <VehiclesTab provider={provider} onProviderUpdate={fetchProviderDetails} />}
                    {activeTab === 'drivers' && <DriversTab provider={provider} />}
                    {activeTab === 'jobs' && <JobsTab provider={provider} />}
                    {activeTab === 'payments' && <PaymentsTab provider={provider} />}
                    {activeTab === 'reviews' && <ReviewsTab provider={provider} />}
                    {activeTab === 'documents' && <DocumentsTab provider={provider} />}
                    {activeTab === 'location' && <LocationTab provider={provider} onProviderUpdate={fetchProviderDetails} />}
                    {activeTab === 'services' && <ServicesTab provider={provider} onProviderUpdate={fetchProviderDetails} />}
                </div>
            </div>
        </div>
    );
};

export default ProviderDetail;
