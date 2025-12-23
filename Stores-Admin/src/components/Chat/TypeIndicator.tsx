import React from 'react';

interface TypeIndicatorProps {
  name?: string;
}

const TypeIndicator: React.FC<TypeIndicatorProps> = ({ name = 'Someone' }) => {
  return (
    <div className="flex items-center">
      <div className="flex space-x-1">
        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{name} is typing...</span>
    </div>
  );
};

export default TypeIndicator;