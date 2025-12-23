import React from 'react';
import { X } from 'lucide-react';

interface CrudModalProps {
  title: string;
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const CrudModal: React.FC<CrudModalProps> = ({
  title,
  visible,
  onClose,
  onSave,
  children,
  size = 'md',
}) => {
  if (!visible) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-lg p-6 w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto relative`}>
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold mb-6 pr-8">{title}</h2>
        <div className="space-y-4">{children}</div>
        <div className="flex justify-end mt-8 gap-3 pt-4 border-t">
          <button 
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors" 
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrudModal; 