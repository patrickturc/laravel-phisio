import { router } from '@inertiajs/react';
import axios from 'axios';
import { Check, Copy, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useClipboard } from '@/hooks/use-clipboard';
import { formatBRL, PAYMENT_METHODS } from '@/lib/billing';

export interface ChargeLike {
    id: string;
    description: string;
    amount: number | string;
    type?: string;
    payment_method?: string | null;
}

const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none';

/**
 * Confirm a payment and how it was made. Mount it with a key per charge so
 * the method starts from the charge's own.
 */
export function MarkPaidDialog({
    charge,
    onClose,
    onPaid,
}: {
    charge: ChargeLike;
    onClose: () => void;
    onPaid?: (charge: ChargeLike) => void;
}) {
    const isIncome = charge.type !== 'expense';
    const [method, setMethod] = useState(
        charge.payment_method ?? (isIncome ? 'pix' : ''),
    );
    const [busy, setBusy] = useState(false);

    function confirm() {
        router.post(
            `/financial/${charge.id}/mark-paid`,
            { payment_method: method || null },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
                onSuccess: () => {
                    onClose();
                    onPaid?.(charge);
                },
            },
        );
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isIncome
                            ? 'Confirmar recebimento'
                            : 'Confirmar pagamento'}
                    </DialogTitle>
                    <DialogDescription>
                        {charge.description} · {formatBRL(charge.amount)}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                    <Label htmlFor="payment-method">Forma de pagamento</Label>
                    <select
                        id="payment-method"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className={selectClass}
                    >
                        <option value="">Não informar</option>
                        {PAYMENT_METHODS.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={confirm}
                        disabled={busy}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Give up on a charge (perda / inadimplente), with an optional reason kept
 * in its history.
 */
export function WriteOffDialog({
    charge,
    onClose,
}: {
    charge: ChargeLike;
    onClose: () => void;
}) {
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    function confirm() {
        router.post(
            `/financial/${charge.id}/write-off`,
            { note: note || null },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
                onSuccess: onClose,
            },
        );
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Marcar como perda</DialogTitle>
                    <DialogDescription>
                        {charge.description} · {formatBRL(charge.amount)}. A
                        cobrança sai do "a receber", mas continua no histórico e
                        pode ser reaberta.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                    <Label htmlFor="write-off-note">Motivo (opcional)</Label>
                    <textarea
                        id="write-off-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={255}
                        placeholder="Ex.: aluno mudou de cidade"
                        className="flex min-h-[80px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />
                </div>
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={confirm}
                        disabled={busy}
                    >
                        Marcar como perda
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * PIX "copia e cola" and QR Code for one charge, with its amount — to show at
 * the front desk or send to the patient.
 */
export function PixDialog({
    charge,
    onClose,
}: {
    charge: { id: string; description?: string; amount: number | string };
    onClose: () => void;
}) {
    const [copiedText, copy] = useClipboard();
    const [result, setResult] = useState<
        { payload: string; qr_svg: string } | { error: string } | null
    >(null);

    useEffect(() => {
        let cancelled = false;

        axios
            .get(`/financial/${charge.id}/pix`)
            .then((response) => {
                if (!cancelled) setResult(response.data);
            })
            .catch((exception) => {
                if (!cancelled) {
                    setResult({
                        error:
                            (axios.isAxiosError(exception) &&
                                exception.response?.data?.message) ||
                            'Não foi possível gerar o PIX.',
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [charge.id]);

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>PIX · {formatBRL(charge.amount)}</DialogTitle>
                    {charge.description && (
                        <DialogDescription>
                            {charge.description}
                        </DialogDescription>
                    )}
                </DialogHeader>

                {!result ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="size-6 animate-spin text-primary" />
                    </div>
                ) : 'error' in result ? (
                    <p className="text-sm text-red-600">{result.error}</p>
                ) : (
                    <div className="space-y-3">
                        <div
                            className="mx-auto w-fit rounded-xl bg-white p-3"
                            dangerouslySetInnerHTML={{ __html: result.qr_svg }}
                        />
                        <textarea
                            readOnly
                            value={result.payload}
                            onFocus={(e) => e.target.select()}
                            className="h-20 w-full resize-none rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-xs"
                        />
                        <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => copy(result.payload)}
                        >
                            {copiedText === result.payload ? (
                                <Check className="size-4" />
                            ) : (
                                <Copy className="size-4" />
                            )}
                            {copiedText === result.payload
                                ? 'Copiado'
                                : 'Copiar PIX copia e cola'}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
