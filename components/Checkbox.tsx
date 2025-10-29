import React from 'react';

interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ id, checked, onChange, label, className = '' }) => {
  return (
    <label htmlFor={id} className={`flex items-center cursor-pointer group ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only" // Screen-reader only: hide visually but keep accessible
      />
      <div className={`
        w-5 h-5 rounded-md border-2 flex-shrink-0
        flex items-center justify-center
        transition-colors duration-200 ease-in-out
        ${checked
          ? 'bg-indigo-600 border-indigo-600'
          : 'bg-gray-700 border-gray-500 group-hover:border-indigo-500'
        }
      `}>
        {/* Checkmark Icon */}
        <svg
          className={`w-3 h-3 text-white transition-opacity duration-200 ease-in-out ${checked ? 'opacity-100' : 'opacity-0'}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      {label && <span className="ml-3 text-gray-200 select-none">{label}</span>}
    </label>
  );
};

export default Checkbox;