'use client';

import { forwardRef } from 'react';

/**
 * Button Component
 * 
 * A reusable button component with multiple variants and sizes.
 * Designed for consistency across the D&D toolbox application.
 * 
 * @param {Object} props - Component props
 * @param {string} props.variant - Button style variant ('primary', 'secondary', 'danger', 'success', 'ghost')
 * @param {string} props.size - Button size ('sm', 'md', 'lg', 'xl')
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {boolean} props.loading - Whether the button is in loading state
 * @param {string} props.icon - Optional icon/emoji to display
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Button content
 * @param {Function} props.onClick - Click handler
 * @param {string} props.type - Button type ('button', 'submit', 'reset')
 * @param {Object} props...rest - Additional props passed to button element
 */
const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  className = '',
  children,
  onClick,
  type = 'button',
  ...rest
}, ref) => {
  // Validate props
  const validVariants = ['primary', 'secondary', 'danger', 'success', 'ghost'];
  const validSizes = ['sm', 'md', 'lg', 'xl'];
  
  if (!validVariants.includes(variant)) {
    console.warn(`Button: Invalid variant "${variant}". Using "primary" instead.`);
    variant = 'primary';
  }
  
  if (!validSizes.includes(size)) {
    console.warn(`Button: Invalid size "${size}". Using "md" instead.`);
    size = 'md';
  }

  // Base button classes
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
  
  // Variant classes
  const variantClasses = {
    primary: 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg hover:shadow-xl focus:ring-amber-500',
    secondary: 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-amber-100 shadow-lg hover:shadow-xl focus:ring-slate-500',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl focus:ring-red-500',
    success: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl focus:ring-green-500',
    ghost: 'bg-transparent hover:bg-slate-700/50 text-amber-200 hover:text-amber-100 border border-amber-500/30 hover:border-amber-500/50 focus:ring-amber-500'
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };
  
  // Hover effects
  const hoverEffects = 'transform hover:scale-105 disabled:transform-none';
  
  // Combine all classes
  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${hoverEffects}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={handleClick}
      className={buttonClasses}
      {...rest}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {icon && !loading && (
        <span className="mr-2">{icon}</span>
      )}
      
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
