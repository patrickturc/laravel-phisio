import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, CheckCircle2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface MissedAttendanceModalProps {
    open: boolean;
    patientName?: string;
    onConfirm: (justified: boolean, reason: string) => void;
    onCancel: () => void;
}

/**
 * Prompts whether a missed session was justified. A justified miss requires a
 * reason and does not consume the patient's monthly session quota; an
 * unjustified miss consumes a session (a make-up would then be a paid extra).
 */
export function MissedAttendanceModal({
    open,
    patientName,
    onConfirm,
    onCancel,
}: MissedAttendanceModalProps) {
    const [justified, setJustified] = useState<boolean | null>(null);
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (open) {
            setJustified(null);
            setReason('');
        }
    }, [open]);

    if (!open) return null;

    const canConfirm =
        justified === false || (justified === true && reason.trim().length > 0);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onCancel}
                />
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

                    <h3 className="mb-1 text-lg font-bold text-foreground">
                        Registrar falta
                    </h3>
                    <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                        {patientName ? (
                            <>
                                Falta de <strong>{patientName}</strong>.{' '}
                            </>
                        ) : null}
                        A falta foi justificada?
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => setJustified(true)}
                            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                                justified === true
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                                    : 'border-border hover:bg-muted/50'
                            }`}
                        >
                            <CheckCircle2
                                className={`size-5 ${justified === true ? 'text-emerald-600' : 'text-muted-foreground'}`}
                            />
                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    Justificada
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Não consome aula. Aluno pode repor sem
                                    pagar.
                                </p>
                            </div>
                        </button>
                        <button
                            onClick={() => setJustified(false)}
                            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                                justified === false
                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10'
                                    : 'border-border hover:bg-muted/50'
                            }`}
                        >
                            <XCircle
                                className={`size-5 ${justified === false ? 'text-amber-600' : 'text-muted-foreground'}`}
                            />
                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    Não justificada
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Consome uma aula da cota do mês. Reposição é
                                    aula extra (paga).
                                </p>
                            </div>
                        </button>
                    </div>

                    {justified === true && (
                        <div className="mt-4 grid gap-1.5">
                            <label className="text-sm font-medium text-foreground">
                                Motivo da justificativa *
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Ex: atestado médico, viagem a trabalho..."
                                className="flex min-h-[70px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/30 pt-4">
                        <button
                            onClick={onCancel}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        >
                            Cancelar
                        </button>
                        <Button
                            onClick={() =>
                                canConfirm &&
                                onConfirm(justified!, reason.trim())
                            }
                            disabled={!canConfirm}
                            className="rounded-xl px-5 py-2 text-sm font-semibold"
                        >
                            Registrar falta
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
