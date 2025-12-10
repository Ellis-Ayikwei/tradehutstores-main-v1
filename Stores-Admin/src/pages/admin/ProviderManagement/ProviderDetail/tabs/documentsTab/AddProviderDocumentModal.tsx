import React, { useState, useRef } from 'react';
import dayjs from 'dayjs';
import IconX from '../../../../../../components/Icon/IconX';
import IconFile from '../../../../../../components/Icon/IconFile';
import IconCircleCheck from '../../../../../../components/Icon/IconCircleCheck';
import IconMenuDragAndDrop from '../../../../../../components/Icon/Menu/IconMenuDragAndDrop';
import IconDownload from '../../../../../../components/Icon/IconDownload';
import IconEye from '../../../../../../components/Icon/IconEye';
import IconTrash from '../../../../../../components/Icon/IconTrash';
import axiosInstance from '../../../../../../services/axiosInstance';
import showNotification from '../../../../../../utilities/showNotifcation';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUpload, faFile, faSpinner, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';


interface AddProviderDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    providerId: string | number;
    onSuccess?: () => void;
}

const AddProviderDocumentModal: React.FC<AddProviderDocumentModalProps> = ({ isOpen, onClose, providerId, onSuccess }) => {
    const [formData, setFormData] = useState({
        documentType: '',
        documentName: '',
        referenceNumber: '',
        issueDate: '',
        expiryDate: '',
        hasExpiry: true,
        requiresTwoSides: false,
    });

    const [files, setFiles] = useState<{
        front: File | null;
        back: File | null;
    }>({
        front: null,
        back: null,
    });

    const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const documentTypes = [
        // Driver & Operator Documents
        { value: 'driving_license', label: 'Driving License', requiresTwoSides: true, category: 'driver' },
        { value: 'cpc_card', label: 'CPC Qualification Card', requiresTwoSides: true, category: 'driver' },
        { value: 'tacho_card', label: 'Tachograph Card', requiresTwoSides: true, category: 'driver' },
        { value: 'adr_certificate', label: 'ADR Certificate (Dangerous Goods)', requiresTwoSides: false, category: 'driver' },
        { value: 'medical_certificate', label: 'Medical Certificate', requiresTwoSides: false, category: 'driver' },
        { value: 'dbs_check', label: 'DBS Check Certificate', requiresTwoSides: false, category: 'driver' },
        { value: 'driver_training', label: 'Driver Training Certificate', requiresTwoSides: false, category: 'driver' },
        { value: 'passport', label: 'Passport/ID Document', requiresTwoSides: true, category: 'personal' },
        { value: 'right_to_work', label: 'Right to Work Documentation', requiresTwoSides: false, category: 'personal' },
        { value: 'proof_of_address', label: 'Proof of Address', requiresTwoSides: false, category: 'personal' },
    
        // Vehicle Documents
        { value: 'vehicle_registration', label: 'Vehicle Registration (V5C)', requiresTwoSides: true, category: 'vehicle' },
        { value: 'mot_certificate', label: 'MOT Certificate', requiresTwoSides: false, category: 'vehicle' },
        { value: 'vehicle_insurance', label: 'Vehicle Insurance Certificate', requiresTwoSides: false, category: 'vehicle' },
        { value: 'operators_license', label: 'Operator\'s License (O-License)', requiresTwoSides: false, category: 'vehicle' },
        { value: 'plating_certificate', label: 'Plating Certificate (HGV)', requiresTwoSides: false, category: 'vehicle' },
        { value: 'vehicle_inspection', label: 'Vehicle Inspection Certificate', requiresTwoSides: false, category: 'vehicle' },
        { value: 'annual_test', label: 'Annual Test Certificate', requiresTwoSides: false, category: 'vehicle' },
    
        // Business Insurance
        { value: 'public_liability', label: 'Public Liability Insurance', requiresTwoSides: false, category: 'insurance' },
        { value: 'employers_liability', label: 'Employer\'s Liability Insurance', requiresTwoSides: false, category: 'insurance' },
        { value: 'goods_in_transit', label: 'Goods in Transit Insurance', requiresTwoSides: false, category: 'insurance' },
        { value: 'professional_indemnity', label: 'Professional Indemnity Insurance', requiresTwoSides: false, category: 'insurance' },
        { value: 'motor_trade_insurance', label: 'Motor Trade Insurance', requiresTwoSides: false, category: 'insurance' },
    
        // Business Registration & Licenses
        { value: 'company_registration', label: 'Company Registration Certificate', requiresTwoSides: false, category: 'business' },
        { value: 'vat_registration', label: 'VAT Registration Certificate', requiresTwoSides: false, category: 'business' },
        { value: 'trading_license', label: 'Trading License', requiresTwoSides: false, category: 'business' },
        { value: 'waste_carrier_license', label: 'Waste Carrier License', requiresTwoSides: false, category: 'business' },
        { value: 'scrap_metal_license', label: 'Scrap Metal Dealer License', requiresTwoSides: false, category: 'business' },
        { value: 'waste_management_license', label: 'Waste Management License', requiresTwoSides: false, category: 'business' },
    
        // Compliance & Safety
        { value: 'health_safety_policy', label: 'Health & Safety Policy', requiresTwoSides: false, category: 'compliance' },
        { value: 'risk_assessment', label: 'Risk Assessment Document', requiresTwoSides: false, category: 'compliance' },
        { value: 'coshh_assessment', label: 'COSHH Assessment', requiresTwoSides: false, category: 'compliance' },
        { value: 'environmental_policy', label: 'Environmental Policy', requiresTwoSides: false, category: 'compliance' },
        { value: 'quality_management', label: 'Quality Management Certificate', requiresTwoSides: false, category: 'compliance' },
        { value: 'gdpr_policy', label: 'GDPR Privacy Policy', requiresTwoSides: false, category: 'compliance' },
    
        // Financial Documents
        { value: 'bank_statement', label: 'Bank Statement', requiresTwoSides: false, category: 'financial' },
        { value: 'financial_standing', label: 'Financial Standing Evidence', requiresTwoSides: false, category: 'financial' },
        { value: 'credit_reference', label: 'Credit Reference', requiresTwoSides: false, category: 'financial' },
    
        // Employment & Contracts
        { value: 'employment_contract', label: 'Employment Contract', requiresTwoSides: false, category: 'employment' },
        { value: 'contractor_agreement', label: 'Contractor Agreement', requiresTwoSides: false, category: 'employment' },
        { value: 'terms_conditions', label: 'Terms & Conditions', requiresTwoSides: false, category: 'employment' },
    
        // Specialized Certifications
        { value: 'iso_certificate', label: 'ISO Certification', requiresTwoSides: false, category: 'certification' },
        { value: 'bifa_membership', label: 'BIFA Membership Certificate', requiresTwoSides: false, category: 'certification' },
        { value: 'fta_membership', label: 'FTA Membership Certificate', requiresTwoSides: false, category: 'certification' },
        { value: 'trade_association', label: 'Trade Association Membership', requiresTwoSides: false, category: 'certification' },
    
        // International & Customs
        { value: 'aea_certificate', label: 'AEA Certificate (Customs)', requiresTwoSides: false, category: 'international' },
        { value: 'eori_number', label: 'EORI Number Certificate', requiresTwoSides: false, category: 'international' },
        { value: 'customs_registration', label: 'Customs Registration', requiresTwoSides: false, category: 'international' },
    
        // Other Documents
        { value: 'other', label: 'Other Document', requiresTwoSides: false, category: 'other' }
    ];





  
    // Check if file has an image extension
    const isImageFile = (file: File): boolean => {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        return imageExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    };

    // Check if file has a PDF extension
    const isPdfFile = (file: File): boolean => {
        return file.name.toLowerCase().endsWith('.pdf');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const target = e.target as HTMLInputElement;
            setFormData({
                ...formData,
                [name]: target.checked,
            });
        } else {
            setFormData({
                ...formData,
                [name]: value,
            });
        }

        // Auto-fill document name based on type and set requiresTwoSides flag
        if (name === 'documentType') {
            const selectedType = documentTypes.find((type) => type.value === value);
            if (selectedType) {
                setFormData((prev) => ({
                    ...prev,
                    documentName: selectedType.label,
                    requiresTwoSides: selectedType.requiresTwoSides,
                }));
            }
        }
    };

    const MAX_FILENAME_LENGTH = 100;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;

        console.log('[handleFileChange] File selected:', {
            fileName: selectedFile?.name,
            fileSize: selectedFile?.size,
            fileSizeMB: selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : 'N/A',
            activeTab,
        });

        if (selectedFile) {
            // client-side filename length validation
            if (selectedFile.name.length > MAX_FILENAME_LENGTH) {
                setUploadError(`Ensure this filename has at most ${MAX_FILENAME_LENGTH} characters (it has ${selectedFile.name.length}).`);
                // Clear the file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }

            const maxSize = 10 * 1024 * 1024; // 10MB in bytes
            console.log('[handleFileChange] Size check:', {
                fileSize: selectedFile.size,
                maxSize,
                fileSizeMB: (selectedFile.size / 1024 / 1024).toFixed(2),
                maxSizeMB: (maxSize / 1024 / 1024).toFixed(2),
                exceedsLimit: selectedFile.size > maxSize,
            });

            if (selectedFile.size > maxSize) {
                console.log('[handleFileChange] ❌ File size validation FAILED - file exceeds limit');
                setUploadError(`File size exceeds 10MB limit. Current size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`);
                // Clear the file input and remove file from state
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setFiles((prev) => ({
                    ...prev,
                    [activeTab]: null,
                }));
                return;
            }
            console.log('[handleFileChange] ✅ File size validation PASSED - setting file in state');
            setFiles((prev) => ({
                ...prev,
                [activeTab]: selectedFile,
            }));
            setUploadError('');
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

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            console.log('[handleDrop] File dropped:', {
                fileName: droppedFile.name,
                fileSize: droppedFile.size,
                fileSizeMB: (droppedFile.size / 1024 / 1024).toFixed(2),
                activeTab,
            });

            // client-side filename length validation
            if (droppedFile.name.length > MAX_FILENAME_LENGTH) {
                setUploadError(`Ensure this filename has at most ${MAX_FILENAME_LENGTH} characters (it has ${droppedFile.name.length}).`);
                return;
            }

            const maxSize = 10 * 1024 * 1024; // 10MB in bytes
            console.log('[handleDrop] Size check:', {
                fileSize: droppedFile.size,
                maxSize,
                fileSizeMB: (droppedFile.size / 1024 / 1024).toFixed(2),
                maxSizeMB: (maxSize / 1024 / 1024).toFixed(2),
                exceedsLimit: droppedFile.size > maxSize,
            });

            if (droppedFile.size > maxSize) {
                console.log('[handleDrop] ❌ File size validation FAILED - file exceeds limit');
                setUploadError(`File size exceeds 10MB limit. Current size: ${(droppedFile.size / 1024 / 1024).toFixed(2)} MB`);
                // Clear file from state
                setFiles((prev) => ({
                    ...prev,
                    [activeTab]: null,
                }));
                return;
            }
            console.log('[handleDrop] ✅ File size validation PASSED - setting file in state');
            setFiles((prev) => ({
                ...prev,
                [activeTab]: droppedFile,
            }));
            setUploadError('');
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    // Function to handle file preview
    const handlePreview = (side: 'front' | 'back') => {
        const file = files[side];
        if (!file) return;

        if (isImageFile(file) || isPdfFile(file)) {
            setPreviewSide(side);
            setPreviewOpen(true);
        } else {
            // For other file types, try to download instead
            handleDownload(side);
        }
    };

    // Function to handle file download
    const handleDownload = (side: 'front' | 'back') => {
        const file = files[side];
        if (!file) return;

        // Create a temporary URL for the file
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Function to remove a file
    const removeFile = (side: 'front' | 'back', e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        setFiles((prev) => ({
            ...prev,
            [side]: null,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!files.front) {
            setUploadError('Please upload the document');
            return;
        }

        if (formData.requiresTwoSides && !files.back) {
            setActiveTab('back');
            setUploadError('This document requires both sides. Please upload the back side.');
            return;
        }

        if (!formData.documentType) {
            setUploadError('Please select a document type');
            return;
        }

        if (!formData.referenceNumber && formData.documentType !== 'other') {
            setUploadError('Please enter the document reference number');
            return;
        }

        if (!formData.issueDate) {
            setUploadError('Please enter the issue date');
            return;
        }

        if (formData.hasExpiry && !formData.expiryDate) {
            setUploadError('Please enter the expiry date or uncheck "Has Expiry Date"');
            return;
        }

        setIsUploading(true);
        setUploadError('');

        try {
            // Create FormData object to send to server
            const uploadData = new FormData();

            uploadData.append('document_front', files.front);
            if (files.back) {
                uploadData.append('document_back', files.back);
            }
            uploadData.append('document_type', formData.documentType);
            uploadData.append('reference_number', formData.referenceNumber);
            uploadData.append('issue_date', formData.issueDate);
            uploadData.append('has_two_sides', formData.requiresTwoSides.toString());

            if (formData.hasExpiry) {
                uploadData.append('expiry_date', formData.expiryDate);
            }

            // Log the FormData contents
            console.log("FormData contents:");
            for (let pair of uploadData.entries()) {
                console.log(pair[0] + ': ' + pair[1]);
            }

            // Make the API call directly from the modal
            await axiosInstance.post(`/providers/${providerId}/documents/`, uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Call onSuccess callback if provided
            if (onSuccess) {
                onSuccess();
            }

            showNotification({ message: 'Document uploaded successfully', type: 'success', showHide: true });
            onClose();

            // // Reset form
            // setFormData({
            //     documentType: '',
            //     documentName: '',
            //     referenceNumber: '',
            //     issueDate: '',
            //     expiryDate: '',
            //     hasExpiry: true,
            //     requiresTwoSides: false,
            // });
            // setFiles({ front: null, back: null });
        } catch (error: any) {
            // Try to surface backend validation error message when available
            const backendError = error?.response?.data?.detail || error?.response?.data?.error || error?.response?.data?.message;
            if (backendError) {
                setUploadError(Array.isArray(backendError) ? backendError.join(', ') : String(backendError));
            } else {
                setUploadError('Failed to upload document. Please try again.');
            }
            console.error('Upload error:', error);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
                    <h2 className="text-xl font-bold dark:text-white">Upload Document</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Close">
                        <IconX className="w-5 h-5 dark:text-white" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4">
                    {/* Document Type */}
                    <div className="mb-4">
                        <label htmlFor="documentType" className="block mb-1 font-medium dark:text-white">
                            Document Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="documentType"
                            name="documentType"
                            value={formData.documentType}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
                                      dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            required
                        >
                            <option value="">Select Document Type</option>
                            <optgroup label="Driver & Vehicle Documents">
                                {documentTypes.slice(0, 7).map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Personal ID Documents">
                                {documentTypes.slice(7, 13).map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Business & Employment">
                                {documentTypes.slice(13, 17).map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Moving & Logistics">
                                {documentTypes.slice(17, 23).map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Compliance & Safety">
                                {documentTypes.slice(23, 26).map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Other">
                                {documentTypes.slice(26).map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    {/* Document Name */}
                    <div className="mb-4">
                        <label htmlFor="documentName" className="block mb-1 font-medium dark:text-white">
                            Document Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="documentName"
                            name="documentName"
                            value={formData.documentName}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
                                      dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            placeholder="e.g. UK Driving Licence, Vehicle Insurance"
                            required
                        />
                    </div>

                    {/* Reference Number */}
                    <div className="mb-4">
                        <label htmlFor="referenceNumber" className="block mb-1 font-medium dark:text-white">
                            Reference Number {formData.documentType !== 'other' && <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="text"
                            id="referenceNumber"
                            name="referenceNumber"
                            value={formData.referenceNumber}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
                                      dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            placeholder="e.g. JONES061102W97TW, A123 BCT, etc."
                            required={formData.documentType !== 'other'}
                        />
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            Enter licence number, registration, certificate number, etc.
                        </p>
                    </div>

                    {/* Date Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="issueDate" className="block mb-1 font-medium dark:text-white">
                                Issue Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                id="issueDate"
                                name="issueDate"
                                value={formData.issueDate}
                                onChange={handleChange}
                                max={dayjs().format('YYYY-MM-DD')}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
                                          dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label htmlFor="expiryDate" className="font-medium dark:text-white">
                                    Expiry Date
                                    {formData.hasExpiry && <span className="text-red-500">*</span>}
                                </label>
                                <label className="flex items-center text-sm dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        name="hasExpiry"
                                        checked={formData.hasExpiry}
                                        onChange={() => setFormData({ ...formData, hasExpiry: !formData.hasExpiry, expiryDate: '' })}
                                        className="mr-1"
                                    />
                                    Has Expiry Date
                                </label>
                            </div>
                            <input
                                type="date"
                                id="expiryDate"
                                name="expiryDate"
                                value={formData.expiryDate}
                                onChange={handleChange}
                                min={dayjs().format('YYYY-MM-DD')}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
                                          dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                disabled={!formData.hasExpiry}
                                required={formData.hasExpiry}
                            />
                        </div>
                    </div>

                    {/* File Upload Tabs - Only show if a document type is selected */}
                    {formData.documentType && (
                        <div className="mb-4">
                            <div className="flex border-b border-gray-200 dark:border-slate-700 mb-4">
                                <button
                                    type="button"
                                    className={`py-2 px-4 font-medium text-sm ${
                                        activeTab === 'front'
                                            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                                    }`}
                                    onClick={() => setActiveTab('front')}
                                >
                                    {formData.requiresTwoSides ? 'Front Side' : 'Document'} <span className="text-red-500">*</span>
                                </button>
                                {formData.requiresTwoSides && (
                                    <button
                                        type="button"
                                        className={`py-2 px-4 font-medium text-sm ${
                                            activeTab === 'back'
                                                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                                        }`}
                                        onClick={() => setActiveTab('back')}
                                    >
                                        Back Side <span className="text-red-500">*</span>
                                    </button>
                                )}
                            </div>

                            {/* File Upload Area */}
                            <div>
                                <label className="block mb-1 font-medium dark:text-white">
                                    Upload {formData.requiresTwoSides ? (activeTab === 'front' ? 'Front Side' : 'Back Side') : 'Document'} <span className="text-red-500">*</span>
                                </label>
                                <div
                                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                                              ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 hover:border-blue-500 dark:border-slate-600'}`}
                                    onDragEnter={handleDrag}
                                    onDragOver={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={triggerFileInput}
                                >
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" />

                                    {files[activeTab] ? (
                                        <div className="flex flex-col items-center">
                                            {/* Preview for image files */}
                                            {isImageFile(files[activeTab]!) && (
                                                <div className="mb-3 relative">
                                                    <img
                                                        src={URL.createObjectURL(files[activeTab]!)}
                                                        alt="Preview"
                                                        className="h-32 object-cover rounded-md border border-gray-200 dark:border-slate-700"
                                                    />
                                                </div>
                                            )}

                                            {/* PDF icon for PDF files */}
                                            {isPdfFile(files[activeTab]!) && (
                                                <div className="mb-3 relative bg-red-50 p-4 rounded-md border border-red-100 dark:bg-red-900/10 dark:border-red-900/20">
                                                    <div className="flex items-center justify-center">
                                                        <IconFile className="w-12 h-12 text-red-500" />
                                                    </div>
                                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">PDF Document</p>
                                                </div>
                                            )}

                                            {/* Generic file icon for other files */}
                                            {!isImageFile(files[activeTab]!) && !isPdfFile(files[activeTab]!) && (
                                                <div className="mb-3 relative bg-gray-50 p-4 rounded-md border border-gray-100 dark:bg-gray-900/10 dark:border-gray-900/20">
                                                    <div className="flex items-center justify-center">
                                                        <IconFile className="w-12 h-12 text-gray-500" />
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Document File</p>
                                                </div>
                                            )}

                                            <div className="flex items-center mb-2">
                                                <IconFile className="w-8 h-8 text-blue-500 dark:text-blue-400 mr-2" />
                                                <div className="text-left">
                                                    <p className="font-medium dark:text-white">{files[activeTab]!.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-slate-400">{(files[activeTab]!.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            </div>

                                            {/* Document Action Buttons */}
                                            <div className="flex items-center mt-2 space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePreview(activeTab);
                                                    }}
                                                    className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md
                                                              hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                                >
                                                    <IconEye className="w-4 h-4 mr-1" />
                                                    View
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownload(activeTab);
                                                    }}
                                                    className="flex items-center px-3 py-1.5 bg-green-50 text-green-600 rounded-md
                                                              hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                                                >
                                                    <IconDownload className="w-4 h-4 mr-1" />
                                                    Download
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFile(activeTab);
                                                    }}
                                                    className="flex items-center px-3 py-1.5 bg-red-50 text-red-600 rounded-md
                                                              hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                                                >
                                                    <IconTrash className="w-4 h-4 mr-1" />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <IconMenuDragAndDrop className="w-10 h-10 text-gray-400 dark:text-slate-500 mb-2" />
                                            <p className="text-gray-500 dark:text-slate-400 mb-1">
                                                Click to upload or drag and drop {formData.requiresTwoSides ? (activeTab === 'front' ? 'front side' : 'back side') : 'document'}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-slate-500">PDF, JPG, PNG, DOC (Max 10MB)</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Upload Status Indicators */}
                            {formData.requiresTwoSides && (
                                <div className="flex justify-between mt-2 text-sm text-gray-500 dark:text-slate-400">
                                    <div className="flex items-center">
                                        <div className={`w-3 h-3 rounded-full mr-1.5 ${files.front ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}></div>
                                        Front Side
                                    </div>
                                    <div className="flex items-center">
                                        <div className={`w-3 h-3 rounded-full mr-1.5 ${files.back ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}></div>
                                        Back Side
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Message */}
                    {uploadError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">{uploadError}</div>}

                    {/* Submit Buttons */}
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-white"
                            disabled={isUploading}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center" disabled={isUploading}>
                            {isUploading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <IconCircleCheck className="w-4 h-4 mr-1" />
                                    Upload Document
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* File Preview Modal */}
            {previewOpen && files[previewSide] && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75">
                    <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
                            <h3 className="text-lg font-bold dark:text-white">{files[previewSide]?.name}</h3>
                            <button onClick={() => setPreviewOpen(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Close">
                                <IconX className="w-5 h-5 dark:text-white" />
                            </button>
                        </div>

                        <div className="p-4 flex-1 overflow-auto text-center">
                            {isImageFile(files[previewSide]!) ? (
                                <img src={URL.createObjectURL(files[previewSide]!)} alt="Document Preview" className="max-w-full max-h-[70vh] mx-auto" />
                            ) : isPdfFile(files[previewSide]!) ? (
                                <iframe src={`${URL.createObjectURL(files[previewSide]!)}#view=FitH`} className="w-full h-[70vh]" title="PDF Preview" />
                            ) : (
                                <div className="p-8 text-center">
                                    <IconFile className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-slate-500" />
                                    <p className="text-gray-600 dark:text-slate-300">Preview not available for this file type.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t dark:border-slate-700 flex justify-end space-x-3">
                            <button onClick={() => handleDownload(previewSide)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
                                <IconDownload className="w-4 h-4 mr-2" />
                                Download
                            </button>
                            <button
                                onClick={() => setPreviewOpen(false)}
                                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-white"
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

export default AddProviderDocumentModal;