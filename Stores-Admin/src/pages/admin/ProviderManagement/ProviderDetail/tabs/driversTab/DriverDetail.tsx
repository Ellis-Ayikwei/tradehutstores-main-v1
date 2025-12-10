import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Edit, 
    AlertCircle, 
    Loader2, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Plus, 
    Eye, 
    Download, 
    Trash2, 
    Briefcase, 
    IdCard, 
    Award, 
    FileText,
    User,
    AlertTriangle,
    Pencil,
    Settings,
    UserX,
    UserCheck,
    Ban
} from 'lucide-react';
import axiosInstance from '../../../../../../services/axiosInstance';
import useSWR from 'swr';
import fetcher from '../../../../../../services/fetcher';
import { Driver } from '../../../../../../types/driver';
import DocumentViewer from '../documentsTab/DocumentViewer';
import VerifyDocumentModal from '../documentsTab/VerifyDocumentModal';
import ConfirmDialog from '../../../../../../helper/confirmDialog';
import dayjs from 'dayjs';
import renderErrorMessage from '../../../../../../helper/renderErrorMessage';
import { showNotification } from '../../../../../../utilities/showNotifcation';

interface DriverDocument {
    id: string;
    document_type: string;
    document_front: string;
    document_back?: string;
    front_url: string;
    back_url?: string;
    has_two_sides: boolean;
    name: string;
    type: string;
    issue_date: string;
    expiry_date?: string;
    reference_number: string;
    notes?: string;
    is_verified: boolean;
    rejection_reason?: string | null;
    status: 'pending' | 'verified' | 'rejected';
    created_at: string;
    updated_at: string;
}

const DriverDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<DriverDocument | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [verifyAction, setVerifyAction] = useState<'verify' | 'reject'>('verify');
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isUpdatingVerification, setIsUpdatingVerification] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const { data: driverData, error: driverError, mutate: mutateDriver } = useSWR<Driver>(
        `/drivers/${id}/`,
        fetcher
    );

    console.log("driverData", driverData)

    const { data: documents, error: documentsError, mutate: mutateDocuments } = useSWR<DriverDocument[]>(
        `/drivers/${id}/documents/`,
        fetcher
    );



    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([mutateDriver(), mutateDocuments()]);
        setIsRefreshing(false);
    };

    const handleVerify = async (document: DriverDocument, note: string) => {
        try {
            await axiosInstance.post(`/drivers/${id}/verify_document/`, {
                is_verified: true,
                document_id: document.id,
                verification_note: note
            });
            await mutateDocuments();
            setIsVerifyModalOpen(false);
        } catch (err) {
            console.error('Error verifying document:', err);
        }
    };

    const handleReject = async (document: DriverDocument, reason: string) => {
        try {
            await axiosInstance.post(`/drivers/${id}/reject_document/`, {
                is_verified: false,
                document_id: document.id,
                rejection_reason: reason
            });
            await mutateDocuments();
            setIsVerifyModalOpen(false);
        } catch (err) {
            console.error('Error rejecting document:', err);
        }
    };

    const handleDownload = async (document: DriverDocument, side?: string) => {
        try {
            const response = await axiosInstance.get(
                `/drivers/${id}/documents/${document.id}/download/${side || 'front'}`,
                { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', side === 'back' ? document.document_back! : document.document_front);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Error downloading document:', err);
        }
    };

    const handleDownloadAll = async (document: DriverDocument) => {
        if (document.has_two_sides) {
            await Promise.all([
                handleDownload(document, 'front'),
                handleDownload(document, 'back')
            ]);
        } else {
            await handleDownload(document, 'front');
        }
    };

    const handleDelete = async (document: DriverDocument) => {
        const confirmed = await ConfirmDialog({
            title: 'Delete Document',
            body: 'Are you sure you want to delete this document?',
            finalQuestion: 'This action cannot be undone.',
            showSuccessMessage: true
        });
        if (!confirmed) {
            return;
        }

        try {
            await axiosInstance.delete(`/driver-documents/${document.id}/`);
            await mutateDocuments();
        } catch (err) {
            console.error('Error deleting document:', err);
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        setSelectedStatus(newStatus);
    };

    const handleConfirmStatusUpdate = async () => {
        if (!selectedStatus) return;
        
        setIsUpdatingStatus(true);
        try {
            await axiosInstance.patch(`/drivers/${id}/`, { status: selectedStatus });
            await mutateDriver();
            setIsStatusModalOpen(false);
            setSelectedStatus('');
        } catch (err) {
            console.error('Error updating driver status:', err);
            const errorMessage = renderErrorMessage(err);
            showNotification({ message: errorMessage, type: 'error', showHide: true });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleDeleteDriver = async () => {
        const confirmed = await ConfirmDialog({
            title: 'Delete Driver',
            body: 'Are you sure you want to delete this driver?',
            finalQuestion: 'This action cannot be undone.',
            showSuccessMessage: true
        });

        if (!confirmed) {
            return;
        }

        setIsDeleting(true);
        try {
            await axiosInstance.delete(`/drivers/${id}/`);
            navigate('/admin/providers');
        } catch (err) {
            console.error('Error deleting driver:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleMakeUnavailable = async () => {
        const confirmed = await ConfirmDialog({
            title: 'Make Driver Unavailable',
            body: 'Are you sure you want to make this driver unavailable?',
            finalQuestion: 'This will prevent them from receiving new job assignments.',
            showSuccessMessage: true
        });

        if (!confirmed) {
            return;
        }

        setIsUpdatingStatus(true);
        try {
            await axiosInstance.patch(`/drivers/${id}/`, { status: 'unavailable' });
            await mutateDriver();
        } catch (err) {
            console.error('Error making driver unavailable:', err);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleVerificationUpdate = async (newVerificationStatus: string) => {
        setSelectedVerificationStatus(newVerificationStatus);
    };

    const handleConfirmVerificationUpdate = async () => {
        if (!selectedVerificationStatus) return;
        
        setIsUpdatingVerification(true);
        try {
            await axiosInstance.post(`/drivers/${id}/update_verification_status/`, { verification_status: selectedVerificationStatus });
            await mutateDriver();
            setIsVerificationModalOpen(false);
            setSelectedVerificationStatus('');
        } catch (err) {
            console.error('Error updating driver verification status:', err);
            const errorMessage = renderErrorMessage(err);
            setErrorMessage(errorMessage);
            showNotification({ message: errorMessage, type: 'error', showHide: true });
        } finally {
            setIsUpdatingVerification(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'on_job':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'off_duty':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
            case 'on_break':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'unavailable':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
            case 'suspended':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'inactive':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getVerificationStatusColor = (status: string) => {
        switch (status) {
            case 'verified':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'rejected':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'unverified':
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getDocumentStatus = (document: DriverDocument) => {
        switch (document.status) {
            case 'verified':
                return { status: 'verified', icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, text: 'Verified' };
            case 'rejected':
                return { status: 'rejected', icon: <XCircle className="h-5 w-5 text-red-500" />, text: 'Rejected' };
            case 'pending':
            default:
                return { status: 'pending', icon: <Clock className="h-5 w-5 text-yellow-500" />, text: 'Pending Verification' };
        }
    };

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    };

    if (driverError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <p className="text-red-500">Failed to fetch driver details</p>
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="btn btn-outline-primary"
                    >
                        Go Back
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="btn btn-primary"
                        disabled={isRefreshing}
                    >
                        {isRefreshing ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            'Try Again'
                        )}
                    </button>
                </div>
            </div>
        );
    }

    if (!driverData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-gray-500 dark:text-gray-400">Loading driver details...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header Section */}
            <div className="mb-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                {/* Top Row - Driver Info */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate(`/admin/providers/${driverData.provider}`)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-semibold text-white shadow-lg">
                                {getInitials(driverData.name)}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold dark:text-white">{driverData.name}</h1>
                                <p className="text-gray-500 dark:text-gray-400">{driverData.email}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(driverData.status)} shadow-sm`}>
                            {driverData.status.charAt(0).toUpperCase() + driverData.status.slice(1)}
                        </span>
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${getVerificationStatusColor((driverData as any).verification_status || 'unverified')} shadow-sm`}>
                            {((driverData as any).verification_status || 'unverified').charAt(0).toUpperCase() + ((driverData as any).verification_status || 'unverified').slice(1)}
                        </span>
                    </div>
                </div>

                {/* Bottom Row - Action Buttons */}
                <div className="p-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
                        
                        {/* Desktop Layout */}
                        <div className="hidden md:flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Status Management */}
                                <div className="flex items-center gap-2 border-r border-gray-200 dark:border-slate-700 pr-4">
                                    <button
                                        onClick={() => setIsStatusModalOpen(true)}
                                        className="btn btn-outline-secondary flex items-center gap-2 shadow-sm"
                                        disabled={isUpdatingStatus}
                                    >
                                        <Settings className="h-4 w-4" />
                                        {isUpdatingStatus ? 'Updating...' : 'Status'}
                                    </button>
                                    {driverData.status === 'available' && (
                                        <button
                                            onClick={handleMakeUnavailable}
                                            className="btn btn-outline-warning flex items-center gap-2 shadow-sm"
                                            disabled={isUpdatingStatus}
                                        >
                                            <UserX className="h-4 w-4" />
                                            Make Unavailable
                                        </button>
                                    )}
                                </div>

                                {/* Verification Management */}
                                <div className="flex items-center gap-2 border-r border-gray-200 dark:border-slate-700 pr-4">
                                    <button
                                        onClick={() => setIsVerificationModalOpen(true)}
                                        className="btn btn-outline-info flex items-center gap-2 shadow-sm"
                                        disabled={isUpdatingVerification}
                                    >
                                        <Award className="h-4 w-4" />
                                        {isUpdatingVerification ? 'Updating...' : 'Verification'}
                                    </button>
                                </div>

                                {/* Driver Management */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate(`/admin/drivers/${id}/edit`)}
                                        className="btn btn-outline-primary flex items-center gap-2 shadow-sm"
                                    >
                                        <Pencil className="h-4 w-4" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleDeleteDriver}
                                        className="btn btn-outline-danger flex items-center gap-2 shadow-sm"
                                        disabled={isDeleting}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Layout */}
                        <div className="md:hidden space-y-3">
                            {/* Status Management */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setIsStatusModalOpen(true)}
                                    className="btn btn-outline-secondary flex items-center gap-2 shadow-sm flex-1 min-w-0"
                                    disabled={isUpdatingStatus}
                                >
                                    <Settings className="h-4 w-4" />
                                    {isUpdatingStatus ? 'Updating...' : 'Status'}
                                </button>
                                {driverData.status === 'available' && (
                                    <button
                                        onClick={handleMakeUnavailable}
                                        className="btn btn-outline-warning flex items-center gap-2 shadow-sm flex-1 min-w-0"
                                        disabled={isUpdatingStatus}
                                    >
                                        <UserX className="h-4 w-4" />
                                        <span className="hidden sm:inline">Make Unavailable</span>
                                        <span className="sm:hidden">Unavailable</span>
                                    </button>
                                )}
                            </div>

                            {/* Verification Management */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setIsVerificationModalOpen(true)}
                                    className="btn btn-outline-info flex items-center gap-2 shadow-sm flex-1 min-w-0"
                                    disabled={isUpdatingVerification}
                                >
                                    <Award className="h-4 w-4" />
                                    {isUpdatingVerification ? 'Updating...' : 'Verification'}
                                </button>
                            </div>

                            {/* Driver Management */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => navigate(`/admin/drivers/${id}/edit`)}
                                    className="btn btn-outline-primary flex items-center gap-2 shadow-sm flex-1 min-w-0"
                                >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={handleDeleteDriver}
                                    className="btn btn-outline-danger flex items-center gap-2 shadow-sm flex-1 min-w-0"
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Basic Info & Employment */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Information Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                    <User className="h-6 w-6 text-white" />
                        </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Basic Information</h2>
                                    <p className="text-blue-100">Personal details and contact information</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
                                        <p className="text-gray-900 dark:text-white font-medium">{driverData.email}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Phone Number</label>
                                        <p className="text-gray-900 dark:text-white font-medium">{driverData.phone_number}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Date of Birth</label>
                                        <p className="text-gray-900 dark:text-white font-medium">{formatDate(driverData.date_of_birth)}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">National Insurance</label>
                                        <p className="text-gray-900 dark:text-white font-medium">{driverData.national_insurance_number || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Address</label>
                                        <p className="text-gray-900 dark:text-white font-medium">{driverData.address || 'N/A'}</p>
                                    </div>
                                <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Postcode</label>
                                        <p className="text-gray-900 dark:text-white font-medium">{driverData.postcode || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Employment Details Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                    <Briefcase className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Employment Details</h2>
                                    <p className="text-emerald-100">Work status and preferences</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Employment Type</label>
                                        <p className="text-gray-900 dark:text-white font-medium capitalize">{driverData.employment_type}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                                        <p className="text-gray-900 dark:text-white font-medium">{formatDate(driverData.date_started)}</p>
                                </div>
                                <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Max Weekly Hours</label>
                                        <p className="text-gray-900 dark:text-white font-medium">{driverData.max_weekly_hours} hours</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Working Time Directive</label>
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${driverData.opted_out_of_working_time_directive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {driverData.opted_out_of_working_time_directive ? 'Opted Out' : 'Not Opted Out'}
                                            </p>
                                        </div>
                                </div>
                                <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Induction Status</label>
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${driverData.induction_completed ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {driverData.induction_completed ? 'Completed' : 'Not Completed'}
                                            </p>
                                            {driverData.induction_completed && (
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    ({formatDate(driverData.induction_date)})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - License & Certifications */}
                <div className="space-y-6">
                    {/* License Information Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                    <IdCard className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-white">License Information</h2>
                                    <p className="text-purple-100">Driver's license details</p>
                    </div>
                </div>
            </div>
                        <div className="p-6">
                    <div className="space-y-4">
                        <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">License Number</label>
                                    <p className="text-gray-900 dark:text-white font-medium">{driverData.license_number}</p>
                        </div>
                        <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Country of Issue</label>
                                    <p className="text-gray-900 dark:text-white font-medium">{driverData.license_country_of_issue}</p>
                        </div>
                        <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">License Categories</label>
                            <div className="flex flex-wrap gap-2 mt-1">
                                        {driverData.license_categories.map((category) => (
                                            <span key={category} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                                        {category}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Expiry Date</label>
                                    <p className="text-gray-900 dark:text-white font-medium">{formatDate(driverData.license_expiry_date)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Penalty Points</label>
                                    <p className="text-gray-900 dark:text-white font-medium">{driverData.penalty_points}</p>
                                </div>
                            <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${driverData.is_license_valid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {driverData.is_license_valid ? 'License Valid' : 'License Invalid'}
                                    </p>
                                </div>
                                {driverData.needs_license_renewal && (
                                    <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                        <p className="text-yellow-700 dark:text-yellow-400 text-sm flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4" />
                                            License renewal required
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Certifications Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                    <Award className="h-6 w-6 text-white" />
                </div>
                        <div>
                                    <h2 className="text-xl font-semibold text-white">Certifications</h2>
                                    <p className="text-amber-100">Professional qualifications</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Digital Tachograph</label>
                                    <div className="mt-1">
                                        <p className="text-gray-900 dark:text-white font-medium">{driverData.digital_tachograph_card_number || 'N/A'}</p>
                                        {driverData.tacho_card_expiry_date && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Expires: {formatDate(driverData.tacho_card_expiry_date)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">CPC</label>
                                    <div className="mt-1">
                                    <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${driverData.is_cpc_valid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {driverData.has_cpc ? 'Valid' : 'Not Required'}
                                            </p>
                                        </div>
                                        {driverData.has_cpc && driverData.cpc_expiry_date && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Expires: {formatDate(driverData.cpc_expiry_date)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">ADR</label>
                                    <div className="mt-1">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${driverData.has_adr ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {driverData.has_adr ? 'Valid' : 'Not Required'}
                                            </p>
                                        </div>
                                        {driverData.has_adr && driverData.adr_expiry_date && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Expires: {formatDate(driverData.adr_expiry_date)}
                                            </p>
                        )}
                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes Section */}
            {driverData.notes && (
                <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div>
                                <h2 className="text-xl font-semibold text-white">Notes</h2>
                                <p className="text-gray-100">Additional information</p>
                        </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{driverData.notes}</p>
                </div>
                </div>
            )}

            {/* Documents Section */}
            <div className="mt-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold dark:text-white">Documents</h2>
                        <button
                            onClick={() => navigate(`/admin/drivers/${id}/edit`)}
                            className="btn btn-outline-primary flex items-center gap-2"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Driver
                        </button>
                    </div>

                    {documentsError ? (
                        <div className="text-center py-4">
                            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                            <p className="text-red-500">Failed to load documents</p>
                        </div>
                    ) : !documents ? (
                        <div className="text-center py-4">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-gray-500 dark:text-gray-400">No documents uploaded yet</p>
                        </div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {documents?.map((document) => (
                                <div key={document.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            {document.name}
                                        </h3>
                                        {document.status === 'verified' ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        ) : document.status === 'rejected' ? (
                                            <XCircle className="h-5 w-5 text-red-500" />
                                        ) : (
                                            <Clock className="h-5 w-5 text-yellow-500" />
                                        )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Reference: {document.reference_number}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Issue Date: {new Date(document.issue_date).toLocaleDateString()}
                                    </p>
                                    {document.expiry_date && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Expires: {new Date(document.expiry_date).toLocaleDateString()}
                                        </p>
                                    )}
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedDocument(document);
                                                setIsViewerOpen(true);
                                            }}
                                            className="btn btn-sm btn-outline-primary"
                                        >
                                            View Document
                                        </button>
                                        {document.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setSelectedDocument(document);
                                                        setVerifyAction('verify');
                                                        setIsVerifyModalOpen(true);
                                                    }}
                                                    className="btn btn-sm btn-success"
                                                >
                                                    Verify
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedDocument(document);
                                                        setVerifyAction('reject');
                                                        setIsVerifyModalOpen(true);
                                                    }}
                                                    className="btn btn-sm btn-danger"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleDelete(document)}
                                            className="btn btn-sm btn-danger"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                            </div>
                                </div>
                            ))}
                            </div>
                        )}
                </div>
            </div>

            {/* Document Viewer Modal */}
            {selectedDocument && (
                <DocumentViewer
                    document={selectedDocument}
                    isOpen={isViewerOpen}
                    onClose={() => setIsViewerOpen(false)}
                    onVerify={() => {
                        setVerifyAction('verify');
                        setIsVerifyModalOpen(true);
                    }}
                    onReject={() => {
                        setVerifyAction('reject');
                        setIsVerifyModalOpen(true);
                    }}
                    onDownload={handleDownload}
                    onDownloadAll={handleDownloadAll}
                    isAdmin={true}
                />
            )}

            {/* Verify Document Modal */}
            {selectedDocument && (
                <VerifyDocumentModal
                    isOpen={isVerifyModalOpen}
                    onClose={() => setIsVerifyModalOpen(false)}
                    onVerify={handleVerify}
                    onReject={handleReject}
                    document={selectedDocument}
                    action={verifyAction}
                />
            )}

            {/* Verification Status Override Modal */}
            {isVerificationModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Override Verification Status
                                </h3>
                                <button
                                    onClick={() => setIsVerificationModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>
                            
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Select a new verification status for this driver:
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleVerificationUpdate('unverified')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                        selectedVerificationStatus === 'unverified' 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                            : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                    disabled={isUpdatingVerification}
                                >
                                    <AlertCircle className="h-5 w-5 text-gray-500" />
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">Unverified</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Driver has not been verified yet</div>
                                    </div>
                                    {selectedVerificationStatus === 'unverified' && (
                                        <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto" />
                                    )}
                                </button>

                                <button
                                    onClick={() => handleVerificationUpdate('pending')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                        selectedVerificationStatus === 'pending' 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                            : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                    disabled={isUpdatingVerification}
                                >
                                    <Clock className="h-5 w-5 text-yellow-500" />
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">Pending Review</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Verification is in progress</div>
                                    </div>
                                    {selectedVerificationStatus === 'pending' && (
                                        <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto" />
                                    )}
                                </button>

                                <button
                                    onClick={() => handleVerificationUpdate('verified')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                        selectedVerificationStatus === 'verified' 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                            : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                    disabled={isUpdatingVerification}
                                >
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">Verified</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Driver is fully verified and can work</div>
                                    </div>
                                    {selectedVerificationStatus === 'verified' && (
                                        <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto" />
                                    )}
                                </button>

                                <button
                                    onClick={() => handleVerificationUpdate('rejected')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                        selectedVerificationStatus === 'rejected' 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                            : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                    disabled={isUpdatingVerification}
                                >
                                    <XCircle className="h-5 w-5 text-red-500" />
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">Rejected</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Verification has been rejected</div>
                                    </div>
                                    {selectedVerificationStatus === 'rejected' && (
                                        <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto" />
                                    )}
                                </button>
                            </div>

                            {errorMessage && (
                                <div className="text-red-500 text-sm mt-2 mb-2 border border-red-500 rounded-md p-2 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    {errorMessage}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setIsVerificationModalOpen(false);
                                        setSelectedVerificationStatus('');
                                    }}
                                    className="btn btn-outline-secondary"
                                    disabled={isUpdatingVerification}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmVerificationUpdate}
                                    className="btn btn-primary"
                                    disabled={!selectedVerificationStatus || isUpdatingVerification}
                                >
                                    {isUpdatingVerification ? 'Updating...' : 'OK'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Override Modal */}
            {isStatusModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Override Driver Status
                                </h3>
                                <button
                                    onClick={() => setIsStatusModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>
                            
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Select a new status for this driver:
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleStatusUpdate('available')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                        selectedStatus === 'available' 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                            : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                    disabled={isUpdatingStatus}
                                >
                                    <UserCheck className="h-5 w-5 text-green-500" />
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">Available</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Driver is available for job assignments</div>
                                    </div>
                                    {selectedStatus === 'available' && (
                                        <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto" />
                                    )}
                                </button>

                                <button
                                    onClick={() => handleStatusUpdate('on_job')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                        selectedStatus === 'on_job' 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                            : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                    disabled={isUpdatingStatus}
                                >
                                    <Briefcase className="h-5 w-5 text-blue-500" />
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">On Job</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Driver is currently working on a job</div>
                                    </div>
                                    {selectedStatus === 'on_job' && (
                                        <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto" />
                                    )}
                                </button>

                                <button
                                    onClick={() => handleStatusUpdate('off_duty')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                        selectedStatus === 'off_duty' 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                            : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                    disabled={isUpdatingStatus}
                                >
                                    <Clock className="h-5 w-5 text-gray-500" />
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">Off Duty</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Driver is off duty and not available</div>
                                    </div>
                                    {selectedStatus === 'off_duty' && (
                                        <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto" />
                                    )}
                                </button>

                                <button
                                    onClick={() => handleStatusUpdate('on_break')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                        selectedStatus === 'on_break' 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                            : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                    disabled={isUpdatingStatus}
                                >
                                    <Clock className="h-5 w-5 text-yellow-500" />
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">On Break</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Driver is on a break</div>
                                    </div>
                                    {selectedStatus === 'on_break' && (
                                        <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto" />
                                    )}
                                </button>

                                <button
                                    onClick={() => handleStatusUpdate('unavailable')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                        selectedStatus === 'unavailable' 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                            : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                    disabled={isUpdatingStatus}
                                >
                                    <UserX className="h-5 w-5 text-orange-500" />
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">Unavailable</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Driver is temporarily unavailable</div>
                                    </div>
                                    {selectedStatus === 'unavailable' && (
                                        <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto" />
                                    )}
                                </button>

                                <button
                                    onClick={() => handleStatusUpdate('suspended')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                        selectedStatus === 'suspended' 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                            : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                    disabled={isUpdatingStatus}
                                >
                                    <Ban className="h-5 w-5 text-red-500" />
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">Suspended</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Driver is suspended from work</div>
                                    </div>
                                    {selectedStatus === 'suspended' && (
                                        <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto" />
                                    )}
                                </button>

                                <button
                                    onClick={() => handleStatusUpdate('inactive')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                        selectedStatus === 'inactive' 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                            : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                    disabled={isUpdatingStatus}
                                >
                                    <UserX className="h-5 w-5 text-gray-500" />
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">Inactive</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Driver is inactive and not working</div>
                                    </div>
                                    {selectedStatus === 'inactive' && (
                                        <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto" />
                                    )}
                                </button>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setIsStatusModalOpen(false);
                                        setSelectedStatus('');
                                    }}
                                    className="btn btn-outline-secondary"
                                    disabled={isUpdatingStatus}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmStatusUpdate}
                                    className="btn btn-primary"
                                    disabled={!selectedStatus || isUpdatingStatus}
                                >
                                    {isUpdatingStatus ? 'Updating...' : 'OK'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverDetail; 