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
import { documentTypes, documentCategories, getDocumentsByCategory } from '../../../../../../constants/documentTypes';

interface UploadDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string | number;
    entityType: 'drivers' | 'providers';
    onSuccess?: () => void;
}

const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({ isOpen, onClose, userId, entityType, onSuccess }) => {
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

        // Auto-fill document name and set requiresTwoSides flag based on type
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;

        console.log('[handleFileChange] File selected:', {
            fileName: selectedFile?.name,
            fileSize: selectedFile?.size,
            fileSizeMB: selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : 'N/A',
            activeTab,
        });

        if (selectedFile) {
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
            await axiosInstance.post(`/${entityType}/${userId}/documents/`, uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Call onSuccess callback if provided
            if (onSuccess) {
                onSuccess();
            }

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
        } catch (error) {
            setUploadError('Failed to upload document. Please try again.');
            console.error('Upload error:', error);
        } finally {
            setIsUploading(false);
        }
    };

    // Check if file has an image extension
    const isImageFile = (file: File): boolean => {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        return imageExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    };

    // Check if file has a PDF extension
    const isPdfFile = (file: File): boolean => {
        return file.name.toLowerCase().endsWith('.pdf');
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
                            {Object.entries(documentCategories).map(([categoryKey, categoryLabel]) => {
                                const categoryDocs = getDocumentsByCategory(categoryKey);
                                if (categoryDocs.length === 0) return null;
                                
                                return (
                                    <optgroup key={categoryKey} label={categoryLabel}>
                                        {categoryDocs.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                );
                            })}
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

export default UploadDocumentModal;