// npm install formik yup

import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage, FormikProps } from 'formik';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import Select from 'react-select';
import IconX from '../../../../../../components/Icon/IconX';
import IconFile from '../../../../../../components/Icon/IconFile';
import IconCircleCheck from '../../../../../../components/Icon/IconCircleCheck';
import IconMenuDragAndDrop from '../../../../../../components/Icon/Menu/IconMenuDragAndDrop';
import IconDownload from '../../../../../../components/Icon/IconDownload';
import IconEye from '../../../../../../components/Icon/IconEye';
import IconTrash from '../../../../../../components/Icon/IconTrash';
import axiosInstance from '../../../../../../services/axiosInstance';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUser, faIdCard, faPhone, faEnvelope, faCalendarAlt, faTruck, faSpinner, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { Driver } from '../../../../../../types/driver';

interface AddDriverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (driverData: FormData) => Promise<void>;
    providerId: number;
}

// Validation Schema with Yup
const validationSchema = Yup.object({
    // Personal Information
    name: Yup.string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must be less than 50 characters')
        .required('Name is required'),
    
    email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email is required'),
    
    phoneNumber: Yup.string()
        .matches(/^(\+44|0)[1-9]\d{8,9}$/, 'Please enter a valid UK phone number')
        .required('Phone number is required'),
    
    dateOfBirth: Yup.date()
        .max(dayjs().subtract(18, 'years').toDate(), 'Driver must be at least 18 years old')
        .min(dayjs().subtract(80, 'years').toDate(), 'Please enter a valid date of birth')
        .nullable(),
    
    nationalInsuranceNumber: Yup.string()
        .max(9, 'National Insurance number must be less than 9 characters')
        // .matches(/^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D]{1}$/, 'Please enter a valid National Insurance number (e.g., AB123456C)')
        .nullable(),
    
    address: Yup.string()
        .max(200, 'Address must be less than 200 characters'),
    
    postcode: Yup.string(),
        // .matches(/^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i, 'Please enter a valid UK postcode'),
    
    employmentType: Yup.string()
        .oneOf(['employee', 'contractor', 'agency', 'temporary'], 'Please select a valid employment type')
        .required('Employment type is required'),
    
    dateStarted: Yup.date()
        .max(dayjs().toDate(), 'Start date cannot be in the future')
        .required('Start date is required'),

    // License Information
    licenseNumber: Yup.string()
        .min(5, 'License number must be at least 5 characters')
        .max(20, 'License number must be less than 20 characters')
        .required('License number is required'),
    
    licenseCountryOfIssue: Yup.string()
        .required('License country is required'),
    
    licenseCategories: Yup.array()
        .min(1, 'At least one license category is required')
        .required('License categories are required'),
    
    licenseExpiry: Yup.date()
        .min(dayjs().toDate(), 'License expiry date must be in the future')
        .required('License expiry date is required'),
    
    // Conditional validations for Tachograph
    digitalTachographCardNumber: Yup.string()
        .when('hasTacho', {
            is: true,
            then: (schema) => schema.required('Tachograph card number is required when tachograph is enabled'),
            otherwise: (schema) => schema.nullable()
        }),
    
    tachoExpiry: Yup.date()
        .when('hasTacho', {
            is: true,
            then: (schema) => schema
                .min(dayjs().toDate(), 'Tachograph expiry date must be in the future')
                .required('Tachograph expiry date is required when tachograph is enabled'),
            otherwise: (schema) => schema.nullable()
        }),
    
    // Conditional validations for CPC
    cpcExpiry: Yup.date()
        .when('hasCpc', {
            is: true,
            then: (schema) => schema
                .min(dayjs().toDate(), 'CPC expiry date must be in the future')
                .required('CPC expiry date is required when CPC is enabled'),
            otherwise: (schema) => schema.nullable()
        }),
    
    // Additional Information
    maxWeeklyHours: Yup.number()
        .min(1, 'Weekly hours must be at least 1')
        .max(168, 'Weekly hours cannot exceed 168')
        .required('Max weekly hours is required'),
    
    penaltyPoints: Yup.number()
        .min(0, 'Penalty points cannot be negative')
        .max(12, 'Penalty points cannot exceed 12')
        .required('Penalty points is required'),
    
    notes: Yup.string()
        .max(500, 'Notes must be less than 500 characters'),
    
    // Boolean fields
    hasCpc: Yup.boolean(),
    hasTacho: Yup.boolean(),
    optedOutOfWorkingTimeDirective: Yup.boolean(),
});

// Initial form values
const initialValues = {
    name: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    nationalInsuranceNumber: '',
    address: '',
    postcode: '',
    employmentType: 'employee',
    dateStarted: '',
    licenseNumber: '',
    licenseCountryOfIssue: 'United Kingdom',
    licenseCategories: [],
    licenseExpiry: '',
    digitalTachographCardNumber: '',
    tachoExpiry: '',
    hasCpc: true,
    cpcExpiry: '',
    hasAdr: false,
    adrExpiry: '',
    inductionCompleted: false,
    inductionDate: '',
    maxWeeklyHours: 48,
    optedOutOfWorkingTimeDirective: false,
    status: 'available',
    penaltyPoints: 0,
    preferredVehicleTypes: [],
    notes: '',
    hasTacho: true,
};

const AddDriverModal: React.FC<AddDriverModalProps> = ({ isOpen, onClose, onAdd, providerId }) => {
    const [documents, setDocuments] = useState<{
        license: { front: File | null; back: File | null };
        cpc: { front: File | null; back: File | null };
        tacho: { front: File | null; back: File | null };
        id: { front: File | null; back: File | null };
        medical: File | null;
    }>({
        license: { front: null, back: null },
        cpc: { front: null, back: null },
        tacho: { front: null, back: null },
        id: { front: null, back: null },
        medical: null,
    });

    const [activeDocument, setActiveDocument] = useState<'license' | 'cpc' | 'tacho' | 'id' | 'medical'>('license');
    const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const documentIcons = {
        license: '🚗',
        cpc: '📋',
        tacho: '⏰',
        id: '📘',
        medical: '🏥'
    };

    const licenseOptions = [
        { value: 'B', label: 'Category B - Car and small van up to 3.5t' },
        { value: 'C1', label: 'Category C1 - Medium-sized vehicles 3.5-7.5t' },
        { value: 'C', label: 'Category C - Large vehicles over 3.5t' },
        { value: 'C+E', label: 'Category C+E - Large vehicle with trailer' },
        { value: 'D1', label: 'Category D1 - Minibuses' },
        { value: 'D', label: 'Category D - Buses' }
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            if (activeDocument === 'medical') {
                setDocuments(prev => ({
                    ...prev,
                    [activeDocument]: file
                }));
            } else {
                setDocuments(prev => ({
                    ...prev,
                    [activeDocument]: {
                        ...prev[activeDocument as keyof typeof prev],
                        [activeSide]: file
                    }
                }));
            }
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0] || null;
        if (file) {
            if (activeDocument === 'medical') {
                setDocuments(prev => ({
                    ...prev,
                    [activeDocument]: file
                }));
            } else {
                setDocuments(prev => ({
                    ...prev,
                    [activeDocument]: {
                        ...prev[activeDocument as keyof typeof prev],
                        [activeSide]: file
                    }
                }));
            }
        }
    };

    const handlePreview = (file: File | null) => {
        if (file) {
            setPreviewFile(file);
            setPreviewOpen(true);
        }
    };

    const handleDownload = (file: File | null) => {
        if (file) {
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const removeFile = (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        if (activeDocument === 'medical') {
            setDocuments(prev => ({
                ...prev,
                [activeDocument]: null
            }));
        } else {
            setDocuments(prev => ({
                ...prev,
                [activeDocument]: {
                    ...prev[activeDocument as keyof typeof prev],
                    [activeSide]: null
                }
            }));
        }
    };

    const handleSubmit = async (values: any, { setSubmitting, setFieldError }: any) => {
        setIsUploading(true);

        try {
            // Step 1: Create the driver
            const driverData = new FormData();
            
            // Basic Information
            driverData.append('name', values.name || '');
            driverData.append('email', values.email || '');
            driverData.append('phone_number', values.phoneNumber || '');
            driverData.append('date_of_birth', values.dateOfBirth || '');
            driverData.append('national_insurance_number', values.nationalInsuranceNumber || '');
            driverData.append('address', values.address || '');
            driverData.append('postcode', values.postcode || '');
            driverData.append('provider', providerId.toString());
            driverData.append('employment_type', values.employmentType || '');
            driverData.append('date_started', values.dateStarted || '');
            
            // License Information
            driverData.append('license_number', values.licenseNumber || '');
            driverData.append('license_country_of_issue', values.licenseCountryOfIssue || '');
            driverData.append('license_categories', JSON.stringify(values.licenseCategories || []));
            driverData.append('license_expiry_date', values.licenseExpiry || '');
            
            // Tachograph Information
            driverData.append('has_tacho', values.hasTacho ? 'true' : 'false');
            if (values.hasTacho) {
                driverData.append('digital_tachograph_card_number', values.digitalTachographCardNumber || '');
                driverData.append('tacho_card_expiry_date', values.tachoExpiry || '');
            }
            
            // CPC Information
            driverData.append('has_cpc', values.hasCpc ? 'true' : 'false');
            if (values.hasCpc) {
                driverData.append('cpc_expiry_date', values.cpcExpiry || '');
            }
            
            // Additional Information
            driverData.append('max_weekly_hours', values.maxWeeklyHours?.toString() || '0');
            driverData.append('penalty_points', values.penaltyPoints?.toString() || '0');
            driverData.append('notes', values.notes || '');
            driverData.append('opted_out_of_working_time_directive', values.optedOutOfWorkingTimeDirective ? 'true' : 'false');
            driverData.append('status', 'available'); // Default status

            // Log the form data for debugging
            console.log('Form Values:', values);
            for (let pair of driverData.entries()) {
                console.log(pair[0] + ': ' + pair[1]);
            }

            // Create the driver and get the response
            const response = await onAdd(driverData);
            if (!response || !response.id) {
                throw new Error('Failed to create driver: No ID returned');
            }
            const driverId = response.id;

            // Step 2: Upload documents
            const uploadPromises = [];
            const uploadErrors: Array<{ type: string; side: string; error: any }> = [];

            // Helper function to handle document upload
            const uploadDocument = async (file: File, documentType: string, isBack: boolean = false) => {
                try {
                    const docData = new FormData();
                    docData.append('document_type', documentType);
                    
                    // Use document_front or document_back based on the isBack parameter
                    if (isBack) {
                        docData.append('document_back', file);
                    } else {
                        docData.append('document_front', file);
                    }

                    // Add expiry date if available
                    if (documentType === 'license' && values.licenseExpiry) {
                        docData.append('expiry_date', values.licenseExpiry);
                    } else if (documentType === 'cpc' && values.cpcExpiry) {
                        docData.append('expiry_date', values.cpcExpiry);
                    } else if (documentType === 'tacho' && values.tachoExpiry) {
                        docData.append('expiry_date', values.tachoExpiry);
                    }


                    const response = await axiosInstance.post(`/drivers/${driverId}/documents/`, docData)
                    // const response = await fetch(`/morevans/api/v1/drivers/${driverId}/documents/`, {
                    //     method: 'POST',
                    //     body: docData,
                    //     headers: {
                    //         'Authorization': `Bearer ${localStorage.getItem('token')}`
                    //     }
                    // });
                    
                    if (!response.ok) {
                        throw new Error(`Failed to upload ${documentType} ${isBack ? 'back' : 'front'}`);
                    }
                    
                    return response.json();
                } catch (error) {
                    console.error(`Error uploading ${documentType} ${isBack ? 'back' : 'front'}:`, error);
                    uploadErrors.push({ type: documentType, side: isBack ? 'back' : 'front', error });
                    throw error;
                }
            };

            // Driving License
            if (documents.license.front) {
                uploadPromises.push(uploadDocument(documents.license.front, 'license', false));
            }
            if (documents.license.back) {
                uploadPromises.push(uploadDocument(documents.license.back, 'license', true));
            }

            // CPC Card
            if (values.hasCpc) {
                if (documents.cpc.front) {
                    uploadPromises.push(uploadDocument(documents.cpc.front, 'cpc', false));
                }
                if (documents.cpc.back) {
                    uploadPromises.push(uploadDocument(documents.cpc.back, 'cpc', true));
                }
            }

            // Tachograph Card
            if (values.hasTacho) {
                if (documents.tacho.front) {
                    uploadPromises.push(uploadDocument(documents.tacho.front, 'tacho', false));
                }
                if (documents.tacho.back) {
                    uploadPromises.push(uploadDocument(documents.tacho.back, 'tacho', true));
                }
            }

            // Passport
            if (documents.id.front) {
                uploadPromises.push(uploadDocument(documents.id.front, 'id', false));
            }
            if (documents.id.back) {
                uploadPromises.push(uploadDocument(documents.id.back, 'id', true));
            }

            // Medical
            if (documents.medical) {
                uploadPromises.push(uploadDocument(documents.medical, 'medical', false));
            }

            // Wait for all document uploads to complete
            if (uploadPromises.length > 0) {
                try {
                    await Promise.all(uploadPromises);
                    console.log('All documents uploaded successfully');
                    
                    // If there were any upload errors, show them
                    if (uploadErrors.length > 0) {
                        console.warn('Some documents failed to upload:', uploadErrors);
                        setFieldError('submit', `Driver created but ${uploadErrors.length} document(s) failed to upload.`);
                    }
                } catch (uploadError) {
                    console.error('Error uploading documents:', uploadError);
                    setFieldError('submit', 'Driver created but some documents failed to upload.');
                }
            }

            onClose();
        } catch (error: any) {
            console.error('Add driver error:', error);
            setFieldError('submit', error.message || 'Failed to add driver. Please try again.');
        } finally {
            setIsUploading(false);
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl border border-gray-200/20 dark:border-gray-700/20">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 p-6">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">Add New Driver</h2>
                            <p className="text-blue-100">Complete driver information and upload required documents</p>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-2 rounded-xl hover:bg-white/20 transition-all duration-200 backdrop-blur-sm"
                        >
                            <IconX className="w-6 h-6 text-white" />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
                    <Formik
                        initialValues={initialValues}
                        validationSchema={validationSchema}
                        onSubmit={handleSubmit}
                    >
                        {({ values, errors, touched, setFieldValue, isSubmitting }: FormikProps<any>) => (
                            <Form className="p-8">
                                {/* Personal Information Section */}
                                <div className="mb-10">
                                    <div className="flex items-center mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mr-4">
                                            <span className="text-white font-bold text-lg">👤</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Personal Information</h3>
                                            <p className="text-gray-600 dark:text-gray-400">Basic driver details and contact information</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Name Field */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Name <span className="text-red-500">*</span>
                                            </label>
                                            <Field
                                                type="text"
                                                name="name"
                                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl 
                                                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                                          transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500
                                                          ${errors.name && touched.name ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                                placeholder="Enter full name"
                                            />
                                            <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Email Field */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Email Address <span className="text-red-500">*</span>
                                            </label>
                                            <Field
                                                type="email"
                                                name="email"
                                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl 
                                                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                                          transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500
                                                          ${errors.email && touched.email ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                                placeholder="driver@example.com"
                                            />
                                            <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Phone Number Field */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Phone Number <span className="text-red-500">*</span>
                                            </label>
                                            <Field
                                                type="tel"
                                                name="phoneNumber"
                                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl 
                                                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                                          transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500
                                                          ${errors.phoneNumber && touched.phoneNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                                placeholder="+44 7XXX XXXXXX"
                                            />
                                            <ErrorMessage name="phoneNumber" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* National Insurance Number */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                National Insurance Number
                                            </label>
                                            <Field
                                                type="text"
                                                name="nationalInsuranceNumber"
                                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl 
                                                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                                          transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500
                                                          ${errors.nationalInsuranceNumber && touched.nationalInsuranceNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                                placeholder="AB123456C"
                                            />
                                            <ErrorMessage name="nationalInsuranceNumber" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Address Field */}
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Address
                                            </label>
                                            <Field
                                                as="textarea"
                                                name="address"
                                                rows={3}
                                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl 
                                                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                                          transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500
                                                          ${errors.address && touched.address ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                                placeholder="Enter full address"
                                            />
                                            <ErrorMessage name="address" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Postcode */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Postcode
                                            </label>
                                            <Field
                                                type="text"
                                                name="postcode"
                                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl 
                                                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                                          transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500
                                                          ${errors.postcode && touched.postcode ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                                placeholder="SW1A 1AA"
                                            />
                                            <ErrorMessage name="postcode" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Employment Type */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Employment Type <span className="text-red-500">*</span>
                                            </label>
                                            <Field
                                                as="select"
                                                name="employmentType"
                                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl 
                                                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                                          transition-all duration-200 text-gray-900 dark:text-white
                                                          ${errors.employmentType && touched.employmentType ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                            >
                                                <option value="employee">Employee</option>
                                                <option value="contractor">Self-employed Contractor</option>
                                                <option value="agency">Agency Driver</option>
                                                <option value="temporary">Temporary Worker</option>
                                            </Field>
                                            <ErrorMessage name="employmentType" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Date Started */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Date Started <span className="text-red-500">*</span>
                                            </label>
                                            <Field
                                                type="date"
                                                name="dateStarted"
                                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl 
                                                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                                          transition-all duration-200 text-gray-900 dark:text-white
                                                          ${errors.dateStarted && touched.dateStarted ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                            />
                                            <ErrorMessage name="dateStarted" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>
                                    </div>
                                </div>

                                {/* License Information Section */}
                                <div className="mb-10">
                                    <div className="flex items-center mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center mr-4">
                                            <span className="text-white font-bold text-lg">📄</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">License Information</h3>
                                            <p className="text-gray-600 dark:text-gray-400">Driver licensing and certification details</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* License Number */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Driving License Number <span className="text-red-500">*</span>
                                            </label>
                                            <Field
                                                type="text"
                                                name="licenseNumber"
                                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl 
                                                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                                          transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500
                                                          ${errors.licenseNumber && touched.licenseNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                                placeholder="JONES061102W97TW"
                                            />
                                            <ErrorMessage name="licenseNumber" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* License Expiry */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                License Expiry Date <span className="text-red-500">*</span>
                                            </label>
                                            <Field
                                                type="date"
                                                name="licenseExpiry"
                                                min={dayjs().format('YYYY-MM-DD')}
                                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl 
                                                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                                          transition-all duration-200 text-gray-900 dark:text-white
                                                          ${errors.licenseExpiry && touched.licenseExpiry ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                            />
                                            <ErrorMessage name="licenseExpiry" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* License Categories */}
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                License Categories <span className="text-red-500">*</span>
                                            </label>
                                            <Select
                                                isMulti
                                                name="licenseCategories"
                                                options={licenseOptions}
                                                value={licenseOptions.filter(option => values.licenseCategories.includes(option.value))}
                                                onChange={(selectedOptions) => {
                                                    setFieldValue('licenseCategories', selectedOptions ? selectedOptions.map(option => option.value) : []);
                                                }}
                                                className={`react-select-container ${errors.licenseCategories && touched.licenseCategories ? 'react-select-error' : ''}`}
                                                classNamePrefix="react-select"
                                                placeholder="Select license categories..."
                                                styles={{
                                                    control: (base, state) => ({
                                                        ...base,
                                                        backgroundColor: 'rgb(249 250 251)',
                                                        borderColor: errors.licenseCategories && touched.licenseCategories ? 'rgb(239 68 68)' : 'rgb(229 231 235)',
                                                        borderRadius: '0.75rem',
                                                        padding: '0.5rem',
                                                        minHeight: '3rem',
                                                        boxShadow: 'none',
                                                        '&:hover': {
                                                            borderColor: 'rgb(59 130 246)',
                                                        },
                                                        '&:focus-within': {
                                                            borderColor: 'rgb(59 130 246)',
                                                            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
                                                        }
                                                    })
                                                }}
                                            />
                                            <ErrorMessage name="licenseCategories" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>
                                    </div>

                                    {/* CPC and Tachograph Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl border border-blue-100 dark:border-gray-600">
                                            <div className="flex items-center space-x-3 mb-4">
                                                <Field
                                                    type="checkbox"
                                                    name="hasCpc"
                                                    className="w-5 h-5 rounded border-2 border-blue-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                                                />
                                                <label className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    CPC Card
                                                </label>
                                            </div>
                                            {values.hasCpc && (
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                        CPC Expiry Date <span className="text-red-500">*</span>
                                                    </label>
                                                    <Field
                                                        type="date"
                                                        name="cpcExpiry"
                                                        min={dayjs().format('YYYY-MM-DD')}
                                                        className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl 
                                                                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                                                  transition-all duration-200 text-gray-900 dark:text-white
                                                                  ${errors.cpcExpiry && touched.cpcExpiry ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                                                    />
                                                    <ErrorMessage name="cpcExpiry" component="div" className="text-red-500 text-sm mt-1" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl border border-purple-100 dark:border-gray-600">
                                            <div className="flex items-center space-x-3 mb-4">
                                                <Field
                                                    type="checkbox"
                                                    name="hasTacho"
                                                    className="w-5 h-5 rounded border-2 border-purple-300 text-purple-600 focus:ring-purple-500 focus:ring-2"
                                                />
                                                <label className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    Digital Tachograph Card
                                                </label>
                                            </div>
                                            {values.hasTacho && (
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                            Card Number <span className="text-red-500">*</span>
                                                        </label>
                                                        <Field
                                                            type="text"
                                                            name="digitalTachographCardNumber"
                                                            className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl 
                                                                      focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent
                                                                      transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500
                                                                      ${errors.digitalTachographCardNumber && touched.digitalTachographCardNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                                                            placeholder="Enter card number"
                                                        />
                                                        <ErrorMessage name="digitalTachographCardNumber" component="div" className="text-red-500 text-sm mt-1" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                            Expiry Date <span className="text-red-500">*</span>
                                                        </label>
                                                        <Field
                                                            type="date"
                                                            name="tachoExpiry"
                                                            min={dayjs().format('YYYY-MM-DD')}
                                                            className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl 
                                                                      focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent
                                                                      transition-all duration-200 text-gray-900 dark:text-white
                                                                      ${errors.tachoExpiry && touched.tachoExpiry ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                                                        />
                                                        <ErrorMessage name="tachoExpiry" component="div" className="text-red-500 text-sm mt-1" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Information Section */}
                                <div className="mb-10">
                                    <div className="flex items-center mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center mr-4">
                                            <span className="text-white font-bold text-lg">📋</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Additional Information</h3>
                                            <p className="text-gray-600 dark:text-gray-400">Additional driver details and preferences</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Max Weekly Hours */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Max Weekly Hours <span className="text-red-500">*</span>
                                            </label>
                                            <Field
                                                type="number"
                                                name="maxWeeklyHours"
                                                min="1"
                                                max="168"
                                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl 
                                                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                                          transition-all duration-200 text-gray-900 dark:text-white
                                                          ${errors.maxWeeklyHours && touched.maxWeeklyHours ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                            />
                                            <ErrorMessage name="maxWeeklyHours" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Penalty Points */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Penalty Points <span className="text-red-500">*</span>
                                            </label>
                                            <Field
                                                type="number"
                                                name="penaltyPoints"
                                                min="0"
                                                max="12"
                                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl 
                                                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                                          transition-all duration-200 text-gray-900 dark:text-white
                                                          ${errors.penaltyPoints && touched.penaltyPoints ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                            />
                                            <ErrorMessage name="penaltyPoints" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Notes */}
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Notes
                                            </label>
                                            <Field
                                                as="textarea"
                                                name="notes"
                                                rows={3}
                                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl 
                                                          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                                                          transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500
                                                          ${errors.notes && touched.notes ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                                placeholder="Enter any additional notes"
                                            />
                                            <ErrorMessage name="notes" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Working Time Directive */}
                                        <div className="flex items-center space-x-3 md:col-span-2">
                                            <Field
                                                type="checkbox"
                                                name="optedOutOfWorkingTimeDirective"
                                                className="w-5 h-5 rounded border-2 border-blue-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                                            />
                                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Opted out of 48-hour working week limit
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Documents Section */}
                                <div className="mb-8">
                                    <div className="flex items-center mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center mr-4">
                                            <span className="text-white font-bold text-lg">📁</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Required Documents</h3>
                                            <p className="text-gray-600 dark:text-gray-400">Upload all necessary identification and certification documents</p>
                                        </div>
                                    </div>
                                    
                                    {/* Document Upload Interface - Keep existing implementation */}
                                    <div className="flex flex-wrap gap-2 mb-6 p-2 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                                        {[
                                            { key: 'license', label: 'Driving License', icon: '🚗' },
                                            ...(values.hasCpc ? [{ key: 'cpc', label: 'CPC Card', icon: '📋' }] : []),
                                            ...(values.hasTacho ? [{ key: 'tacho', label: 'Tachograph', icon: '⏰' }] : []),
                                            { key: 'id', label: 'Passport', icon: '📘' },
                                            { key: 'medical', label: 'Medical Certificate', icon: '🏥' }
                                        ].map((doc) => (
                                            <button
                                                key={doc.key}
                                                type="button"
                                                className={`flex items-center px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                                                    activeDocument === doc.key
                                                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md transform scale-105'
                                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                                                }`}
                                                onClick={() => setActiveDocument(doc.key as any)}
                                            >
                                                <span className="mr-2 text-lg">{doc.icon}</span>
                                                {doc.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Document Side Tabs */}
                                    {activeDocument !== 'medical' && (
                                        <div className="flex gap-2 mb-6">
                                            <button
                                                type="button"
                                                className={`flex items-center px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                                                    activeSide === 'front'
                                                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                }`}
                                                onClick={() => setActiveSide('front')}
                                            >
                                                Front Side
                                            </button>
                                            <button
                                                type="button"
                                                className={`flex items-center px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                                                    activeSide === 'back'
                                                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                }`}
                                                onClick={() => setActiveSide('back')}
                                            >
                                                Back Side
                                            </button>
                                        </div>
                                    )}

                                    {/* File Upload Area */}
                                    <div
                                        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer
                                                  ${dragActive 
                                                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-105' 
                                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                                  }`}
                                        onDragEnter={handleDrag}
                                        onDragOver={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            className="hidden"
                                        />

                                        {activeDocument === 'medical' ? (
                                            documents.medical ? (
                                                <div className="space-y-4">
                                                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center">
                                                        <IconFile className="w-10 h-10 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-lg text-gray-900 dark:text-white">{documents.medical.name}</p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {(documents.medical.size / 1024 / 1024).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handlePreview(documents.medical);
                                                            }}
                                                            className="flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 
                                                                     rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200"
                                                        >
                                                            <IconEye className="w-4 h-4 mr-2" />
                                                            View
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownload(documents.medical);
                                                            }}
                                                            className="flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 
                                                                     rounded-xl hover:bg-green-200 dark:hover:bg-green-900/50 transition-all duration-200"
                                                        >
                                                            <IconDownload className="w-4 h-4 mr-2" />
                                                            Download
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeFile();
                                                            }}
                                                            className="flex items-center px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 
                                                                     rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-200"
                                                        >
                                                            <IconTrash className="w-4 h-4 mr-2" />
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl flex items-center justify-center">
                                                        <IconMenuDragAndDrop className="w-10 h-10 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                            Upload Medical Certificate
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            Drag and drop your file here, or click to browse
                                                        </p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                                            Supports: PDF, JPG, PNG (Max 10MB)
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            documents[activeDocument][activeSide] ? (
                                                <div className="space-y-4">
                                                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center">
                                                        <IconFile className="w-10 h-10 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-lg text-gray-900 dark:text-white">
                                                            {documents[activeDocument][activeSide]?.name}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {((documents[activeDocument][activeSide]?.size || 0) / 1024 / 1024).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handlePreview(documents[activeDocument][activeSide]);
                                                            }}
                                                            className="flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 
                                                                     rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200"
                                                        >
                                                            <IconEye className="w-4 h-4 mr-2" />
                                                            View
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownload(documents[activeDocument][activeSide]);
                                                            }}
                                                            className="flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 
                                                                     rounded-xl hover:bg-green-200 dark:hover:bg-green-900/50 transition-all duration-200"
                                                        >
                                                            <IconDownload className="w-4 h-4 mr-2" />
                                                            Download
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeFile();
                                                            }}
                                                            className="flex items-center px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 
                                                                     rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-200"
                                                        >
                                                            <IconTrash className="w-4 h-4 mr-2" />
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl flex items-center justify-center">
                                                        <IconMenuDragAndDrop className="w-10 h-10 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                            Upload {documentIcons[activeDocument]} {activeSide === 'front' ? 'Front' : 'Back'} Side
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            Drag and drop your file here, or click to browse
                                                        </p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                                            Supports: PDF, JPG, PNG (Max 10MB)
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Form-level Error Message */}
                                <ErrorMessage name="submit" component="div" className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                                                      text-red-600 dark:text-red-400 rounded-xl flex items-center">
                                    <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mr-3">
                                        <span className="text-red-600 dark:text-red-400 text-sm">⚠</span>
                                    </div>
                                    <ErrorMessage name="submit" />
                                </ErrorMessage>

                                {/* Submit Buttons */}
                                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                                                 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-semibold"
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl 
                                                 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold
                                                 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none
                                                 flex items-center"
                                        disabled={isSubmitting || isUploading}
                                    >
                                        {isSubmitting || isUploading ? (
                                            <>
                                                <svg
                                                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    ></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    ></path>
                                                </svg>
                                                Adding Driver...
                                            </>
                                        ) : (
                                            <>
                                                <IconCircleCheck className="w-5 h-5 mr-2" />
                                                Add Driver
                                            </>
                                        )}
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>

            {/* File Preview Modal */}
            {previewOpen && previewFile && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{previewFile.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {(previewFile.size / 1024 / 1024).toFixed(2)} MB • {previewFile.type}
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewOpen(false)}
                                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                            >
                                <IconX className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-auto text-center">
                            {previewFile.type.startsWith('image/') ? (
                                <img
                                    src={URL.createObjectURL(previewFile)}
                                    alt="Document Preview"
                                    className="max-w-full max-h-[60vh] mx-auto rounded-xl shadow-lg"
                                />
                            ) : previewFile.type === 'application/pdf' ? (
                                <iframe
                                    src={`${URL.createObjectURL(previewFile)}#view=FitH`}
                                    className="w-full h-[60vh] rounded-xl"
                                    title="PDF Preview"
                                />
                            ) : (
                                <div className="p-12 text-center">
                                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-400 to-gray-600 
                                                  rounded-2xl flex items-center justify-center mb-4">
                                        <IconFile className="w-10 h-10 text-white" />
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 text-lg">
                                        Preview not available for this file type
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
                            <button
                                onClick={() => handleDownload(previewFile)}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl 
                                         hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold
                                         shadow-md hover:shadow-lg flex items-center"
                            >
                                <IconDownload className="w-5 h-5 mr-2" />
                                Download
                            </button>
                            <button
                                onClick={() => setPreviewOpen(false)}
                                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                                         rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddDriverModal;