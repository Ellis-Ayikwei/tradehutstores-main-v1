import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorAlertProps {
    error: string | null;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ error }) => {
    if (!error) return null;

    return (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl flex items-center">
            <AlertTriangle className="mr-3 text-red-500 h-5 w-5" />
            {error}
        </div>
    );
};

export default ErrorAlert; 