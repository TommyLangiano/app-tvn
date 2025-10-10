'use client';

import { useEffect } from 'react';

interface ModalWrapperProps {
  children: React.ReactNode;
  onClose: () => void;
}

export function ModalWrapper({ children, onClose }: ModalWrapperProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - fixed and covers everything */}
      <div
        className="fixed inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
