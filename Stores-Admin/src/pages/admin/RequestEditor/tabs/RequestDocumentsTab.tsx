import React, { useState, useRef } from 'react';
import axiosInstance from '../../../../services/axiosInstance';
import showMessage from '../../../../helper/showMessage';
import showRequestError from '../../../../helper/showRequestError';
import { IconFileUpload, IconFile, IconTrash, IconDownload, IconX, IconPlus } from '@tabler/icons-react';

interface Document {
    id: string;
    document_type?: string;
    document_name?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    created_at?: string;
    uploaded_by?: string;
    uploaded_by_name?: string;
}

interface RequestDocumentsTabProps {
    requestId?: string;
    requestData?: {
        documents?: Document[];
    };
    onRefetch?: () => void;
}

const RequestDocumentsTab: React.FC<RequestDocumentsTabProps> = ({
    requestId,
    requestData,
    onRefetch = () => {}
}) => {
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);

    const documents = requestData?.documents || [];

    const formatFileSize = (bytes?: number): string => {
        if (!bytes) return 'Unknown size';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const formatDate = (dateString?: string): string => {
        if (!dateString) return 'Unknown date';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const handleFileSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        // Validate and add new files to selected files
        const newFiles: File[] = [];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        Array.from(files).forEach((file) => {
            if (file.size > maxSize) {
                showMessage(`File "${file.name}" exceeds 10MB limit and was not added`, 'error');
            } else {
                newFiles.push(file);
            }
        });

        if (newFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...newFiles]);
        }
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveSelectedFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUploadFiles = async () => {
        if (!requestId || selectedFiles.length === 0) return;

        setUploading(true);
        try {
            const formData = new FormData();
            
            // Append all selected files
            selectedFiles.forEach((file) => {
                formData.append('files', file);
            });

            await axiosInstance.post(
                `/instant-requests/${requestId}/documents/`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            showMessage('Documents uploaded successfully');
            setSelectedFiles([]); // Clear selected files after successful upload
            onRefetch();
        } catch (error) {
            showRequestError(error);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (documentId: string) => {
        if (!requestId || !confirm('Are you sure you want to delete this document?')) return;

        setDeleting(documentId);
        try {
            await axiosInstance.delete(`/instant-requests/${requestId}/documents/${documentId}/`);
            showMessage('Document deleted successfully');
            onRefetch();
        } catch (error) {
            showRequestError(error);
        } finally {
            setDeleting(null);
        }
    };

    const handleDownload = (document: Document) => {
        if (document.file_url) {
            window.open(document.file_url, '_blank');
        } else {
            showMessage('Document URL not available', 'error');
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
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Documents</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Upload and manage documents for this request
                    </p>
                </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <IconFileUpload className="w-5 h-5 text-gray-400" />
                    Upload Documents
                </h4>
                
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                    />
                    
                    <IconFileUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Drag and drop files here, or{' '}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline"
                        >
                            browse
                        </button>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TXT (Max 10MB per file)
                    </p>
                </div>

                {/* Selected Files Preview */}
                {selectedFiles.length > 0 && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                Selected Files ({selectedFiles.length})
                            </h5>
                            <div className="flex items-center gap-3">
                                {uploading && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Uploading...</span>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={handleUploadFiles}
                                    disabled={uploading || !requestId || selectedFiles.length === 0}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <IconFileUpload className="w-4 h-4" />
                                    {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}`}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {selectedFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <IconFile className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {file.name}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatFileSize(file.size)}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSelectedFile(index)}
                                        disabled={uploading}
                                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors flex-shrink-0"
                                        title="Remove file"
                                    >
                                        <IconX className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Documents List */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <IconFile className="w-5 h-5 text-gray-400" />
                    Uploaded Documents ({documents.length})
                </h4>
                
                {documents.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                        <IconFile className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No documents uploaded yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {documents.map((document) => (
                            <div
                                key={document.id}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                        <IconFile className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {document.document_name || document.file_name || 'Untitled Document'}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            {document.document_type && (
                                                <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                                                    {document.document_type}
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatFileSize(document.file_size)}
                                            </span>
                                            {document.created_at && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDate(document.created_at)}
                                                </span>
                                            )}
                                            {document.uploaded_by_name && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    by {document.uploaded_by_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDownload(document)}
                                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                        title="Download"
                                    >
                                        <IconDownload className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(document.id)}
                                        disabled={deleting === document.id}
                                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                                        title="Delete"
                                    >
                                        {deleting === document.id ? (
                                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <IconTrash className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequestDocumentsTab;

