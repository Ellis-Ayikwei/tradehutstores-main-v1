import React from 'react';

export interface Option {
  value: string | number;
  label: string;
}

interface FilterSelectProps {
  options: Option[];
  value: string | number;
  placeholder?: string;
  onChange: (val: string | number) => void;
  className?: string;
}

const FilterSelect: React.FC<FilterSelectProps> = ({
  options,
  value,
  placeholder = 'Select…',
  onChange,
  className = '',
}) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value === '' ? '' : e.target.value)}
    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${className}`}
  >
    <option value="">{placeholder}</option>
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

export default FilterSelect; 