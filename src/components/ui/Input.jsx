'use client';

import { useState, forwardRef } from 'react';

const Input = forwardRef(({ 
  className = '', 
  variant = 'default', 
  size = 'md', 
  error = null,
  label = null,
  helperText = null,
  required = false,
  loading = false,
  ...props 
}, ref) => {
  const [focused, setFocused] = useState(false);

  const baseClasses = 'w-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50';
  
  const variantClasses = {
    default: 'bg-slate-700 border border-amber-500/30 text-amber-100 placeholder-amber-400',
    error: 'bg-slate-700 border border-red-500/50 text-amber-100 placeholder-amber-400 focus:ring-red-500/50',
    success: 'bg-slate-700 border border-green-500/50 text-amber-100 placeholder-amber-400 focus:ring-green-500/50'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm rounded',
    md: 'px-3 py-2 text-base rounded-lg',
    lg: 'px-4 py-3 text-lg rounded-lg'
  };

  const getVariant = () => {
    if (error) return 'error';
    if (props.value && !error) return 'success';
    return 'default';
  };

  const inputClasses = `
    ${baseClasses}
    ${variantClasses[getVariant()]}
    ${sizeClasses[size]}
    ${focused ? 'ring-2 ring-amber-500/50' : ''}
    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-amber-300 text-sm font-medium">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={ref}
          className={inputClasses}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={loading}
          {...props}
        />
        
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 animate-spin border-2 border-amber-500/30 border-t-amber-500 rounded-full"></div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-red-400 text-sm flex items-center gap-1">
          <span>⚠️</span>
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-amber-400 text-sm">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;