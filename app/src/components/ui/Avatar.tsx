import React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  children?: React.ReactNode;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, size = 'md', fallback, children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 w-8 text-sm',
      md: 'h-10 w-10 text-base',
      lg: 'h-12 w-12 text-lg',
      xl: 'h-16 w-16 text-xl',
    };

    const classes = cn(
      'relative inline-flex items-center justify-center rounded-full bg-gray-100 overflow-hidden',
      sizeClasses[size],
      className
    );

    // 生成fallback文本（通常是用户名的首字母）
    const getFallbackText = () => {
      if (children) return children;
      if (fallback) return fallback;
      if (alt) {
        return alt
          .split(' ')
          .map(word => word.charAt(0))
          .join('')
          .toUpperCase()
          .slice(0, 2);
      }
      return '?';
    };

    return (
      <div
        ref={ref}
        className={classes}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className="h-full w-full object-cover"
            onError={(e) => {
              // 如果图片加载失败，隐藏图片显示fallback
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        
        {/* Fallback content */}
        <span
          className={cn(
            'flex items-center justify-center h-full w-full text-gray-600 font-medium',
            src ? 'absolute inset-0 opacity-0' : 'opacity-100'
          )}
        >
          {getFallbackText()}
        </span>
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export default Avatar;
