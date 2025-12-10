import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-500"></div>
      <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
};

export default LoadingSpinner;