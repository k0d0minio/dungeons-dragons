'use client';

/**
 * Card Component
 * 
 * A reusable card component for consistent styling across the D&D toolbox.
 * Provides different variants for different use cases.
 * 
 * @param {Object} props - Component props
 * @param {string} props.variant - Card style variant ('default', 'elevated', 'outlined', 'glass')
 * @param {string} props.size - Card size ('sm', 'md', 'lg', 'xl')
 * @param {boolean} props.hover - Whether the card should have hover effects
 * @param {boolean} props.clickable - Whether the card should appear clickable
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Card content
 * @param {Function} props.onClick - Click handler
 * @param {Object} props...rest - Additional props passed to div element
 */
export default function Card({
  variant = 'default',
  size = 'md',
  hover = false,
  clickable = false,
  className = '',
  children,
  onClick,
  ...rest
}) {
  // Validate props
  const validVariants = ['default', 'elevated', 'outlined', 'glass'];
  const validSizes = ['sm', 'md', 'lg', 'xl'];
  
  if (!validVariants.includes(variant)) {
    console.warn(`Card: Invalid variant "${variant}". Using "default" instead.`);
    variant = 'default';
  }
  
  if (!validSizes.includes(size)) {
    console.warn(`Card: Invalid size "${size}". Using "md" instead.`);
    size = 'md';
  }

  // Base card classes
  const baseClasses = 'rounded-xl transition-all duration-200';
  
  // Variant classes
  const variantClasses = {
    default: 'bg-slate-800/50 border border-amber-500/20',
    elevated: 'bg-gradient-to-br from-slate-800/60 to-slate-700/60 border border-amber-500/30 shadow-xl',
    outlined: 'bg-slate-800/30 border-2 border-amber-500/40',
    glass: 'bg-slate-800/20 backdrop-blur-sm border border-amber-500/10'
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };
  
  // Interactive classes
  const interactiveClasses = clickable ? 'cursor-pointer' : '';
  const hoverClasses = hover ? 'hover:shadow-lg hover:scale-105' : '';
  
  // Combine all classes
  const cardClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${interactiveClasses}
    ${hoverClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const handleClick = (e) => {
    if (clickable && onClick) {
      onClick(e);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cardClasses}
      {...rest}
    >
      {children}
    </div>
  );
}
