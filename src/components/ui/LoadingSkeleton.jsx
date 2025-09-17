'use client';

import { Card } from './';

export function LoadingSkeleton({ type = 'default', count = 1, className = '' }) {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <Card variant="glass" size="md" className={`animate-pulse ${className}`}>
            <div className="space-y-3">
              <div className="h-4 bg-amber-500/20 rounded w-3/4"></div>
              <div className="h-3 bg-amber-500/10 rounded w-1/2"></div>
              <div className="h-3 bg-amber-500/10 rounded w-2/3"></div>
            </div>
          </Card>
        );

      case 'character':
        return (
          <Card variant="glass" size="md" className={`animate-pulse ${className}`}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500/20 rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-amber-500/20 rounded w-1/2"></div>
                  <div className="h-3 bg-amber-500/10 rounded w-1/3"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-3 bg-amber-500/10 rounded"></div>
                <div className="h-3 bg-amber-500/10 rounded"></div>
              </div>
            </div>
          </Card>
        );

      case 'participant':
        return (
          <Card variant="glass" size="sm" className={`animate-pulse ${className}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-amber-500/20 rounded"></div>
                <div className="space-y-1">
                  <div className="h-3 bg-amber-500/20 rounded w-20"></div>
                  <div className="h-2 bg-amber-500/10 rounded w-16"></div>
                </div>
              </div>
              <div className="flex gap-1">
                <div className="w-6 h-6 bg-amber-500/10 rounded"></div>
                <div className="w-6 h-6 bg-amber-500/10 rounded"></div>
              </div>
            </div>
          </Card>
        );

      case 'item':
        return (
          <Card variant="glass" size="md" className={`animate-pulse ${className}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-amber-500/20 rounded"></div>
                  <div className="h-4 bg-amber-500/20 rounded w-32"></div>
                </div>
                <div className="h-3 bg-amber-500/10 rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-amber-500/10 rounded w-1/2"></div>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-amber-500/10 rounded"></div>
                <div className="w-8 h-8 bg-amber-500/10 rounded"></div>
              </div>
            </div>
          </Card>
        );

      case 'note':
        return (
          <Card variant="glass" size="md" className={`animate-pulse ${className}`}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-amber-500/20 rounded"></div>
                <div className="h-4 bg-amber-500/20 rounded w-1/2"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-amber-500/10 rounded"></div>
                <div className="h-3 bg-amber-500/10 rounded w-3/4"></div>
                <div className="h-3 bg-amber-500/10 rounded w-1/2"></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="h-3 bg-amber-500/10 rounded w-24"></div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-amber-500/10 rounded"></div>
                  <div className="w-8 h-8 bg-amber-500/10 rounded"></div>
                </div>
              </div>
            </div>
          </Card>
        );

      case 'list':
        return (
          <div className="space-y-2">
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="h-12 bg-amber-500/10 rounded animate-pulse"></div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className="space-y-2">
            <div className="h-8 bg-amber-500/20 rounded animate-pulse"></div>
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="h-6 bg-amber-500/10 rounded animate-pulse"></div>
            ))}
          </div>
        );

      case 'form':
        return (
          <div className="space-y-4 animate-pulse">
            <div className="space-y-2">
              <div className="h-4 bg-amber-500/20 rounded w-1/4"></div>
              <div className="h-10 bg-amber-500/10 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-amber-500/20 rounded w-1/3"></div>
              <div className="h-10 bg-amber-500/10 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-amber-500/20 rounded w-1/5"></div>
              <div className="h-20 bg-amber-500/10 rounded"></div>
            </div>
          </div>
        );

      default:
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="h-4 bg-amber-500/20 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-amber-500/10 rounded w-1/2"></div>
          </div>
        );
    }
  };

  if (count > 1) {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index}>
            {renderSkeleton()}
          </div>
        ))}
      </div>
    );
  }

  return renderSkeleton();
}

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} animate-spin`}>
        <div className="w-full h-full border-2 border-amber-500/30 border-t-amber-500 rounded-full"></div>
      </div>
    </div>
  );
}

export function LoadingButton({ loading, children, ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`${props.className} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}
