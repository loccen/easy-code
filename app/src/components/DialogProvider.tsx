'use client';

import React, { createContext, useContext } from 'react';
import { useDialog, ConfirmOptions, AlertOptions } from '@/hooks/useDialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Alert from '@/components/ui/Alert';

interface DialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const useDialogContext = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialogContext must be used within a DialogProvider');
  }
  return context;
};

interface DialogProviderProps {
  children: React.ReactNode;
}

export const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
  const {
    dialogState,
    confirm,
    alert,
    handleConfirm,
    handleCancel,
    handleClose,
  } = useDialog();

  const contextValue: DialogContextType = {
    confirm,
    alert,
  };

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
      
      {/* 确认对话框 */}
      {dialogState.type === 'confirm' && dialogState.options && (
        <ConfirmDialog
          isOpen={dialogState.isOpen}
          onClose={handleCancel}
          onConfirm={handleConfirm}
          title={(dialogState.options as ConfirmOptions).title}
          message={dialogState.options.message}
          confirmText={(dialogState.options as ConfirmOptions).confirmText}
          cancelText={(dialogState.options as ConfirmOptions).cancelText}
          confirmVariant={(dialogState.options as ConfirmOptions).variant}
        />
      )}
      
      {/* 提示对话框 */}
      {dialogState.type === 'alert' && dialogState.options && (
        <Alert
          isOpen={dialogState.isOpen}
          onClose={handleClose}
          title={(dialogState.options as AlertOptions).title}
          message={dialogState.options.message}
          type={(dialogState.options as AlertOptions).type}
          confirmText={(dialogState.options as AlertOptions).confirmText}
        />
      )}
    </DialogContext.Provider>
  );
};
