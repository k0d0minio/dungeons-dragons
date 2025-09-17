'use client';

import { forwardRef } from 'react';

/**
 * Input Component
 * 
 * A reusable input component with consistent styling and validation states.
 * Designed for forms throughout the D&D toolbox application.
 * 
 * @param {Object} props - Component props
 * @param {string} props.variant - Input style variant ('default', 'filled', 'outlined')
 * @param {string} props.size - Input size ('sm', 'md', 'lg')
 * @param {string} props.type - Input type ('text', 'email', 'password', 'number', etc.)
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {Function} props.onKeyPress - Key press handler
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {boolean} props.required - Whether the input is required
 * @param {string} props.error - Error message to display
 * @param {string} props.label - Optional label
 * @param {string} props.helpText - Optional help text
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props...rest - Additional props passed to input element
 */
const Input = forwardRef(({
  variant = 'default',
  size = 'md',
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  onKeyPress,
  disabled = false,
  required = false,
  error = '',
  label = '',
  helpText = '',
  className = '',
  ...rest
}, ref) => {
  // Validate props
  const validVariants = ['default', 'filled', 'outlined'];
  const validSizes = ['sm', 'md', 'lg'];
  
  if (!validVariants.includes(variant)) {
    console.warn(`Input: Invalid variant "${variant}". Using "default" instead.`);
    variant = 'default';
  }
  
  if (!validSizes.includes(size)) {
    console.warn(`Input: Invalid size "${size}". Using "md" instead.`);
    size = 'md';
  }

  // Base input classes
  const baseClasses = 'w-full rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
  
  // Variant classes
  const variantClasses = {
    default: 'bg-slate-700/80 border border-amber-500/30 text-amber-100 placeholder-amber-300 focus:border-amber-500 focus:ring-amber-500',
    filled: 'bg-slate-700 border-2 border-slate-600 text-amber-100 placeholder-amber-300 focus:border-amber-500 focus:ring-amber-500',
    outlined: 'bg-transparent border-2 border-amber-500/50 text-amber-100 placeholder-amber-300 focus:border-amber-500 focus:ring-amber-500'
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-4 py-3 text-lg'
  };
  
  // Error state classes
  const errorClasses = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '';
  
  // Combine all classes
  const inputClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${errorClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  const handleKeyPress = (e) => {
    if (onKeyPress) {
      onKeyPress(e);
    }
  };

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block text-amber-200 text-sm font-semibold mb-2">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      {/* Input */}
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        disabled={disabled}
        required={required}
        className={inputClasses}
        {...rest}
      />
      
      {/* Help Text */}
      {helpText && !error && (
        <p className="mt-1 text-amber-300 text-xs">{helpText}</p>
      )}
      
      {/* Error Message */}
      {error && (
        <p className="mt-1 text-red-400 text-xs flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
