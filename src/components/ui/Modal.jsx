'use client';

import { useEffect, useRef } from 'react';

/**
 * Modal Component
 * 
 * A reusable modal component for popups, dialogs, and overlays.
 * Includes backdrop, escape key handling, and focus management.
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to call when modal should close
 * @param {string} props.title - Modal title
 * @param {string} props.size - Modal size ('sm', 'md', 'lg', 'xl', 'full')
 * @param {boolean} props.showCloseButton - Whether to show the close button
 * @param {boolean} props.closeOnBackdropClick - Whether to close when clicking backdrop
 * @param {boolean} props.closeOnEscape - Whether to close when pressing Escape
 * @param {string} props.className - Additional CSS classes for modal content
 * @param {React.ReactNode} props.children - Modal content
 * @param {React.ReactNode} props.footer - Optional footer content
 */
export default function Modal({
  isOpen = false,
  onClose,
  title = '',
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
  children,
  footer = null
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Validate props
  const validSizes = ['sm', 'md', 'lg', 'xl', 'full'];
  if (!validSizes.includes(size)) {
    console.warn(`Modal: Invalid size "${size}". Using "md" instead.`);
    size = 'md';
  }

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (closeOnEscape && e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, closeOnEscape, onClose]);

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement;
      
      // Focus the modal
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4'
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`
          w-full ${sizeClasses[size]} bg-slate-800 border border-amber-500/30 rounded-xl shadow-2xl
          transform transition-all duration-300 ease-out
          ${className}
        `}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-amber-500/20">
            {title && (
              <h2 id="modal-title" className="text-xl font-bold text-amber-100">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-amber-300 hover:text-amber-100 transition-colors p-1 rounded-lg hover:bg-slate-700"
                aria-label="Close modal"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-amber-500/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
