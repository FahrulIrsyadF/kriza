import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DialogContext = createContext(null);

// Singleton reference untuk pemanggilan imperatif di luar React component (misal di utilitas / axios interceptor)
let dialogController = null;

export const dialog = {
  alert: (message, options = {}) => {
    if (dialogController) {
      return dialogController.openDialog({
        type: 'alert',
        message,
        title: options.title || 'Pemberitahuan',
        variant: options.variant || 'info',
        confirmText: options.confirmText || 'Tutup',
      });
    }
    // Fallback jika provider belum siap
    window.alert(message);
    return Promise.resolve();
  },

  confirm: (message, options = {}) => {
    if (dialogController) {
      return dialogController.openDialog({
        type: 'confirm',
        message,
        title: options.title || 'Konfirmasi Tindakan',
        variant: options.variant || 'warning',
        confirmText: options.confirmText || 'Ya, Lanjutkan',
        cancelText: options.cancelText || 'Batal',
      });
    }
    // Fallback jika provider belum siap
    return Promise.resolve(window.confirm(message));
  },

  prompt: (message, options = {}) => {
    if (dialogController) {
      return dialogController.openDialog({
        type: 'prompt',
        message,
        title: options.title || 'Input Data',
        variant: options.variant || 'info',
        defaultValue: options.defaultValue || '',
        placeholder: options.placeholder || 'Ketik di sini...',
        confirmText: options.confirmText || 'Kirim',
        cancelText: options.cancelText || 'Batal',
      });
    }
    // Fallback jika provider belum siap
    return Promise.resolve(window.prompt(message, options.defaultValue || ''));
  },
};

export function DialogProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    type: 'alert', // 'alert' | 'confirm' | 'prompt'
    title: '',
    message: '',
    variant: 'info', // 'info' | 'warning' | 'danger' | 'success'
    confirmText: 'OK',
    cancelText: 'Batal',
    defaultValue: '',
    placeholder: '',
  });

  const [promptInput, setPromptInput] = useState('');
  const resolverRef = useRef(null);
  const inputRef = useRef(null);

  const openDialog = useCallback((config) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setPromptInput(config.defaultValue || '');
      setDialogState({
        isOpen: true,
        type: config.type || 'alert',
        title: config.title || 'Pemberitahuan',
        message: config.message || '',
        variant: config.variant || 'info',
        confirmText: config.confirmText || (config.type === 'alert' ? 'Tutup' : 'OK'),
        cancelText: config.cancelText || 'Batal',
        defaultValue: config.defaultValue || '',
        placeholder: config.placeholder || '',
      });
    });
  }, []);

  useEffect(() => {
    dialogController = { openDialog };

    // PERBAIKAN: Intercept native window.alert agar library pihak ketiga tetap memakai dialog modern
    const originalAlert = window.alert;
    window.alert = (msg) => {
      dialog.alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    };

    return () => {
      dialogController = null;
      window.alert = originalAlert;
    };
  }, [openDialog]);

  // Auto focus input on prompt
  useEffect(() => {
    if (dialogState.isOpen && dialogState.type === 'prompt') {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [dialogState.isOpen, dialogState.type]);

  const handleConfirm = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      if (dialogState.type === 'prompt') {
        resolverRef.current(promptInput);
      } else if (dialogState.type === 'confirm') {
        resolverRef.current(true);
      } else {
        resolverRef.current();
      }
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      if (dialogState.type === 'prompt') {
        resolverRef.current(null);
      } else if (dialogState.type === 'confirm') {
        resolverRef.current(false);
      } else {
        resolverRef.current();
      }
      resolverRef.current = null;
    }
  };

  // Keyboard navigation: Escape to cancel, Enter to confirm
  useEffect(() => {
    if (!dialogState.isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && dialogState.type !== 'prompt') {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogState.isOpen, dialogState.type]);

  // Variant Icon & Badge configuration
  const getVariantStyles = () => {
    switch (dialogState.variant) {
      case 'danger':
        return {
          icon: <ShieldAlert className="w-5 h-5 text-destructive" />,
          badgeClass: 'bg-destructive/15 text-destructive border-destructive/20',
          confirmBtnVariant: 'destructive',
          confirmBtnClass: '',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          badgeClass: 'bg-amber-500/15 text-amber-700 border-amber-500/20',
          confirmBtnVariant: 'default',
          confirmBtnClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
          badgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20',
          confirmBtnVariant: 'default',
          confirmBtnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-primary" />,
          badgeClass: 'bg-primary/15 text-primary border-primary/20',
          confirmBtnVariant: 'default',
          confirmBtnClass: '',
        };
    }
  };

  const currentStyles = getVariantStyles();

  return (
    <DialogContext.Provider value={dialog}>
      {children}

      {/* Global Dialog Modal */}
      {dialogState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div
            className="fixed inset-0"
            onClick={dialogState.type === 'alert' ? handleConfirm : handleCancel}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 space-y-4">
            {/* Header with Icon & Close */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${currentStyles.badgeClass}`}>
                  {currentStyles.icon}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground leading-tight">
                    {dialogState.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={dialogState.type === 'alert' ? handleConfirm : handleCancel}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Body */}
            <div className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line leading-relaxed pl-1">
              {dialogState.message}
            </div>

            {/* Prompt Input Field */}
            {dialogState.type === 'prompt' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleConfirm();
                }}
                className="pt-1"
              >
                <Input
                  ref={inputRef}
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder={dialogState.placeholder}
                  className="text-xs h-10"
                />
              </form>
            )}

            {/* Action Buttons Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              {dialogState.type !== 'alert' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="text-xs h-8 px-3.5 font-semibold"
                >
                  {dialogState.cancelText}
                </Button>
              )}
              <Button
                type="button"
                variant={currentStyles.confirmBtnVariant}
                size="sm"
                onClick={handleConfirm}
                className={`text-xs h-8 px-4 font-semibold ${currentStyles.confirmBtnClass}`}
              >
                {dialogState.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    return dialog;
  }
  return ctx;
}
