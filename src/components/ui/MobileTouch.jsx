'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * Mobile Touch Component
 * 
 * Provides enhanced touch interactions for mobile devices
 * Includes tap, long press, swipe gestures, and haptic feedback
 */

export function MobileTouchButton({ 
  children, 
  onTap, 
  onLongPress, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  longPressDelay = 500,
  swipeThreshold = 50,
  hapticFeedback = true,
  className = '',
  disabled = false,
  ...props 
}) {
  const [isPressed, setIsPressed] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchStartTime, setTouchStartTime] = useState(null);
  const longPressTimer = useRef(null);
  const buttonRef = useRef(null);

  // Haptic feedback function
  const triggerHaptic = () => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50); // Short vibration
    }
  };

  // Clear long press timer
  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Handle touch start
  const handleTouchStart = (e) => {
    if (disabled) return;
    
    setIsPressed(true);
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
    setTouchStartTime(Date.now());

    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      if (onLongPress) {
        triggerHaptic();
        onLongPress(e);
      }
    }, longPressDelay);
  };

  // Handle touch end
  const handleTouchEnd = (e) => {
    if (disabled) return;
    
    setIsPressed(false);
    clearLongPressTimer();

    if (!touchStart) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const deltaTime = Date.now() - touchStartTime;

    // Determine if it's a swipe or tap
    if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
      // It's a swipe
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          triggerHaptic();
          onSwipeRight(e);
        } else if (deltaX < 0 && onSwipeLeft) {
          triggerHaptic();
          onSwipeLeft(e);
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          triggerHaptic();
          onSwipeDown(e);
        } else if (deltaY < 0 && onSwipeUp) {
          triggerHaptic();
          onSwipeUp(e);
        }
      }
    } else if (deltaTime < longPressDelay && onTap) {
      // It's a tap
      triggerHaptic();
      onTap(e);
    }

    setTouchStart(null);
    setTouchStartTime(null);
  };

  // Handle touch cancel
  const handleTouchCancel = () => {
    setIsPressed(false);
    clearLongPressTimer();
    setTouchStart(null);
    setTouchStartTime(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      className={`
        ${className}
        ${isPressed ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        transition-all duration-150 ease-in-out
        touch-manipulation
        select-none
      `}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Mobile-optimized button with enhanced touch interactions
 */
export function MobileButton({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  hapticFeedback = true,
  className = '',
  ...props 
}) {
  const handleTap = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  const baseClasses = 'font-medium transition-all duration-200 touch-manipulation select-none';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-amber-200 border border-amber-500/30',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg hover:shadow-xl',
    success: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg hover:shadow-xl'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm rounded-lg min-h-[44px]', // Minimum touch target size
    md: 'px-4 py-3 text-base rounded-lg min-h-[48px]',
    lg: 'px-6 py-4 text-lg rounded-xl min-h-[52px]',
    xl: 'px-8 py-5 text-xl rounded-xl min-h-[56px]'
  };

  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
    ${className}
  `.trim();

  return (
    <MobileTouchButton
      onTap={handleTap}
      hapticFeedback={hapticFeedback}
      disabled={disabled || loading}
      className={buttonClasses}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 animate-spin border-2 border-white/30 border-t-white rounded-full"></div>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </MobileTouchButton>
  );
}

/**
 * Mobile-optimized card with touch interactions
 */
export function MobileCard({ 
  children, 
  onClick, 
  onLongPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  className = '',
  ...props 
}) {
  const handleTap = (e) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  const baseClasses = 'transition-all duration-200 touch-manipulation select-none';
  
  const variantClasses = {
    default: 'bg-slate-800/50 border border-amber-500/20',
    elevated: 'bg-gradient-to-br from-slate-800/60 to-slate-700/60 border border-amber-500/30 shadow-xl',
    outlined: 'bg-slate-800/30 border-2 border-amber-500/40',
    glass: 'bg-slate-800/20 backdrop-blur-sm border border-amber-500/10'
  };
  
  const sizeClasses = {
    sm: 'p-3 rounded-lg',
    md: 'p-4 rounded-xl',
    lg: 'p-6 rounded-xl',
    xl: 'p-8 rounded-2xl'
  };

  const cardClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${onClick ? 'cursor-pointer active:scale-98' : ''}
    ${disabled ? 'opacity-50' : ''}
    ${className}
  `.trim();

  return (
    <MobileTouchButton
      onTap={handleTap}
      onLongPress={onLongPress}
      disabled={disabled}
      className={cardClasses}
      {...props}
    >
      {children}
    </MobileTouchButton>
  );
}

/**
 * Mobile-optimized input with better touch handling
 */
export function MobileInput({ 
  className = '', 
  variant = 'default', 
  size = 'md', 
  error = null,
  label = null,
  helperText = null,
  required = false,
  loading = false,
  ...props 
}) {
  const [focused, setFocused] = useState(false);

  const baseClasses = 'w-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 touch-manipulation';
  
  const variantClasses = {
    default: 'bg-slate-700 border border-amber-500/30 text-amber-100 placeholder-amber-400',
    error: 'bg-slate-700 border border-red-500/50 text-amber-100 placeholder-amber-400 focus:ring-red-500/50',
    success: 'bg-slate-700 border border-green-500/50 text-amber-100 placeholder-amber-400 focus:ring-green-500/50'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-3 text-base rounded-lg min-h-[48px]', // Larger touch target
    md: 'px-4 py-4 text-base rounded-lg min-h-[52px]',
    lg: 'px-5 py-5 text-lg rounded-xl min-h-[56px]'
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
    <div className="space-y-2">
      {label && (
        <label className="block text-amber-300 text-sm font-medium">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          className={inputClasses}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={loading}
          {...props}
        />
        
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 animate-spin border-2 border-amber-500/30 border-t-amber-500 rounded-full"></div>
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
}
