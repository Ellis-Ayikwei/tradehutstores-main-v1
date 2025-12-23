import React from 'react';
import { Loader2 } from 'lucide-react';
import IconLoader from '../../../../components/Icon/IconLoader';

const LoadingSpinner: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-center">
                   <IconLoader />
                <p className="mt-4 text-base text-gray-600 dark:text-gray-400 font-medium">Loading pricing data...</p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">Please wait while we fetch your configurations and factors</p>
            </div>
        </div>
    );
};

export default LoadingSpinner; 