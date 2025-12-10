import React from 'react';

interface FormInputProps {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  min?: number;
  max?: number;
  pattern?: string;
  autoComplete?: string;
}

const FormInput: React.FC<FormInputProps> = ({
  id,
  name,
  label,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  className = '',
  min,
  max,
  pattern,
  autoComplete,
}) => {
  return (
    <div className="mb-4">
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        pattern={pattern}
        autoComplete={autoComplete}
        className={`w-full px-3 py-2 border ${
          error ? 'border-red-500' : 'border-gray-300'
        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? 'bg-gray-100 text-gray-500' : ''
        } ${className}`}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default FormInput;