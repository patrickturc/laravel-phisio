/**
 * Labels and helpers for memberships and charges. Keys mirror
 * Membership::BILLING_CYCLES and FinancialTransaction::STATUSES /
 * PAYMENT_METHODS in the backend.
 */

export const BILLING_CYCLES: Array<{ value: string; label: string }> = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quinzenal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'bimonthly', label: 'Bimestral' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'semiannual', label: 'Semestral' },
    { value: 'annual', label: 'Anual' },
];

export function billingCycleLabel(cycle: string | null | undefined): string {
    if (!cycle) return 'Cobrança única';

    return BILLING_CYCLES.find((c) => c.value === cycle)?.label ?? cycle;
}

export type ChargeStatus = 'pending' | 'in_review' | 'paid' | 'written_off';

export const CHARGE_STATUS: Record<
    ChargeStatus,
    { label: string; className: string }
> = {
    pending: {
        label: 'Pendente',
        className:
            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    in_review: {
        label: 'Em análise',
        className:
            'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    },
    paid: {
        label: 'Pago',
        className:
            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    written_off: {
        label: 'Perda',
        className: 'bg-muted text-muted-foreground line-through',
    },
};

export const PAYMENT_METHODS: Array<{ value: string; label: string }> = [
    { value: 'pix', label: 'PIX' },
    { value: 'cash', label: 'Dinheiro' },
    { value: 'credit_card', label: 'Cartão de crédito' },
    { value: 'debit_card', label: 'Cartão de débito' },
    { value: 'transfer', label: 'Transferência' },
    { value: 'boleto', label: 'Boleto' },
    { value: 'other', label: 'Outro' },
];

export function paymentMethodLabel(method: string | null | undefined): string {
    if (!method) return '';

    return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

export const MEMBERSHIP_STATUS: Record<
    string,
    { label: string; className: string }
> = {
    active: {
        label: 'Ativa',
        className:
            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    paused: {
        label: 'Pausada',
        className:
            'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    },
    expired: {
        label: 'Vencida',
        className:
            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    cancelled: {
        label: 'Cancelada',
        className:
            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
};

export function formatBRL(value: number | string): string {
    return Number(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

/** "13/10/2026" from "2026-10-13" (or an ISO datetime), with no timezone shift. */
export function formatDateBR(value: string | null | undefined): string {
    if (!value) return '';

    const [year, month, day] = value.slice(0, 10).split('-');

    return `${day}/${month}/${year}`;
}

/**
 * Fill a billing reminder template. Placeholders: {nome}, {primeiro_nome},
 * {valor}, {vencimento}, {dias}, {referente}, {clinica}, {pix}.
 */
export function renderBillingMessage(
    template: string,
    values: {
        name: string;
        nickname?: string | null;
        amount: number;
        dueDate: string;
        days: number;
        reference: string;
        clinic: string;
        pix?: string | null;
    },
): string {
    const filled: Record<string, string> = {
        nome: values.name,
        primeiro_nome: (values.nickname || values.name).trim().split(/\s+/)[0],
        valor: formatBRL(values.amount),
        vencimento: formatDateBR(values.dueDate).slice(0, 5),
        dias: `${values.days} ${values.days === 1 ? 'dia' : 'dias'}`,
        referente: values.reference,
        clinica: values.clinic,
        pix: values.pix ? `\n\nPIX copia e cola:\n${values.pix}` : '',
    };

    return template.replace(
        /\{(\w+)\}/g,
        (match, key: string) => filled[key] ?? match,
    );
}
