import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Plus,
    Search,
    DollarSign,
    Wallet,
    User,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle,
    RefreshCw,
    Save,
    AlignLeft,
    Calendar as CalendarIcon,
    Tag,
    Receipt,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState, useMemo } from 'react';
import { useConfirmModal } from '@/components/confirm-modal';
import { Pagination } from '@/components/pagination';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Financeiro', href: '/financial' },
];

const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
];

const categoryColors: Record<string, string> = {
    Mensalidade: 'bg-emerald-500',
    Avaliação: 'bg-blue-500',
    'Sessão Avulsa': 'bg-cyan-500',
    Matrícula: 'bg-violet-500',
    Aluguel: 'bg-red-500',
    Equipamentos: 'bg-orange-500',
    Material: 'bg-amber-500',
    'Água/Luz/Internet': 'bg-yellow-500',
    Salários: 'bg-rose-500',
    Impostos: 'bg-pink-500',
    Marketing: 'bg-indigo-500',
    Manutenção: 'bg-slate-500',
    Outros: 'bg-gray-400',
    'Sem categoria': 'bg-gray-300',
};

const incomeCategories = [
    'Mensalidade',
    'Avaliação',
    'Sessão Avulsa',
    'Matrícula',
    'Outros',
];
const expenseCategories = [
    'Aluguel',
    'Equipamentos',
    'Material',
    'Água/Luz/Internet',
    'Salários',
    'Impostos',
    'Marketing',
    'Manutenção',
    'Outros',
];

interface Props {
    transactions: any;
    summary: any;
    chartData: Array<{ label: string; income: number; expense: number }>;
    categoryBreakdown: {
        income: Array<{ category: string; total: number }>;
        expense: Array<{ category: string; total: number }>;
    };
    professionalEarnings?: Array<{
        name: string;
        total: number;
        count: number;
    }>;
    filters: any;
    currentMonth: number;
    currentYear: number;
    patients: any[];
}

export default function FinancialIndex({
    transactions,
    summary,
    chartData,
    categoryBreakdown,
    professionalEarnings = [],
    filters = {},
    currentMonth,
    currentYear,
    patients,
}: Props) {
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const { confirm, modal } = useConfirmModal();
    const { can } = usePermissions();

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<any>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            type: 'income',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            description: '',
            category: '',
            status: 'paid',
            patient_id: '',
            due_date: '',
        });

    const formCategories =
        data.type === 'income' ? incomeCategories : expenseCategories;

    function openCreateSheet() {
        clearErrors();
        reset();
        setData({
            type: 'income',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            description: '',
            category: '',
            status: 'paid',
            patient_id: '',
            due_date: '',
        });
        setEditingTransaction(null);
        setSheetOpen(true);
    }

    function openEditSheet(t: any) {
        clearErrors();
        setEditingTransaction(t);
        setData({
            type: t.type || 'income',
            amount: t.amount || '',
            date: t.date ? t.date.split('T')[0] : '',
            description: t.description || '',
            category: t.category || '',
            status: t.status || 'paid',
            patient_id: t.patient_id || '',
            due_date: t.due_date ? t.due_date.split('T')[0] : '',
        });
        setSheetOpen(true);
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        if (editingTransaction) {
            put(`/financial/${editingTransaction.id}`, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setSheetOpen(false),
            });
        } else {
            post('/financial', {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setSheetOpen(false),
            });
        }
    }

    function navigate(params: Record<string, any>) {
        const current: Record<string, any> = {
            month: currentMonth,
            year: currentYear,
        };
        if (typeFilter) current.type = typeFilter;
        if (statusFilter) current.status = statusFilter;
        if (searchQuery) current.search = searchQuery;
        router.get(
            '/financial',
            { ...current, ...params },
            { preserveState: true, replace: true },
        );
    }

    function prevMonth() {
        let m = currentMonth - 1,
            y = currentYear;
        if (m < 1) {
            m = 12;
            y--;
        }
        navigate({ month: m, year: y });
    }

    function nextMonth() {
        let m = currentMonth + 1,
            y = currentYear;
        if (m > 12) {
            m = 1;
            y++;
        }
        navigate({ month: m, year: y });
    }

    function applyFilters() {
        navigate({});
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        navigate({});
    }

    async function handleDelete(t: any) {
        const confirmed = await confirm({
            title: 'Excluir Lançamento',
            message: `Tem certeza que deseja excluir "${t.description}"?`,
            confirmLabel: 'Excluir',
        });
        if (confirmed)
            router.delete(`/financial/${t.id}`, { preserveState: true });
    }

    function openReceipt(id: string) {
        const a = document.createElement('a');
        a.href = `/financial/${id}/receipt`;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    async function handleMarkPaid(t: any) {
        const verb = t.type === 'income' ? 'recebido' : 'pago';
        const confirmed = await confirm({
            title:
                t.type === 'income'
                    ? 'Confirmar recebimento'
                    : 'Confirmar pagamento',
            message: `Confirma que "${t.description}" (${formatCurrency(t.amount)}) foi ${verb}?`,
            confirmLabel: 'Confirmar',
            variant: 'warning',
        });
        if (!confirmed) return;

        router.post(
            `/financial/${t.id}/mark-paid`,
            {},
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: async () => {
                    // Recibo only for received payments (income), and only if asked.
                    if (t.type !== 'income') return;
                    const wantsReceipt = await confirm({
                        title: 'Gerar recibo?',
                        message:
                            'Deseja gerar o recibo deste pagamento para o paciente?',
                        confirmLabel: 'Gerar recibo',
                    });
                    if (wantsReceipt) openReceipt(t.id);
                },
            },
        );
    }

    async function handleRevert(t: any) {
        const confirmed = await confirm({
            title: 'Estornar pagamento',
            message: `Desfazer a baixa de "${t.description}" (${formatCurrency(t.amount)})? Ela voltará para pendente.`,
            confirmLabel: 'Estornar',
            variant: 'warning',
        });
        if (confirmed)
            router.post(
                `/financial/${t.id}/mark-pending`,
                {},
                { preserveState: true, preserveScroll: true },
            );
    }

    const formatCurrency = (val: string | number) =>
        Number(val).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });

    // Chart calculations
    const chartMax = useMemo(() => {
        const vals = chartData.flatMap((d) => [d.income, d.expense]);
        return Math.max(...vals, 1);
    }, [chartData]);

    const isOverdue = (t: any) =>
        t.status === 'pending' &&
        t.due_date &&
        new Date(t.due_date) < new Date();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Financeiro - Phisio" />

            <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-6 p-6 md:p-10">
                {/* Header + Month Navigation */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                            Financeiro
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            Fluxo de caixa, mensalidades e despesas do estúdio.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Month Navigator */}
                        <div className="flex items-center gap-1 rounded-xl border border-border bg-card shadow-sm">
                            <button
                                onClick={prevMonth}
                                className="rounded-l-xl p-2.5 transition-colors hover:bg-muted/50"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                            <span className="min-w-[140px] px-3 py-2 text-center text-sm font-semibold">
                                {monthNames[currentMonth - 1]} {currentYear}
                            </span>
                            <button
                                onClick={nextMonth}
                                className="rounded-r-xl p-2.5 transition-colors hover:bg-muted/50"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                        <Link
                            href="/financial/receivables"
                            className="flex h-10 items-center gap-2 rounded-xl border border-border px-4 font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
                        >
                            <Receipt className="size-4" />
                            <span className="hidden sm:inline">A Receber</span>
                        </Link>
                        <Link
                            href="/recurring-expenses"
                            className="flex h-10 items-center gap-2 rounded-xl border border-border px-4 font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
                        >
                            <RefreshCw className="size-4" />
                            <span className="hidden sm:inline">
                                Recorrentes
                            </span>
                        </Link>
                        {can('financial.transactions.create') && (
                            <button
                                onClick={openCreateSheet}
                                className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                            >
                                <Plus className="size-4" />
                                <span className="hidden sm:inline">
                                    Nova Transação
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-xl">
                        <div className="mb-2 flex items-center gap-3">
                            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                                <ArrowUpRight className="size-4" />
                            </div>
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Receitas
                            </h3>
                        </div>
                        <p className="text-2xl font-bold text-emerald-600">
                            {formatCurrency(summary.income)}
                        </p>
                        {Number(summary.pending_income) > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                +{formatCurrency(summary.pending_income)} a
                                receber
                            </p>
                        )}
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-xl">
                        <div className="mb-2 flex items-center gap-3">
                            <div className="rounded-lg bg-red-500/10 p-2 text-red-600">
                                <ArrowDownRight className="size-4" />
                            </div>
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Despesas
                            </h3>
                        </div>
                        <p className="text-2xl font-bold text-red-600">
                            {formatCurrency(summary.expense)}
                        </p>
                        {Number(summary.pending_expense) > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                +{formatCurrency(summary.pending_expense)} a
                                pagar
                            </p>
                        )}
                    </div>
                    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-emerald-500/10 p-5 shadow-sm">
                        <div className="mb-2 flex items-center gap-3">
                            <div className="rounded-lg bg-primary/20 p-2 text-primary">
                                <Wallet className="size-4" />
                            </div>
                            <h3 className="text-sm font-medium text-primary">
                                Saldo Mensal
                            </h3>
                        </div>
                        <p
                            className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}
                        >
                            {formatCurrency(summary.balance)}
                        </p>
                    </div>
                    <div
                        className={`rounded-2xl border p-5 shadow-sm ${summary.overdue_count > 0 ? 'border-red-200 bg-red-50 dark:border-red-800/30 dark:bg-red-950/20' : 'border-border/50 bg-card/60 backdrop-blur-xl'}`}
                    >
                        <div className="mb-2 flex items-center gap-3">
                            <div
                                className={`rounded-lg p-2 ${summary.overdue_count > 0 ? 'bg-red-500/10 text-red-600' : 'bg-muted text-muted-foreground'}`}
                            >
                                <AlertTriangle className="size-4" />
                            </div>
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Vencidas
                            </h3>
                        </div>
                        <p
                            className={`text-2xl font-bold ${summary.overdue_count > 0 ? 'text-red-600' : 'text-muted-foreground'}`}
                        >
                            {summary.overdue_count}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            transações pendentes vencidas
                        </p>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Bar Chart: Receitas vs Despesas (últimos 6 meses) */}
                    <div className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl lg:col-span-2">
                        <h3 className="mb-4 text-sm font-semibold text-foreground">
                            Receitas vs Despesas — Últimos 6 meses
                        </h3>
                        <div className="flex h-40 items-end justify-between gap-2">
                            {chartData.map((d, i) => {
                                const incH =
                                    chartMax > 0
                                        ? (d.income / chartMax) * 100
                                        : 0;
                                const expH =
                                    chartMax > 0
                                        ? (d.expense / chartMax) * 100
                                        : 0;
                                return (
                                    <div
                                        key={i}
                                        className="flex flex-1 flex-col items-center gap-1"
                                    >
                                        <div className="flex h-32 w-full items-end justify-center gap-0.5">
                                            <div
                                                className="min-h-[2px] w-[38%] rounded-t-md bg-emerald-500/80 transition-all duration-500"
                                                style={{
                                                    height: `${Math.max(incH, 1.5)}%`,
                                                }}
                                                title={`Receita: ${formatCurrency(d.income)}`}
                                            />
                                            <div
                                                className="min-h-[2px] w-[38%] rounded-t-md bg-red-400/80 transition-all duration-500"
                                                style={{
                                                    height: `${Math.max(expH, 1.5)}%`,
                                                }}
                                                title={`Despesa: ${formatCurrency(d.expense)}`}
                                            />
                                        </div>
                                        <span className="text-[10px] font-medium text-muted-foreground">
                                            {d.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <span className="inline-block size-2 rounded-full bg-emerald-500" />{' '}
                                Receitas
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="inline-block size-2 rounded-full bg-red-400" />{' '}
                                Despesas
                            </span>
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl">
                        <h3 className="mb-4 text-sm font-semibold text-foreground">
                            Por Categoria
                        </h3>
                        {categoryBreakdown.expense.length > 0 ||
                        categoryBreakdown.income.length > 0 ? (
                            <div className="space-y-4">
                                {categoryBreakdown.expense.length > 0 && (
                                    <div>
                                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                                            Despesas
                                        </p>
                                        <div className="space-y-2">
                                            {categoryBreakdown.expense
                                                .slice(0, 5)
                                                .map((c: any) => {
                                                    const maxCat =
                                                        categoryBreakdown
                                                            .expense[0]
                                                            ?.total || 1;
                                                    const pct =
                                                        (c.total / maxCat) *
                                                        100;
                                                    return (
                                                        <div key={c.category}>
                                                            <div className="mb-0.5 flex justify-between text-xs">
                                                                <span className="font-medium text-foreground">
                                                                    {c.category}
                                                                </span>
                                                                <span className="font-semibold text-red-600">
                                                                    {formatCurrency(
                                                                        c.total,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-500 ${categoryColors[c.category] || 'bg-gray-400'}`}
                                                                    style={{
                                                                        width: `${pct}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                                {categoryBreakdown.income.length > 0 && (
                                    <div>
                                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                                            Receitas
                                        </p>
                                        <div className="space-y-2">
                                            {categoryBreakdown.income
                                                .slice(0, 5)
                                                .map((c: any) => {
                                                    const maxCat =
                                                        categoryBreakdown
                                                            .income[0]?.total ||
                                                        1;
                                                    const pct =
                                                        (c.total / maxCat) *
                                                        100;
                                                    return (
                                                        <div key={c.category}>
                                                            <div className="mb-0.5 flex justify-between text-xs">
                                                                <span className="font-medium text-foreground">
                                                                    {c.category}
                                                                </span>
                                                                <span className="font-semibold text-emerald-600">
                                                                    {formatCurrency(
                                                                        c.total,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-500 ${categoryColors[c.category] || 'bg-emerald-500'}`}
                                                                    style={{
                                                                        width: `${pct}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                Sem dados neste mês.
                            </p>
                        )}
                    </div>
                </div>

                {/* Ganho por Profissional */}
                <div className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                            Ganho por Profissional
                        </h3>
                        <span className="text-xs text-muted-foreground">
                            Receita recebida no mês
                        </span>
                    </div>
                    {professionalEarnings.length > 0 ? (
                        <div className="space-y-3">
                            {professionalEarnings.map((p) => {
                                const maxPro =
                                    professionalEarnings[0]?.total || 1;
                                const pct = (p.total / maxPro) * 100;
                                return (
                                    <div key={p.name}>
                                        <div className="mb-1 flex justify-between text-sm">
                                            <span className="font-medium text-foreground">
                                                {p.name}
                                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                    ({p.count} pagamento
                                                    {p.count === 1 ? '' : 's'})
                                                </span>
                                            </span>
                                            <span className="font-semibold text-emerald-600">
                                                {formatCurrency(p.total)}
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                                            <div
                                                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            Nenhuma receita recebida neste mês.
                        </p>
                    )}
                </div>

                {/* Filters + Search */}
                <div className="flex flex-wrap items-center gap-3">
                    <form
                        onSubmit={handleSearch}
                        className="relative min-w-[200px] flex-1"
                    >
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar por descrição, categoria ou paciente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onBlur={applyFilters}
                            className="h-10 w-full rounded-xl border border-border bg-card pr-3 pl-10 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        />
                    </form>
                    <select
                        value={typeFilter}
                        onChange={(e) => {
                            const val = e.target.value;
                            setTypeFilter(val);
                            navigate({ type: val || undefined });
                        }}
                        className="h-10 rounded-xl border border-border bg-card px-3 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    >
                        <option value="">Todas</option>
                        <option value="income">Receitas</option>
                        <option value="expense">Despesas</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            const val = e.target.value;
                            setStatusFilter(val);
                            navigate({ status: val || undefined });
                        }}
                        className="h-10 rounded-xl border border-border bg-card px-3 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    >
                        <option value="">Todos Status</option>
                        <option value="paid">Pago</option>
                        <option value="pending">Pendente</option>
                        <option value="overdue">Vencidas</option>
                    </select>
                </div>

                {/* Transactions Table */}
                <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-sm backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border/50 bg-muted/50 text-xs text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-5 py-3.5 font-semibold">
                                        Data
                                    </th>
                                    <th className="px-5 py-3.5 font-semibold">
                                        Descrição
                                    </th>
                                    <th className="hidden px-5 py-3.5 font-semibold md:table-cell">
                                        Categoria
                                    </th>
                                    <th className="hidden px-5 py-3.5 font-semibold lg:table-cell">
                                        Vencimento
                                    </th>
                                    <th className="px-5 py-3.5 text-right font-semibold">
                                        Valor
                                    </th>
                                    <th className="hidden px-5 py-3.5 text-center font-semibold sm:table-cell">
                                        Status
                                    </th>
                                    <th className="px-5 py-3.5">
                                        <span className="sr-only">Ações</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {transactions.data.length > 0 ? (
                                    transactions.data.map((t: any) => (
                                        <tr
                                            key={t.id}
                                            className="group transition-colors hover:bg-muted/30"
                                        >
                                            <td className="px-5 py-3.5 font-medium whitespace-nowrap text-foreground">
                                                {new Date(
                                                    t.date,
                                                ).toLocaleDateString('pt-BR', {
                                                    timeZone: 'UTC',
                                                })}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`size-2 flex-shrink-0 rounded-full ${t.type === 'income' ? 'bg-emerald-500' : 'bg-red-400'}`}
                                                    />
                                                    <div>
                                                        <div className="font-medium text-foreground">
                                                            {t.description}
                                                        </div>
                                                        {t.patient && (
                                                            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                                                <User className="size-3" />{' '}
                                                                {t.patient.name}
                                                            </div>
                                                        )}
                                                        {t.status === 'paid' &&
                                                            t.paid_at && (
                                                                <div className="mt-0.5 flex items-center gap-1 text-xs text-emerald-600/80">
                                                                    <CheckCircle className="size-3" />{' '}
                                                                    Baixado em{' '}
                                                                    {new Date(
                                                                        t.paid_at,
                                                                    ).toLocaleDateString(
                                                                        'pt-BR',
                                                                        {
                                                                            timeZone:
                                                                                'UTC',
                                                                        },
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden px-5 py-3.5 text-muted-foreground md:table-cell">
                                                {t.category ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span
                                                            className={`size-2 rounded-full ${categoryColors[t.category] || 'bg-gray-400'}`}
                                                        />
                                                        {t.category}
                                                    </span>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td className="hidden px-5 py-3.5 whitespace-nowrap text-muted-foreground lg:table-cell">
                                                {t.due_date ? (
                                                    <span
                                                        className={
                                                            isOverdue(t)
                                                                ? 'font-semibold text-red-600'
                                                                : ''
                                                        }
                                                    >
                                                        {new Date(
                                                            t.due_date,
                                                        ).toLocaleDateString(
                                                            'pt-BR',
                                                            { timeZone: 'UTC' },
                                                        )}
                                                        {isOverdue(t) && (
                                                            <AlertTriangle className="ml-1 inline size-3" />
                                                        )}
                                                    </span>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td
                                                className={`px-5 py-3.5 text-right font-bold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                                            >
                                                {t.type === 'income'
                                                    ? '+'
                                                    : '-'}{' '}
                                                {formatCurrency(t.amount)}
                                            </td>
                                            <td className="hidden px-5 py-3.5 text-center sm:table-cell">
                                                {isOverdue(t) ? (
                                                    <span className="rounded-md bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                        Vencido
                                                    </span>
                                                ) : t.status === 'paid' ? (
                                                    <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        Pago
                                                    </span>
                                                ) : (
                                                    <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                        Pendente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                                    {can(
                                                        'financial.transactions.edit',
                                                    ) &&
                                                        (t.status ===
                                                        'pending' ? (
                                                            <button
                                                                onClick={() =>
                                                                    handleMarkPaid(
                                                                        t,
                                                                    )
                                                                }
                                                                className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                                                            >
                                                                Pago
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() =>
                                                                    handleRevert(
                                                                        t,
                                                                    )
                                                                }
                                                                className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                                                            >
                                                                Cancelar Pgmto
                                                            </button>
                                                        ))}
                                                    {t.status === 'paid' &&
                                                        t.type === 'income' && (
                                                            <button
                                                                onClick={() =>
                                                                    openReceipt(
                                                                        t.id,
                                                                    )
                                                                }
                                                                className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                                                            >
                                                                Recibo
                                                            </button>
                                                        )}
                                                    {can(
                                                        'financial.transactions.edit',
                                                    ) && (
                                                        <button
                                                            onClick={() =>
                                                                openEditSheet(t)
                                                            }
                                                            className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                                                        >
                                                            Editar
                                                        </button>
                                                    )}
                                                    {can(
                                                        'financial.transactions.delete',
                                                    ) && (
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(t)
                                                            }
                                                            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                                                        >
                                                            Excluir
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-6 py-16 text-center text-muted-foreground"
                                        >
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50">
                                                    <DollarSign className="size-6 text-muted-foreground/50" />
                                                </div>
                                                <p className="text-base font-medium text-foreground">
                                                    Nenhum lançamento
                                                </p>
                                                <p className="text-sm">
                                                    Nenhuma transação encontrada
                                                    para{' '}
                                                    {
                                                        monthNames[
                                                            currentMonth - 1
                                                        ]
                                                    }{' '}
                                                    {currentYear}.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {transactions.total > 0 && (
                    <div className="mt-2">
                        <Pagination
                            links={transactions.links}
                            from={transactions.from}
                            to={transactions.to}
                            total={transactions.total}
                        />
                    </div>
                )}
            </div>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    side="right"
                    className="w-full max-w-md overflow-y-auto border-l-0 p-6 shadow-2xl sm:max-w-lg"
                >
                    <SheetHeader className="mb-6">
                        <SheetTitle className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-2xl font-bold text-transparent">
                            {editingTransaction
                                ? 'Editar Lançamento'
                                : 'Novo Lançamento'}
                        </SheetTitle>
                    </SheetHeader>
                    <form onSubmit={submit} className="space-y-6">
                        {/* Tipo de Transação */}
                        <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/30 p-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setData('type', 'income');
                                    setData('category', '');
                                }}
                                className={`flex items-center justify-center gap-2 rounded-lg py-3 font-medium transition-all ${data.type === 'income' ? 'bg-emerald-500 text-white shadow-md' : 'text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600'}`}
                            >
                                Receita (+)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setData('type', 'expense');
                                    setData('category', '');
                                }}
                                className={`flex items-center justify-center gap-2 rounded-lg py-3 font-medium transition-all ${data.type === 'expense' ? 'bg-red-500 text-white shadow-md' : 'text-muted-foreground hover:bg-red-500/10 hover:text-red-600'}`}
                            >
                                Despesa (-)
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Valor (R$)
                                </label>
                                <div className="relative">
                                    <DollarSign
                                        className={`absolute top-1/2 left-3 size-5 -translate-y-1/2 ${data.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={data.amount}
                                        onChange={(e) =>
                                            setData('amount', e.target.value)
                                        }
                                        className="h-14 w-full rounded-xl border border-border bg-background pr-3 pl-12 text-2xl font-bold shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                        required
                                    />
                                </div>
                                {errors.amount && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.amount}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Descrição
                                </label>
                                <div className="relative">
                                    <AlignLeft className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Ex: Mensalidade Pilates, Luz, Água, etc..."
                                        value={data.description}
                                        onChange={(e) =>
                                            setData(
                                                'description',
                                                e.target.value,
                                            )
                                        }
                                        className="h-11 w-full rounded-xl border border-border bg-background pr-3 pl-10 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                        required
                                    />
                                </div>
                                {errors.description && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.description}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Data
                                </label>
                                <div className="relative">
                                    <CalendarIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="date"
                                        value={data.date}
                                        onChange={(e) =>
                                            setData('date', e.target.value)
                                        }
                                        className="h-11 w-full rounded-xl border border-border bg-background pr-3 pl-10 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                        required
                                    />
                                </div>
                                {errors.date && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.date}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Categoria
                                </label>
                                <div className="relative">
                                    <Tag className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <select
                                        value={data.category}
                                        onChange={(e) =>
                                            setData('category', e.target.value)
                                        }
                                        className="h-11 w-full appearance-none rounded-xl border border-border bg-background pr-3 pl-10 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                    >
                                        <option value="">
                                            Selecione uma categoria
                                        </option>
                                        {formCategories.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.category && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.category}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Status
                                </label>
                                <select
                                    value={data.status}
                                    onChange={(e) =>
                                        setData('status', e.target.value)
                                    }
                                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                    required
                                >
                                    <option value="paid">
                                        {data.type === 'income'
                                            ? 'Recebido'
                                            : 'Pago'}
                                    </option>
                                    <option value="pending">
                                        Pendente (A receber / A pagar)
                                    </option>
                                </select>
                                {errors.status && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.status}
                                    </p>
                                )}
                            </div>

                            {data.status === 'pending' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">
                                        Data de Vencimento
                                    </label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="date"
                                            value={data.due_date}
                                            onChange={(e) =>
                                                setData(
                                                    'due_date',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-11 w-full rounded-xl border border-border bg-background pr-3 pl-10 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                        />
                                    </div>
                                    {errors.due_date && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {errors.due_date}
                                        </p>
                                    )}
                                </div>
                            )}

                            {data.type === 'income' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">
                                        Vincular Paciente / Aluno (Opcional)
                                    </label>
                                    <div className="relative">
                                        <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <select
                                            value={data.patient_id}
                                            onChange={(e) =>
                                                setData(
                                                    'patient_id',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-11 w-full rounded-xl border border-border bg-background pr-3 pl-10 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                        >
                                            <option value="">Nenhum</option>
                                            {patients &&
                                                patients.map((p) => (
                                                    <option
                                                        key={p.id}
                                                        value={p.id}
                                                    >
                                                        {p.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    {errors.patient_id && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {errors.patient_id}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 border-t border-border/50 pt-6">
                            <button
                                type="button"
                                onClick={() => setSheetOpen(false)}
                                className="flex h-11 items-center justify-center rounded-xl border border-border bg-card px-6 font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                            >
                                <Save className="size-4" />
                                {editingTransaction
                                    ? 'Salvar Alterações'
                                    : 'Salvar Lançamento'}
                            </button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
            {modal}
        </AppLayout>
    );
}
