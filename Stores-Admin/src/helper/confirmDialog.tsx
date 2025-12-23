import React from 'react';
import ReactDOM from 'react-dom/client';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface ConfirmDialogParams {
    title: string;
    note?: string;
    body?: string;
    recommended?: string;
    finalQuestion: string;
    showSuccessMessage?: boolean;
    type?: 'warning' | 'success' | 'info' | 'error';
    confirmText?: string;
    denyText?: string;
    cancelText?: string;
}

interface ConfirmDialogProps extends ConfirmDialogParams {
    isOpen: boolean;
    onClose: (result: boolean) => void;
}

const ConfirmDialogComponent: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    title,
    note,
    body,
    recommended,
    finalQuestion,
    type = 'warning',
    confirmText = 'Yes',
    denyText = 'No',
    cancelText = 'Cancel'
}) => {
    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircleIcon className="w-8 h-8 text-green-500" />;
            case 'info':
                return <InformationCircleIcon className="w-8 h-8 text-blue-500" />;
            case 'error':
                return <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />;
            default:
                return <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />;
        }
    };

    const getConfirmButtonStyle = () => {
        switch (type) {
            case 'success':
                return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
            case 'info':
                return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
            case 'error':
                return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
            default:
                return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
        }
    };

    return (
        <Dialog open={isOpen} onClose={() => onClose(false)} className="relative z-50">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
            
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            {getIcon()}
                            <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                                {title}
                            </Dialog.Title>
                        </div>
                        <button
                            onClick={() => onClose(false)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        {body && (
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                {body}
                            </p>
                        )}
                        
                        {note && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                                <div className="flex items-start gap-2">
                                    <InformationCircleIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        {note}
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {recommended && (
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                                <div className="flex items-start gap-2">
                                    <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        {recommended}
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {finalQuestion}
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => onClose(false)}
                            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => onClose(false)}
                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-lg shadow-red-600/25 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                        >
                            {denyText}
                        </button>
                        <button
                            onClick={() => onClose(true)}
                            className={`px-6 py-3 text-white rounded-xl font-medium shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${getConfirmButtonStyle()}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

// Global state for the dialog
let dialogContainer: HTMLDivElement | null = null;
let root: ReactDOM.Root | null = null;

const confirmDialog = (params: ConfirmDialogParams): Promise<boolean> => {
    return new Promise((resolve) => {
        // Create container if it doesn't exist
        if (!dialogContainer) {
            dialogContainer = document.createElement('div');
            dialogContainer.id = 'confirm-dialog-root';
            document.body.appendChild(dialogContainer);
        }

        // Create root if it doesn't exist
        if (!root) {
            root = ReactDOM.createRoot(dialogContainer);
        }

        // Render the dialog
        root.render(
            <ConfirmDialogComponent
                {...params}
                isOpen={true}
                onClose={(result) => {
                    if (root) {
                        root.unmount();
                        root = null;
                    }
                    resolve(result);
                }}
            />
        );
    });
};

export default confirmDialog; 