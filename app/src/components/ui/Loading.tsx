import React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, size = 'md', variant = 'spinner', text, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    };

    const renderSpinner = () => (
      <svg
        className={cn('animate-spin', sizeClasses[size])}
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
    );

    const renderDots = () => (
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'bg-current rounded-full animate-pulse',
              size === 'sm' ? 'h-1 w-1' : size === 'md' ? 'h-2 w-2' : 'h-3 w-3'
            )}
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1s',
            }}
          />
        ))}
      </div>
    );

    const renderPulse = () => (
      <div
        className={cn(
          'bg-current rounded-full animate-pulse',
          sizeClasses[size]
        )}
      />
    );

    const renderLoading = () => {
      switch (variant) {
        case 'dots':
          return renderDots();
        case 'pulse':
          return renderPulse();
        default:
          return renderSpinner();
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center text-blue-600',
          text && 'flex-col space-y-2',
          className
        )}
        {...props}
      >
        {renderLoading()}
        {text && (
          <span className="text-sm text-gray-600 animate-pulse">
            {text}
          </span>
        )}
      </div>
    );
  }
);

Loading.displayName = 'Loading';

export default Loading;
