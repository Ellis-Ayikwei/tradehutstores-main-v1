import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    AlertTriangle, 
    CheckCircle, 
    X, 
    Info,
    AlertCircle,
    Loader2
} from 'lucide-react';

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
    onClose: () => void;
    onConfirm: () => void;
    onDeny?: () => void;
    onCancel?: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    onDeny,
    onCancel,
    title,
    note = '',
    body = '',
    recommended = '',
    finalQuestion,
    showSuccessMessage = false,
    type = 'warning',
    confirmText = 'Yes',
    denyText = 'No',
    cancelText = 'Cancel'
}) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleConfirm = async () => {
        setIsAnimating(true);
        try {
            await onConfirm();
            if (showSuccessMessage) {
                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    onClose();
                }, 2000);
            } else {
                onClose();
            }
        } catch (error) {
            console.error('Error in confirmation:', error);
        } finally {
            setIsAnimating(false);
        }
    };

    const handleDeny = () => {
        onDeny?.();
        onClose();
    };

    const handleCancel = () => {
        onCancel?.();
        onClose();
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-8 h-8 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-8 h-8 text-red-500" />;
            case 'info':
                return <Info className="w-8 h-8 text-blue-500" />;
            default:
                return <AlertTriangle className="w-8 h-8 text-yellow-500" />;
        }
    };

    const getButtonStyles = (buttonType: 'confirm' | 'deny' | 'cancel') => {
        const baseStyles = "px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2";
        
        switch (buttonType) {
            case 'confirm':
                return `${baseStyles} bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30`;
            case 'deny':
                return `${baseStyles} bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30`;
            case 'cancel':
                return `${baseStyles} bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600`;
        }
    };

    if (!isOpen) return null;

    const dialogContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleCancel}
            />
            
            {/* Dialog */}
            <div className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 ${
                isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                    </div>
                    <button
                        onClick={handleCancel}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {body && (
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {body}
                        </p>
                    )}
                    
                    {note && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/30">
                            <div className="flex items-start gap-2">
                                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    {note}
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {recommended && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200/50 dark:border-green-700/30">
                            <div className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    {recommended}
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {finalQuestion}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                    {onCancel && (
                        <button
                            onClick={handleCancel}
                            className={getButtonStyles('cancel')}
                            disabled={isAnimating}
                        >
                            {cancelText}
                        </button>
                    )}
                    
                    {onDeny && (
                        <button
                            onClick={handleDeny}
                            className={getButtonStyles('deny')}
                            disabled={isAnimating}
                        >
                            {denyText}
                        </button>
                    )}
                    
                    <button
                        onClick={handleConfirm}
                        className={getButtonStyles('confirm')}
                        disabled={isAnimating}
                    >
                        {isAnimating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>

            {/* Success Message */}
            {showSuccess && (
                <div className="fixed top-4 right-4 z-[10000]">
                    <div className="bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-right duration-300">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Saved!</span>
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(dialogContent, document.body);
};

// Wrapper function to maintain compatibility with existing code
const confirmDialog = (params: ConfirmDialogParams): Promise<boolean> => {
    return new Promise((resolve) => {
        const dialogRoot = document.createElement('div');
        document.body.appendChild(dialogRoot);

        const handleConfirm = () => {
            resolve(true);
            cleanup();
        };

        const handleDeny = () => {
            resolve(false);
            cleanup();
        };

        const handleCancel = () => {
            resolve(false);
            cleanup();
        };

        const cleanup = () => {
            document.body.removeChild(dialogRoot);
        };

        // This would need to be implemented with ReactDOM.render or similar
        // For now, we'll use the component approach
        console.warn('confirmDialog function needs ReactDOM implementation for full compatibility');
        resolve(false);
    });
};

export { ConfirmDialog, confirmDialog };
export default ConfirmDialog; 