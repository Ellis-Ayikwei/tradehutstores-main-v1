import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import IconFile from '../../../../../../components/Icon/IconFile';
import IconCircleCheck from '../../../../../../components/Icon/IconCircleCheck';
import IconDownload from '../../../../../../components/Icon/IconDownload';
import IconX from '../../../../../../components/Icon/IconX';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faDownload, faEye, faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import { Document } from '../../../types/document';
import { deleteDocument } from '../../../store/slices/documentSlice';
import { RootState } from '../../../../../../store';
import { apiUrl } from '../../../../../../services/axiosInstance';

interface DocumentViewerProps {
    document: any;
    isOpen: boolean;
    onClose: () => void;
    onVerify?: (document: any) => void;
    onReject?: (document: any) => void;
    onDownload: (document: any, side?: string) => void;
    onDownloadAll?: (document: any) => void;
    isAdmin?: boolean;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, isOpen, onClose, onVerify, onReject, onDownload, onDownloadAll, isAdmin = false }) => {
    const [activeDocumentSide, setActiveDocumentSide] = useState<'front' | 'back'>('front');

    // Don't render if not open or no document
    if (!isOpen || !document) return null;
    console.log("document", document)

    const renderDocumentPreview = () => {
        // Determine which file we're viewing
        const fileName = activeDocumentSide === 'back' ? document.document_back : document.document_front;
        const fileUrl = `${activeDocumentSide === 'back' ? document.back_url : document.front_url}`;
        const hasUrl = activeDocumentSide === 'back' ? document.back_url : document.front_url;

        // Check if we have a valid file to display
        if (!fileName) {
            return (
                <div className="text-center">
                    <IconFile className="w-16 h-16 text-blue-500 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">No document available</p>
                </div>
            );
        }

        // Render based on file type
        if (hasUrl) {
            return <img src={fileUrl} alt={`${document.name} (${activeDocumentSide} side)`} className="max-h-full w-auto object-contain" loading="lazy" />;
        } else if (fileName.toLowerCase().endsWith('.pdf')) {
            return <iframe src={`${fileUrl}#toolbar=0`} title={`${document.name} (${activeDocumentSide} side)`} className="w-full h-full rounded-lg" sandbox="allow-scripts allow-same-origin" />;
        } else {
            return (
                <div className="text-center">
                    <IconFile className="w-16 h-16 text-blue-500 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">Preview not available</p>
                </div>
            );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white overflow-y-auto dark:bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <IconFile className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold dark:text-white">{document.name}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">{document.type}</span>
                                <span className="text-sm text-gray-500">•</span>
                                <span className="text-sm text-gray-500">ID/Ref: {document.reference_number}</span>
                                <span className="text-sm text-gray-500">•</span>
                                <span className="text-sm text-gray-500">System ID: {document.id}</span>
                                {document.verified && (
                                    <>
                                        <span className="text-sm text-gray-500">•</span>
                                        <span className="flex items-center text-sm text-green-500">
                                            <IconCircleCheck className="w-4 h-4 mr-1" /> Verified
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
                        <IconX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Tabs for front/back if document has multiple sides */}
                {document.has_two_sides && (
                    <div className="border-b border-gray-200 dark:border-slate-700">
                        <nav className="flex space-x-2 px-4" aria-label="Document sides">
                            <button
                                onClick={() => setActiveDocumentSide('front')}
                                className={`py-3 px-4 text-sm font-medium border-b-2 ${
                                    activeDocumentSide === 'front'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                Front Side
                            </button>
                            <button
                                onClick={() => setActiveDocumentSide('back')}
                                className={`py-3 px-4 text-sm font-medium border-b-2 ${
                                    activeDocumentSide === 'back'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                Back Side
                            </button>
                        </nav>
                    </div>
                )}

                {/* Document Preview Area */}
                <div className="p-6">
                    <div className="bg-gray-100 dark:bg-slate-700 rounded-lg h-[400px] flex items-center justify-center mb-4">{renderDocumentPreview()}</div>

                    {/* Document Details */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-slate-700/30 p-3 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Issue Date</p>
                            <p className="font-medium dark:text-white">{dayjs(document.issue_date).format('MMMM D, YYYY')}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700/30 p-3 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Expiry Date</p>
                            <p className="font-medium dark:text-white">{document.expiry_date ? dayjs(document.expiry_date).format('MMMM D, YYYY') : 'No Expiry Date'}</p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center mb-6">
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Status:</span>
                        <span
                            className={`px-3 py-1 text-sm rounded-full ${
                                document.status === 'Valid'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                    : document.status === 'Expired'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            }`}
                        >
                            {document.status}
                        </span>
                    </div>

                    {/* Verification Details */}
                    <div className="bg-gray-50 dark:bg-slate-700/30 p-4 rounded-lg mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium dark:text-white">Verification Details</h4>
                            {!document.is_verified && (
                                <div className="space-x-3 flex">
                                    <button
                                        onClick={() => onVerify && onVerify(document)}
                                        className="px-3 py-1 btn-success text-white dark:bg-green-900/30 dark:text-green-400 rounded-md text-sm flex items-center gap-1"
                                    >
                                        <IconCircleCheck className="w-4 h-4" />
                                        Verify Document
                                    </button>
                                    <button
                                        onClick={() => onReject && onReject(document)}
                                        className="px-3 py-1 btn-danger text-white dark:bg-green-900/30 dark:text-red-400 rounded-md text-sm flex items-center gap-1"
                                    >
                                        <IconCircleCheck className="w-4 h-4" />
                                        Reject Document
                                    </button>
                                </div>
                            )}
                        </div>

                        {document.verified ? (
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                    <IconCircleCheck className="w-4 h-4 text-green-500" />
                                    <span>Verified on {document.verified_at ? dayjs(document.verified_at).format('MMMM D, YYYY') : 'Unknown date'}</span>
                                </p>
                                {document.verificationNote && (
                                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 p-2 rounded border border-gray-200 dark:border-slate-700">
                                        <p className="font-medium mb-1">Verification Notes:</p>
                                        <p>{document.verification_note}</p>
                                    </div>
                                )}
                            </div>
                        ) : document.status === 'Rejected' ? (
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                    <IconX className="w-4 h-4 text-red-500" />
                                    <span>Rejected</span>
                                </p>
                                {document.rejection_reason && (
                                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 p-2 rounded border border-gray-200 dark:border-slate-700">
                                        <p className="font-medium mb-1">Rejection Reason:</p>
                                        <p>{document.rejection_reason}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                <IconCircleCheck className="w-4 h-4 text-yellow-500" />
                                <span>Pending Verification</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="border-t dark:border-slate-700 p-4 flex justify-end space-x-3">
                    <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-md transition-colors" onClick={onClose}>
                        Close
                    </button>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center" onClick={() => onDownload(document, activeDocumentSide)}>
                        <IconDownload className="w-4 h-4 mr-2" />
                        Download {document.has_two_sides ? `${activeDocumentSide} side` : ''}
                    </button>
                    {document.has_two_sides && onDownloadAll && (
                        <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors flex items-center" onClick={() => onDownloadAll(document)}>
                            <IconDownload className="w-4 h-4 mr-2" />
                            Download Both Sides
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentViewer; 