import React from 'react';
import { FileText, Image, Download, Eye } from 'lucide-react';
import { Job, RequestDocument } from '../../../types/job';
import axiosInstance from '../../../services/axiosInstance';

interface DocumentsTabProps {
    job: Job;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ job }) => {
    // Get documents from request.documents
    const documents = job.request.documents || [];
    
    // Group documents by type
    const imageDocuments = documents.filter((doc) => {
        const fileExtension = doc.file_name?.split('.').pop()?.toLowerCase() || '';
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension);
    });
    
    const otherDocuments = documents.filter((doc) => {
        const fileExtension = doc.file_name?.split('.').pop()?.toLowerCase() || '';
        return !['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension);
    });

    const hasDocuments = documents.length > 0;
    
    const formatFileSize = (bytes?: number): string => {
        if (!bytes) return 'Unknown size';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };
    
    const getFileIcon = (document: RequestDocument) => {
        const fileExtension = document.file_name?.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension)) {
            return Image;
        }
        return FileText;
    };
    
    const handleDownload = async (doc: RequestDocument) => {
        try {
            // Always fetch as blob to force download behavior
            const fileUrl = doc.file_url || doc.file;
            if (!fileUrl) {
                console.error('No file URL available for download');
                return;
            }

            let blob: Blob;
            
            // If it's a full URL, use fetch with auth headers
            if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
                const authToken = axiosInstance.defaults.headers.common['Authorization'] as string || '';
                const response = await fetch(fileUrl, {
                    headers: authToken ? { 'Authorization': authToken } : {},
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch file');
                }
                blob = await response.blob();
            } else {
                // Relative URL - use axiosInstance (handles auth automatically)
                const response = await axiosInstance.get(fileUrl, {
                    responseType: 'blob',
                });
                blob = new Blob([response.data]);
            }

            const blobUrl = window.URL.createObjectURL(blob);
            
            // Create download link
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = doc.file_name || doc.document_name || 'document';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
                document.body.removeChild(link);
            }, 100);
        } catch (error) {
            console.error('Error downloading document:', error);
        }
    };
    
    const handleView = (doc: RequestDocument) => {
        if (doc.file_url) {
            window.open(doc.file_url, '_blank');
        } else if (doc.file) {
            // Construct full URL if needed
            const baseUrl = axiosInstance.defaults.baseURL || '';
            const fileUrl = doc.file.startsWith('http') 
                ? doc.file 
                : `${baseUrl}${doc.file}`;
            window.open(fileUrl, '_blank');
        }
    };

    const renderDocumentCard = (doc: RequestDocument) => {
        const FileIcon = getFileIcon(doc);
        const isImage = imageDocuments.includes(doc);
        const fileUrl = doc.file_url || (doc.file?.startsWith('http') ? doc.file : `${axiosInstance.defaults.baseURL || ''}${doc.file}`);
        
        return (
            <div className="backdrop-blur-sm bg-slate-50/80 dark:bg-slate-900/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-200 hover:shadow-lg">
                <div className="flex items-start gap-4">
                    <div className="relative group">
                        {isImage ? (
                            <img
                                src={fileUrl}
                                alt={doc.document_name || doc.file_name || 'Document'}
                                className="w-24 h-24 object-cover rounded-xl border-2 border-slate-200/50 dark:border-slate-700/50 group-hover:border-orange-300 dark:group-hover:border-orange-600 transition-all duration-200"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-xl border-2 border-slate-200/50 dark:border-slate-700/50 group-hover:border-orange-300 dark:group-hover:border-orange-600 transition-all duration-200 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                                <FileIcon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-all duration-200"></div>
                    </div>

                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {doc.document_name || doc.file_name || 'Document'}
                                </h4>
                                {doc.document_type && (
                                    <p className="text-slate-600 dark:text-slate-400 font-medium mt-1 capitalize">
                                        {doc.document_type}
                                    </p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    <span>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</span>
                                    {doc.file_size && (
                                        <span>• {formatFileSize(doc.file_size)}</span>
                                    )}
                                    {doc.uploaded_by_name && (
                                        <span>• By {doc.uploaded_by_name}</span>
                                    )}
                                </div>
                                {doc.notes && (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{doc.notes}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleView(doc)}
                                    className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200/80 dark:hover:bg-blue-800/50 transition-all duration-200 flex items-center justify-center"
                                    title="View document"
                                >
                                    <Eye className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleDownload(doc)}
                                    className="w-10 h-10 rounded-xl bg-green-100/80 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200/80 dark:hover:bg-green-800/50 transition-all duration-200 flex items-center justify-center"
                                    title="Download document"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse"></div>
                    Job Documentation
                </h2>
                <div className="text-lg font-semibold text-slate-600 dark:text-slate-400">{documents.length} Document{documents.length !== 1 ? 's' : ''}</div>
            </div>

            {hasDocuments ? (
                <div className="space-y-8">
                    {/* Image Documents Section */}
                    {imageDocuments.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                                    <Image className="text-white w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Images</h3>
                                    <p className="text-slate-600 dark:text-slate-400">Image documents and photos</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {imageDocuments.map((doc) => (
                                    <div key={doc.id}>{renderDocumentCard(doc)}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Other Documents Section */}
                    {otherDocuments.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                                    <FileText className="text-white w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Documents</h3>
                                    <p className="text-slate-600 dark:text-slate-400">Other document files</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {otherDocuments.map((doc) => (
                                    <div key={doc.id}>{renderDocumentCard(doc)}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Empty State */
                <div className="text-center py-16">
                    <div className="backdrop-blur-xl bg-slate-50/80 dark:bg-slate-800/50 rounded-3xl p-12 border border-slate-200/50 dark:border-slate-700/30 max-w-md mx-auto">
                        <div className="w-20 h-20 bg-slate-200/80 dark:bg-slate-700/80 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">No Documents Available</h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            No documents have been uploaded for this job yet. Documents will appear here once they are added to the job request.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentsTab;
