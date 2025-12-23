import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Save, 
    AlertCircle, 
    Loader2, 
    CheckCircle2, 
    XCircle, 
    Plus, 
    Trash2, 
    Upload, 
    Eye, 
    Clock,
    User,
    Briefcase,
    IdCard,
    Award,
    FileText
} from 'lucide-react';
import { Formik, Form, Field, FormikErrors } from 'formik';
import * as Yup from 'yup';
import axiosInstance from '../../../../../../services/axiosInstance';
import { Driver } from '../../../../../../types/driver';
import UploadDocumentModal from '../documentsTab/UploadDocumentModal';
import DocumentViewer from '../documentsTab/DocumentViewer';
import VerifyDocumentModal from '../documentsTab/VerifyDocumentModal';
import useSWR from 'swr';
import dayjs from 'dayjs';
import fetcher from '../../../../../../services/fetcher';
import ConfirmDialog from '../../../../../../helper/confirmDialog';
import renderErrorMessage from '../../../../../../helper/renderErrorMessage';
import { showNotification } from '../../../../../../utilities/showNotifcation';

const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    phone_number: Yup.string().required('Phone number is required'),
    date_of_birth: Yup.date().nullable(),
    national_insurance_number: Yup.string()
        .max(9, 'National Insurance number must be less than 9 characters')
        .nullable(),
    address: Yup.string().nullable(),
    postcode: Yup.string().nullable(),
    employment_type: Yup.string().required('Employment type is required'),
    date_started: Yup.date().required('Start date is required'),
    license_number: Yup.string().required('License number is required'),
    license_country_of_issue: Yup.string().required('Country of issue is required'),
    license_categories: Yup.array().min(1, 'At least one license category is required'),
    license_expiry_date: Yup.date().required('License expiry date is required'),
    digital_tachograph_card_number: Yup.string().nullable(),
    tacho_card_expiry_date: Yup.date().nullable(),
    has_cpc: Yup.boolean(),
    cpc_expiry_date: Yup.date().when('has_cpc', {
        is: true,
        then: Yup.date().required('CPC expiry date is required'),
    }),
    has_adr: Yup.boolean(),
    adr_expiry_date: Yup.date().when('has_adr', {
        is: true,
        then: Yup.date().required('ADR expiry date is required'),
    }),
    induction_completed: Yup.boolean(),
    induction_date: Yup.date().when('induction_completed', {
        is: true,
        then: Yup.date().required('Induction date is required'),
    }),
    max_weekly_hours: Yup.number()
        .min(0, 'Hours must be positive')
        .max(168, 'Hours cannot exceed 168')
        .required('Maximum weekly hours is required'),
    opted_out_of_working_time_directive: Yup.boolean(),
    status: Yup.string().required('Status is required'),
    penalty_points: Yup.number()
        .min(0, 'Points must be positive')
        .max(12, 'Points cannot exceed 12')
        .required('Penalty points is required'),
    preferred_vehicle_types: Yup.array().nullable(),
    notes: Yup.string().nullable(),
});

interface DriverDocument {
    id: string;
    document_type: string;
    front_url: string;
    back_url?: string;
    front_file_name: string;
    back_file_name?: string;
    has_two_sides: boolean;
    name: string;
    type: string;
    number: string;
    issued_date: string;
    expiry_date?: string;
    status: string;
    verified: boolean;
    verified_at?: string;
    verification_note?: string;
    notes?: string;
    is_verified: boolean;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
}

const EditDriver: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<any>(null);
    const [verifyAction, setVerifyAction] = useState<'verify' | 'reject'>('verify');

    const { data: driver, error, mutate } = useSWR<Driver>(`/drivers/${id}/`, fetcher);
    const { data: documentsData, error: documentsError, mutate: mutateDocuments } = useSWR<{ documents: DriverDocument[] }>(
        `/drivers/${id}/documents/`,
        fetcher
    );

    // Transform driver data to match form field names
    const initialValues = React.useMemo(() => {
        if (!driver) return null;
        
        return {
            name: driver.name || '',
            email: driver.email || '',
            phone_number: driver.phone_number || '',
            date_of_birth: driver.date_of_birth || '',
            national_insurance_number: driver.national_insurance_number || '',
            address: driver.address || '',
            postcode: driver.postcode || '',
            employment_type: driver.employment_type || '',
            date_started: driver.date_started || '',
            license_number: driver.license_number || '',
            license_country_of_issue: driver.license_country_of_issue || '',
            license_categories: driver.license_categories || [],
            license_expiry_date: driver.license_expiry_date || '',
            digital_tachograph_card_number: driver.digital_tachograph_card_number || '',
            tacho_card_expiry_date: driver.tacho_card_expiry_date || '',
            has_cpc: driver.has_cpc || false,
            cpc_expiry_date: driver.cpc_expiry_date || '',
            has_adr: driver.has_adr || false,
            adr_expiry_date: driver.adr_expiry_date || '',
            induction_completed: driver.induction_completed || false,
            induction_date: driver.induction_date || '',
            max_weekly_hours: driver.max_weekly_hours || 0,
            opted_out_of_working_time_directive: driver.opted_out_of_working_time_directive || false,
            status: driver.status || '',
            penalty_points: driver.penalty_points || 0,
            preferred_vehicle_types: driver.preferred_vehicle_types || [],
            notes: driver.notes || '',
            is_license_valid: driver.is_license_valid || false,
            is_cpc_valid: driver.is_cpc_valid || false,
            needs_license_renewal: driver.needs_license_renewal || false,
        };
    }, [driver]);

    const formatDate = (date: string | null | undefined) => {
        if (!date) return 'N/A';
        return dayjs(date).format('MMM D, YYYY');
    };

    const handleDocumentDelete = async (documentId: string) => {
        const confirmed = await ConfirmDialog({
            title: 'Delete Document',
            body: 'Are you sure you want to delete this document? This action cannot be undone.',
            finalQuestion: 'This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'error'
        });

        if (!confirmed) {
            return;
        }

        try {
            await axiosInstance.delete(`/driver-documents/${documentId}/`);
            await mutateDocuments();
        } catch (err) {
            renderErrorMessage(err);
            showNotification({ message: renderErrorMessage(err), type: 'error', showHide: true });
        }
    };

    const handleVerify = async (document: any, note: string) => {
        try {
            await axiosInstance.post(`/drivers/${id}/verify_document`, {
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

    const handleReject = async (document: any, reason: string) => {
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

    const handleDownload = async (document: any, side?: string) => {
        try {
            const url1 = `/morevans/api/v1/uploads/docs/drivers/${id}/${document.id}/${side === 'back' ? document.back_file_name : document.front_file_name}`.replace(/\/+/g, '/');
            
            const response = await axiosInstance.get(url1, { responseType: 'blob' });
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', side === 'back' ? document.back_file_name! : document.front_file_name);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading document:', err);
        }
    };

    const handleDownloadAll = async (document: any) => {
        if (document.has_two_sides) {
            await Promise.all([
                handleDownload(document, 'front'),
                handleDownload(document, 'back')
            ]);
        } else {
            await handleDownload(document, 'front');
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            console.log("values", values)
            setSaving(true);
            await axiosInstance.put(`/drivers/${id}/`, values);
            setSaveSuccess(true);
            setTimeout(() => {
                navigate(`/admin/drivers/${id}`);
            }, 1500);
        } catch (err) {
            console.error('Error updating driver:', err);
        } finally {
            setSaving(false);
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <p className="text-red-500">Failed to fetch driver details</p>
                <button
                    onClick={() => navigate(-1)}
                    className="btn btn-outline-primary"
                >
                    Go Back
                </button>
            </div>
        );
    }

    if (!driver || !initialValues) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-gray-500 dark:text-gray-400">Loading driver details...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
                <div className="flex items-center justify-between mb-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-6">
                    <button
                        onClick={() => navigate(`/admin/drivers/${id}`)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl font-bold dark:text-white">Edit Driver</h1>
                </div>
                    <button
                        type="submit"
                        form="driver-form"
                        disabled={saving}
                        className="btn btn-outline-primary flex items-center gap-2 shadow-sm"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </button>
            </div>

            {/* Success Message */}
            {saveSuccess && (
                <div className="fixed top-4 right-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-down">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Driver updated successfully!</span>
                </div>
            )}

                <Formik
                    enableReinitialize
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ errors, touched, values }) => (
                        <Form id="driver-form" className="space-y-6">
                            {/* Basic Information */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h2 className="text-lg font-semibold dark:text-white">Basic Information</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Full Name
                                        </label>
                                        <Field
                                            type="text"
                                            id="name"
                                            name="name"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                        />
                                        {errors.name && touched.name && (
                                            <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.name}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Email
                                        </label>
                                        <Field
                                            type="email"
                                            id="email"
                                            name="email"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                        />
                                        {errors.email && touched.email && (
                                            <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.email}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Phone Number
                                        </label>
                                        <Field
                                            type="text"
                                            id="phone_number"
                                            name="phone_number"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                        />
                                        {errors.phone_number && touched.phone_number && (
                                            <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.phone_number}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Date of Birth
                                        </label>
                                        <Field
                                            type="date"
                                            id="date_of_birth"
                                            name="date_of_birth"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="national_insurance_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            National Insurance Number
                                        </label>
                                        <Field
                                            type="text"
                                            id="national_insurance_number"
                                            name="national_insurance_number"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                        />
                                        {errors.national_insurance_number && touched.national_insurance_number && (
                                            <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.national_insurance_number}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Address
                                        </label>
                                        <Field
                                            type="text"
                                            id="address"
                                            name="address"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Postcode
                                        </label>
                                        <Field
                                            type="text"
                                            id="postcode"
                                            name="postcode"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Employment Details */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                        <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <h2 className="text-lg font-semibold dark:text-white">Employment Details</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="employment_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Employment Type
                                        </label>
                                        <Field
                                            as="select"
                                            id="employment_type"
                                            name="employment_type"
                                            className="select select-bordered w-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                        >
                                            <option value="">Select type</option>
                                            <option value="employee">Employee</option>
                                            <option value="self_employed">Self Employed</option>
                                            <option value="contractor">Contractor</option>
                                        </Field>
                                        {errors.employment_type && touched.employment_type && (
                                            <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.employment_type}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="date_started" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Start Date
                                        </label>
                                        <Field
                                            type="date"
                                            id="date_started"
                                            name="date_started"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                        />
                                        {errors.date_started && touched.date_started && (
                                            <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.date_started}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="max_weekly_hours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Maximum Weekly Hours
                                        </label>
                                        <Field
                                            type="number"
                                            id="max_weekly_hours"
                                            name="max_weekly_hours"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                        />
                                        {errors.max_weekly_hours && touched.max_weekly_hours && (
                                            <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.max_weekly_hours}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Field
                                            type="checkbox"
                                            id="opted_out_of_working_time_directive"
                                            name="opted_out_of_working_time_directive"
                                            className="checkbox checkbox-primary transition-all duration-200"
                                        />
                                        <label htmlFor="opted_out_of_working_time_directive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Opted out of Working Time Directive
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* License Information */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                        <IdCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h2 className="text-lg font-semibold dark:text-white">License Information</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="license_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            License Number
                                        </label>
                                        <Field
                                            type="text"
                                            id="license_number"
                                            name="license_number"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                        {errors.license_number && touched.license_number && (
                                            <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.license_number}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="license_country_of_issue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Country of Issue
                                        </label>
                                        <Field
                                            type="text"
                                            id="license_country_of_issue"
                                            name="license_country_of_issue"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                        {errors.license_country_of_issue && touched.license_country_of_issue && (
                                            <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.license_country_of_issue}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="license_categories" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            License Categories
                                        </label>
                                                    <Field
                                            as="select"
                                            id="license_categories"
                                                        name="license_categories"
                                            multiple
                                            className="select select-bordered w-full focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value="B">B</option>
                                            <option value="C">C</option>
                                            <option value="C+E">C+E</option>
                                            <option value="D">D</option>
                                            <option value="D+E">D+E</option>
                                        </Field>
                                        {errors.license_categories && touched.license_categories && (
                                            <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.license_categories}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="license_expiry_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            License Expiry Date
                                        </label>
                                        <Field
                                            type="date"
                                            id="license_expiry_date"
                                            name="license_expiry_date"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                        {errors.license_expiry_date && touched.license_expiry_date && (
                                            <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.license_expiry_date}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="digital_tachograph_card_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Digital Tachograph Card Number
                                        </label>
                                        <Field
                                            type="text"
                                            id="digital_tachograph_card_number"
                                            name="digital_tachograph_card_number"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="tacho_card_expiry_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Tachograph Card Expiry Date
                                        </label>
                                        <Field
                                            type="date"
                                            id="tacho_card_expiry_date"
                                            name="tacho_card_expiry_date"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Certifications */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700">
                                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                        <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                    <h2 className="text-lg font-semibold dark:text-white">Certifications</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-center gap-2">
                                        <Field
                                            type="checkbox"
                                            id="has_cpc"
                                            name="has_cpc"
                                            className="checkbox checkbox-primary transition-all duration-200"
                                        />
                                        <label htmlFor="has_cpc" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Has CPC
                                        </label>
                                    </div>
                                    {values.has_cpc && (
                                        <div>
                                            <label htmlFor="cpc_expiry_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                CPC Expiry Date
                                            </label>
                                            <Field
                                                type="date"
                                                id="cpc_expiry_date"
                                                name="cpc_expiry_date"
                                                className="input input-bordered w-full focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                            />
                                            {errors.cpc_expiry_date && touched.cpc_expiry_date && (
                                                <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {errors.cpc_expiry_date}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Field
                                            type="checkbox"
                                            id="has_adr"
                                            name="has_adr"
                                            className="checkbox"
                                        />
                                        <label htmlFor="has_adr" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Has ADR
                                        </label>
                                    </div>
                                    {values.has_adr && (
                                        <div>
                                            <label htmlFor="adr_expiry_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                ADR Expiry Date
                                            </label>
                                            <Field
                                                type="date"
                                                id="adr_expiry_date"
                                                name="adr_expiry_date"
                                                className="input input-bordered w-full focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                            />
                                            {errors.adr_expiry_date && touched.adr_expiry_date && (
                                                <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {errors.adr_expiry_date}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Field
                                            type="checkbox"
                                            id="induction_completed"
                                            name="induction_completed"
                                            className="checkbox"
                                        />
                                        <label htmlFor="induction_completed" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Induction Completed
                                        </label>
                                    </div>
                                    {values.induction_completed && (
                            <div>
                                            <label htmlFor="induction_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Induction Date
                                            </label>
                                            <Field
                                                type="date"
                                                id="induction_date"
                                                name="induction_date"
                                                className="input input-bordered w-full focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                            />
                                            {errors.induction_date && touched.induction_date && (
                                                <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {errors.induction_date}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status and Notes */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                        <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <h2 className="text-lg font-semibold dark:text-white">Status and Notes</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Status
                                        </label>
                                        <Field
                                            as="select"
                                            id="status"
                                            name="status"
                                            className="select select-bordered w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="available">Available</option>
                                            <option value="unavailable">Unavailable</option>
                                            <option value="on_leave">On Leave</option>
                                            <option value="suspended">Suspended</option>
                                        </Field>
                                        {errors.status && touched.status && (
                                            <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.status}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="penalty_points" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Penalty Points
                                        </label>
                                        <Field
                                            type="number"
                                            id="penalty_points"
                                            name="penalty_points"
                                            className="input input-bordered w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                        {errors.penalty_points && touched.penalty_points && (
                                            <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.penalty_points}
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Notes
                                        </label>
                                        <Field
                                            as="textarea"
                                            id="notes"
                                            name="notes"
                                            rows={4}
                                            className="textarea textarea-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Form>
                    )}
                </Formik>

                            {/* Documents Section */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow mt-6">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                                        </div>
                            <h2 className="text-lg font-semibold dark:text-white">Documents</h2>
                                        </div>
                                    </div>
                    <div className="flex justify-end mb-4">
                                    <button
                            type="button"
                                        onClick={() => setIsUploadModalOpen(true)}
                            className="btn btn-outline-primary flex items-center gap-2 hover:bg-blue-50"
                                    >
                                        <Plus className="h-4 w-4" />
                            Upload Document
                                    </button>
                                </div>
                    {documentsData?.map((doc) => (
                    <div key={doc.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
                                            <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                                {doc.name}
                                                </h3>
                            {doc.is_verified ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                                <Clock className="h-5 w-5 text-yellow-500" />
                            )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Reference: {doc.number}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Issue Date: {formatDate(doc.issue_date)}
                        </p>
                        {doc.expiry_date && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Expires: {formatDate(doc.expiry_date)}
                            </p>
                        )}
                        <div className="mt-4 flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDocument(doc);
                                                            setIsViewerOpen(true);
                                                        }}
                                className="btn btn-sm btn-outline-primary"
                            >
                                View Document
                            </button>
                            {!doc.is_verified && (
                                <>
                                    <button
                                        onClick={() => {
                                            setSelectedDocument(doc);
                                            setVerifyAction('verify');
                                            setIsVerifyModalOpen(true);
                                        }}
                                        className="btn btn-sm btn-success"
                                    >
                                        Verify
                                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedDocument(doc);
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
                                                        onClick={() => handleDocumentDelete(doc.id)}
                                className="btn btn-sm btn-danger"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                    </div>))}
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

            {/* Upload Document Modal */}
            <UploadDocumentModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                entityType="drivers"
                userId={id}
                onSuccess={() => {
                    setIsUploadModalOpen(false);
                    mutateDocuments();
                }}
            />
        </div>
    );
};

export default EditDriver; 