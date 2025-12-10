import React from 'react';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';

interface ErrorAlertProps {
    error: string | null;
    onClear: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onClear }) => {
    if (!error) return null;

    return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
                <IconAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-red-800 dark:text-red-300 font-medium">{error}</span>
                <button 
                    onClick={onClear} 
                    className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                >
                    <IconX className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default ErrorAlert;
