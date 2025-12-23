import React, { useState } from 'react';
import IconCircleCheck from '../../../../../../components/Icon/IconCircleCheck';
import IconX from '../../../../../../components/Icon/IconX';

interface VerifyDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerify: (document: any, note: string) => void;
    onReject: (document: any, reason: string) => void;
    document: any;
    action: 'verify' | 'reject';
}

const VerifyDocumentModal: React.FC<VerifyDocumentModalProps> = ({ isOpen, onClose, onVerify, onReject, document, action }) => {
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !document) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (action === 'verify') {
                await onVerify(document, note);
            } else {
                await onReject(document, note);
            }
            onClose();
        } catch (error) {
            console.error('Error processing document:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md shadow-xl">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
                    <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            action === 'verify' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                            {action === 'verify' ? (
                                <IconCircleCheck className="w-5 h-5 text-green-500" />
                            ) : (
                                <IconX className="w-5 h-5 text-red-500" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold dark:text-white">
                                {action === 'verify' ? 'Verify Document' : 'Reject Document'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {document.name} - {document.type}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
                        <IconX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="p-4">
                    <div className="mb-4">
                        <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {action === 'verify' ? 'Verification Notes' : 'Rejection Reason'}
                        </label>
                        <textarea
                            id="note"
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                            placeholder={action === 'verify' 
                                ? 'Add any notes about the verification process...'
                                : 'Please provide a reason for rejecting this document...'
                            }
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            required
                        />
                    </div>

                    {/* Document Details */}
                    <div className="bg-gray-50 dark:bg-slate-700/30 p-3 rounded-lg mb-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Document Details</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">ID Number:</span>
                                <span className="text-sm font-medium dark:text-white">{document.reference_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Issue Date:</span>
                                <span className="text-sm font-medium dark:text-white">{document.issue_date}</span>
                            </div>
                            {document.expiryDate && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Expiry Date:</span>
                                    <span className="text-sm font-medium dark:text-white">{document.expir_date}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-md transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`px-4 py-2 text-white rounded-md transition-colors flex items-center ${
                                action === 'verify'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                            }`}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {action === 'verify' ? (
                                        <>
                                            <IconCircleCheck className="w-4 h-4 mr-2" />
                                            Verify Document
                                        </>
                                    ) : (
                                        <>
                                            <IconX className="w-4 h-4 mr-2" />
                                            Reject Document
                                        </>
                                    )}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VerifyDocumentModal; 