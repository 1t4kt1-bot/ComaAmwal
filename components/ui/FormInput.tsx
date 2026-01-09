
import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label: string;
  unit?: string;
  helpText?: string;
  error?: string;
  as?: 'input' | 'select' | 'textarea';
  children?: React.ReactNode;
}

const FormInput: React.FC<FormInputProps> = ({ 
  label, 
  unit, 
  helpText, 
  error, 
  className = '', 
  as = 'input',
  children,
  ...props 
}) => {
  const baseInputStyles = `
    block w-full rounded-xl border 
    bg-white p-3.5 text-sm text-gray-900 
    focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none 
    transition-all duration-200 shadow-sm
    disabled:bg-gray-50 disabled:text-gray-500 placeholder-gray-400
    ${error ? 'border-rose-300 focus:ring-rose-100 focus:border-rose-500' : 'border-gray-200 hover:border-gray-300'}
    ${unit ? 'pl-12' : ''}
  `;

  return (
    <div className={`mb-5 ${className}`}>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        {label}
      </label>
      
      <div className="relative">
        {as === 'select' ? (
           <select className={baseInputStyles} {...(props as any)}>
             {children}
           </select>
        ) : as === 'textarea' ? (
            <textarea className={baseInputStyles} {...(props as any)} rows={3} />
        ) : (
           <input className={baseInputStyles} {...props} />
        )}
        
        {unit && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 text-xs font-bold bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
              {unit}
            </span>
          </div>
        )}
      </div>

      {helpText && !error && (
        <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
          {helpText}
        </p>
      )}
      
      {error && (
        <p className="mt-2 text-xs text-rose-600 font-bold animate-pulse">
          * {error}
        </p>
      )}
    </div>
  );
};

export default FormInput;
