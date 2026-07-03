import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { ArrowLeft, AlertTriangle, Clock, Users, CheckCircle, User, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useConfirmModal } from '@/components/confirm-modal';
import { usePermissions } from '@/hooks/use-permissions';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Financeiro', href: '/financial' },
    { title: 'A Receber', href: '/financial/receivables' },
];

interface TxItem {
    id: string;
    description: string;
    amount: number;
    due_date: string | null;
    date: string | null;
    category: string | null;
    is_overdue: boolean;
}

interface Group {
    patient_id: string | null;
    patient_name: string;
    total_pending: number;
    overdue_amount: number;
    overdue_count: number;
    count: number;
    oldest_due: string | null;
    transactions: TxItem[];
}

interface Props {
    groups: Group[];
    totals: { total_pending: number; overdue_amount: number; patient_count: number };
}

export default function Receivables({ groups, totals }: Props) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const { confirm, modal } = useConfirmModal();
    const { can } = usePermissions();

    const formatCurrency = (val: string | number) =>
        Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');

    const daysOverdue = (d: string | null) => {
        if (!d) return 0;
        const diff = Math.floor((new Date().getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    };

    function openReceipt(id: string) {
        const a = document.createElement('a');
        a.href = `/financial/${id}/receipt`;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    async function handleMarkPaid(t: TxItem) {
        const confirmed = await confirm({
            title: 'Confirmar recebimento',
            message: `Confirma que "${t.description}" (${formatCurrency(t.amount)}) foi recebido?`,
            confirmLabel: 'Confirmar',
            variant: 'warning',
        });
        if (!confirmed) return;

        router.post(`/financial/${t.id}/mark-paid`, {}, {
            preserveScroll: true,
            onSuccess: async () => {
                const wantsReceipt = await confirm({
                    title: 'Gerar recibo?',
                    message: 'Deseja gerar o recibo deste pagamento para o paciente?',
                    confirmLabel: 'Gerar recibo',
                });
                if (wantsReceipt) openReceipt(t.id);
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="A Receber - Phisio" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 md:p-10 max-w-5xl mx-auto w-full">
                <div className="flex items-center gap-4">
                    <Link href="/financial" className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-600">Contas a Receber</h1>
                        <p className="text-muted-foreground mt-1">Mensalidades e cobranças pendentes, agrupadas por paciente.</p>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-1 text-amber-600"><Clock className="size-4" /><span className="text-xs font-medium text-muted-foreground">Total a Receber</span></div>
                        <p className="text-2xl font-bold text-amber-600">{formatCurrency(totals.total_pending)}</p>
                    </div>
                    <div className={`border rounded-2xl p-5 ${totals.overdue_amount > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30' : 'bg-card/60 border-border/50 backdrop-blur-xl'}`}>
                        <div className="flex items-center gap-2 mb-1 text-red-600"><AlertTriangle className="size-4" /><span className="text-xs font-medium text-muted-foreground">Vencido</span></div>
                        <p className={`text-2xl font-bold ${totals.overdue_amount > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{formatCurrency(totals.overdue_amount)}</p>
                    </div>
                    <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-1 text-primary"><Users className="size-4" /><span className="text-xs font-medium text-muted-foreground">Pacientes em aberto</span></div>
                        <p className="text-2xl font-bold text-foreground">{totals.patient_count}</p>
                    </div>
                </div>

                {/* Groups */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                    {groups.length === 0 ? (
                        <div className="text-center py-16">
                            <CheckCircle className="size-12 text-emerald-500/40 mx-auto mb-3" />
                            <p className="text-base font-medium text-foreground">Tudo em dia!</p>
                            <p className="text-sm text-muted-foreground">Não há contas a receber no momento.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {groups.map(g => {
                                const key = g.patient_id ?? 'none';
                                const isOpen = expanded === key;
                                return (
                                    <div key={key}>
                                        <button
                                            onClick={() => setExpanded(isOpen ? null : key)}
                                            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                                        >
                                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                                <User className="size-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {g.patient_id ? (
                                                        <Link href={`/patients/${g.patient_id}?tab=financial`} onClick={e => e.stopPropagation()} className="font-semibold text-foreground hover:text-primary truncate">
                                                            {g.patient_name}
                                                        </Link>
                                                    ) : (
                                                        <span className="font-semibold text-muted-foreground truncate">{g.patient_name}</span>
                                                    )}
                                                    {g.overdue_count > 0 && (
                                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                            {g.overdue_count} vencida{g.overdue_count > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {g.count} cobrança{g.count > 1 ? 's' : ''} em aberto
                                                    {g.oldest_due && ` • mais antiga vence ${formatDate(g.oldest_due)}`}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="font-bold text-amber-600">{formatCurrency(g.total_pending)}</p>
                                                {g.overdue_amount > 0 && (
                                                    <p className="text-xs text-red-600 font-medium">{formatCurrency(g.overdue_amount)} vencido</p>
                                                )}
                                            </div>
                                            <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isOpen && (
                                            <div className="bg-muted/20 px-5 py-2 divide-y divide-border/30">
                                                {g.transactions.map(t => (
                                                    <div key={t.id} className="flex items-center gap-3 py-2.5">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-foreground truncate">{t.description}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {t.due_date ? (
                                                                    <span className={t.is_overdue ? 'text-red-600 font-semibold' : ''}>
                                                                        Vence {formatDate(t.due_date)}
                                                                        {t.is_overdue && ` • há ${daysOverdue(t.due_date)} dia(s)`}
                                                                    </span>
                                                                ) : 'Sem vencimento'}
                                                            </p>
                                                        </div>
                                                        <span className="font-semibold text-sm text-foreground whitespace-nowrap">{formatCurrency(t.amount)}</span>
                                                        {can('financial.transactions.edit') && (
                                                            <button
                                                                onClick={() => handleMarkPaid(t)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                                                            >
                                                                <CheckCircle className="size-3.5" /> Receber
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            {modal}
        </AppLayout>
    );
}
