import React, { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';

interface FormSectionProps {
  title: string;
  icon?: IconDefinition;
  gradient?: string;
  children: ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ 
  title, 
  icon, 
  gradient = 'bg-gray-50 dark:bg-gray-750',
  children 
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className={`px-6 py-4 ${gradient} border-b border-gray-200 dark:border-gray-700`}>
        <h3 className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
          {icon && <FontAwesomeIcon icon={icon} className="mr-2 text-blue-600 dark:text-blue-400" />}
          {title}
        </h3>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default FormSection;