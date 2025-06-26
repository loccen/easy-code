import React from 'react';
import Header from './Header';
import Footer from './Footer';
import { cn } from '@/lib/utils';

export interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  containerized?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  className,
  showHeader = true,
  showFooter = true,
  containerized = true,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {showHeader && <Header />}
      
      <main className={cn('flex-1', className)}>
        {containerized ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        ) : (
          children
        )}
      </main>
      
      {showFooter && <Footer />}
    </div>
  );
};

export default Layout;
