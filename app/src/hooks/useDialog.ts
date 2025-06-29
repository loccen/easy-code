'use client';

import { useState, useCallback } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
}

export interface AlertOptions {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  confirmText?: string;
}

export interface DialogState {
  type: 'confirm' | 'alert' | null;
  isOpen: boolean;
  options: ConfirmOptions | AlertOptions | null;
  resolve: ((value: boolean) => void) | null;
}

export const useDialog = () => {
  const [dialogState, setDialogState] = useState<DialogState>({
    type: null,
    isOpen: false,
    options: null,
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        type: 'confirm',
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        type: 'alert',
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (dialogState.resolve) {
      dialogState.resolve(true);
    }
    setDialogState({
      type: null,
      isOpen: false,
      options: null,
      resolve: null,
    });
  }, [dialogState.resolve]);

  const handleCancel = useCallback(() => {
    if (dialogState.resolve) {
      dialogState.resolve(false);
    }
    setDialogState({
      type: null,
      isOpen: false,
      options: null,
      resolve: null,
    });
  }, [dialogState.resolve]);

  const handleClose = useCallback(() => {
    if (dialogState.type === 'alert') {
      handleConfirm();
    } else {
      handleCancel();
    }
  }, [dialogState.type, handleConfirm, handleCancel]);

  return {
    dialogState,
    confirm,
    alert,
    handleConfirm,
    handleCancel,
    handleClose,
  };
};
