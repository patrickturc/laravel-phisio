import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ConfirmModalProps {
    open: boolean;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    open,
    title = 'Confirmar ação',
    message = 'Tem certeza? Esta ação não pode ser desfeita.',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    if (!open) return null;

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onCancel}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', duration: 0.3 }}
                        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
                    >
                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        >
                            <X className="size-4" />
                        </button>

                        <div className="flex items-start gap-4">
                            <div
                                className={`rounded-xl p-3 ${variant === 'danger' ? 'bg-red-100 dark:bg-red-500/10' : 'bg-amber-100 dark:bg-amber-500/10'}`}
                            >
                                <AlertTriangle
                                    className={`size-6 ${variant === 'danger' ? 'text-red-600' : 'text-amber-600'}`}
                                />
                            </div>
                            <div className="flex-1">
                                <h3 className="mb-1 text-lg font-bold text-foreground">
                                    {title}
                                </h3>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    {message}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/30 pt-4">
                            <button
                                onClick={onCancel}
                                className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                            >
                                {cancelLabel}
                            </button>
                            <Button
                                onClick={onConfirm}
                                className={`rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm ${
                                    variant === 'danger'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                            >
                                {confirmLabel}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// Hook for convenience
export function useConfirmModal() {
    const [state, setState] = useState<{
        open: boolean;
        resolve?: (value: boolean) => void;
        title?: string;
        message?: string;
        confirmLabel?: string;
        variant?: 'danger' | 'warning';
    }>({ open: false });

    function confirm(options?: {
        title?: string;
        message?: string;
        confirmLabel?: string;
        variant?: 'danger' | 'warning';
    }): Promise<boolean> {
        return new Promise((resolve) => {
            setState({ open: true, resolve, ...options });
        });
    }

    function handleConfirm() {
        state.resolve?.(true);
        setState({ open: false });
    }

    function handleCancel() {
        state.resolve?.(false);
        setState({ open: false });
    }

    const modal = (
        <ConfirmModal
            open={state.open}
            title={state.title}
            message={state.message}
            confirmLabel={state.confirmLabel}
            variant={state.variant}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    );

    return { confirm, modal };
}
