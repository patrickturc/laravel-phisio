import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Check,
    Clock,
    CreditCard,
    Download,
    HardDrive,
    Mail,
    Minus,
    Plus,
    Receipt,
    Users,
} from 'lucide-react';
import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Plan = {
    key: string;
    name: string;
    tagline: string;
    users: number;
    storage_mb: number;
    price: number | null;
    allows_extra_users: boolean;
};

type TenantInfo = {
    name: string;
    plan: string;
    plan_name: string;
    access_status: string;
    is_on_trial: boolean;
    is_trial_expired: boolean;
    trial_days_left: number | null;
    trial_ends_at: string | null;
    requested_plan: string | null;
    requested_extra_users: number;
    plan_requested_at: string | null;
    has_pending_plan_request: boolean;
    seat_limit: number;
    seats_in_use: number;
    extra_users: number;
    profile_complete: boolean;
};

type Payment = {
    id: string;
    amount: string;
    method: string;
    reference_period: string;
    description: string;
    paid_at: string;
    notes: string | null;
    receipt_url: string | null;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedPayments = {
    data: Payment[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
};

type Props = {
    tenant: TenantInfo;
    plans: Plan[];
    payments: PaginatedPayments;
    includedFeatures: string[];
    extraUserPrice: number;
    maxExtraUsers: number;
    contactEmail: string | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Configurações', href: '/settings/organization' },
    { title: 'Plano e Cobrança', href: '/settings/billing' },
];

const money = (value: number | string) =>
    Number(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

const storage = (mb: number) =>
    mb >= 1024 ? `${Math.round(mb / 1024)} GB` : `${mb} MB`;

const formatDate = (value: string | null) =>
    value
        ? new Date(value).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
          })
        : null;

const formatShortDate = (value: string) =>
    new Date(value).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const months = [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez',
    ];
    return `${months[Number(month) - 1]}/${year}`;
};

const methodLabels: Record<string, string> = {
    pix: 'Pix',
    boleto: 'Boleto',
    cartao: 'Cartão',
    transferencia: 'Transferência',
    outro: 'Outro',
};

export default function Billing({
    tenant,
    plans,
    payments,
    includedFeatures,
    extraUserPrice,
    maxExtraUsers,
    contactEmail,
}: Props) {
    const { flash } = usePage<{
        flash?: { success?: string; error?: string; warning?: string };
    }>().props;

    const { data, setData, post, processing, errors } = useForm({
        requested_plan: tenant.requested_plan || plans[0]?.key || '',
        requested_extra_users: tenant.requested_extra_users || 0,
        plan_request_notes: '',
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
        if (flash?.warning) toast.warning(flash.warning);
    }, [flash]);

    const selected = plans.find((plan) => plan.key === data.requested_plan);
    const extras = selected?.allows_extra_users
        ? data.requested_extra_users
        : 0;
    const totalSeats = (selected?.users ?? 0) + extras;
    const extrasCost = extras * extraUserPrice;
    const monthlyTotal =
        selected?.price !== null && selected?.price !== undefined
            ? selected.price + extrasCost
            : null;

    const trialEnd = formatDate(tenant.trial_ends_at);
    const requestedAt = formatDate(tenant.plan_requested_at);

    const setExtras = (value: number) =>
        setData(
            'requested_extra_users',
            Math.min(maxExtraUsers, Math.max(0, value)),
        );

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        post('/settings/billing/request-plan', { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Plano e Cobrança" />

            <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col gap-6 p-6 md:p-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Plano e Cobrança
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        Gerencie o plano da sua clínica e veja o histórico de
                        pagamentos.
                    </p>
                </div>

                {/* Current Plan Status */}
                <div
                    className={`rounded-xl border p-5 ${
                        tenant.is_trial_expired
                            ? 'border-destructive/30 bg-destructive/5'
                            : tenant.is_on_trial
                              ? 'border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/40'
                              : 'border-primary/20 bg-primary/5'
                    }`}
                >
                    <div className="flex items-start gap-3">
                        <div
                            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                                tenant.is_trial_expired
                                    ? 'bg-destructive/10 text-destructive'
                                    : tenant.is_on_trial
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                      : 'bg-primary/10 text-primary'
                            }`}
                        >
                            {tenant.is_trial_expired ? (
                                <AlertTriangle className="size-5" />
                            ) : tenant.is_on_trial ? (
                                <Clock className="size-5" />
                            ) : (
                                <Check className="size-5" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="font-semibold text-foreground">
                                    Plano {tenant.plan_name}
                                </h2>
                                <Badge
                                    variant={
                                        tenant.is_trial_expired
                                            ? 'destructive'
                                            : tenant.is_on_trial
                                              ? 'outline'
                                              : 'default'
                                    }
                                >
                                    {tenant.is_trial_expired
                                        ? 'Expirado'
                                        : tenant.is_on_trial
                                          ? 'Período de teste'
                                          : 'Ativo'}
                                </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {tenant.is_trial_expired
                                    ? 'Seu período de teste terminou. Escolha um plano abaixo para continuar.'
                                    : tenant.is_on_trial
                                      ? `Seu teste vai até ${trialEnd}. Faltam ${tenant.trial_days_left} dias.`
                                      : `${tenant.seats_in_use} de ${tenant.seat_limit} usuários em uso.`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Profile incomplete warning */}
                {!tenant.profile_complete && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/60 dark:bg-amber-950/40">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-amber-900 dark:text-amber-100">
                                <strong>Complete o cadastro da clínica</strong>{' '}
                                antes de solicitar um plano.
                            </p>
                            <Link
                                href="/settings/organization"
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-semibold text-amber-50 hover:bg-amber-800"
                            >
                                Completar agora
                                <ArrowRight className="size-3.5" />
                            </Link>
                        </div>
                    </div>
                )}

                {/* Pending plan request */}
                {tenant.has_pending_plan_request && (
                    <div className="rounded-xl border border-secondary-foreground/20 bg-secondary/40 p-4">
                        <div className="flex items-start gap-3">
                            <Check className="mt-0.5 size-5 shrink-0 text-secondary-foreground" />
                            <p className="text-sm text-foreground">
                                <strong>Solicitação em análise.</strong> Plano{' '}
                                <strong className="capitalize">
                                    {tenant.requested_plan}
                                </strong>
                                {tenant.requested_extra_users > 0
                                    ? ` com ${tenant.requested_extra_users} usuários adicionais`
                                    : ''}
                                {requestedAt ? ` em ${requestedAt}` : ''}. Nossa
                                equipe entrará em contato para concluir.
                            </p>
                        </div>
                    </div>
                )}

                {/* Plan Selection */}
                <form onSubmit={submit} className="space-y-6">
                    <div className="space-y-4 rounded-xl border border-border bg-card p-6">
                        <Heading
                            variant="small"
                            title="Escolha seu plano"
                            description="Todos os planos dão acesso ao sistema completo. O que muda é a quantidade de usuários e armazenamento."
                        />

                        <div className="grid gap-3 sm:grid-cols-3">
                            {plans.map((plan) => {
                                const active =
                                    data.requested_plan === plan.key;
                                const current = tenant.plan === plan.key;

                                return (
                                    <button
                                        key={plan.key}
                                        type="button"
                                        onClick={() =>
                                            setData(
                                                'requested_plan',
                                                plan.key,
                                            )
                                        }
                                        className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
                                            active
                                                ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                                                : 'border-border hover:border-primary/40'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-sm font-bold text-foreground">
                                                {plan.name}
                                            </h3>
                                            <span
                                                className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                                                    active
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : 'border-border'
                                                }`}
                                            >
                                                {active && (
                                                    <Check className="size-2.5" />
                                                )}
                                            </span>
                                        </div>

                                        {current && (
                                            <span className="mt-1.5 w-fit rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                                                Plano atual
                                            </span>
                                        )}

                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {plan.tagline}
                                        </p>

                                        <p className="mt-3 text-lg font-bold text-foreground">
                                            {plan.price === null ? (
                                                <span className="text-sm font-semibold text-muted-foreground">
                                                    Sob consulta
                                                </span>
                                            ) : (
                                                <>
                                                    {money(plan.price)}
                                                    <span className="text-xs font-normal text-muted-foreground">
                                                        /mês
                                                    </span>
                                                </>
                                            )}
                                        </p>

                                        <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                                            <li className="flex items-center gap-1.5 text-xs text-foreground">
                                                <Users className="size-3.5 shrink-0 text-primary" />
                                                <strong>
                                                    {plan.users} usuários
                                                </strong>
                                            </li>
                                            <li className="flex items-center gap-1.5 text-xs text-foreground">
                                                <HardDrive className="size-3.5 shrink-0 text-primary" />
                                                {storage(plan.storage_mb)}
                                            </li>
                                        </ul>
                                    </button>
                                );
                            })}
                        </div>
                        <InputError
                            message={errors.requested_plan}
                            className="mt-1"
                        />

                        {/* Extra seats */}
                        {selected?.allows_extra_users && (
                            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground">
                                            Usuários adicionais
                                        </h4>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            O plano {selected.name} inclui{' '}
                                            {selected.users} usuários. Cada
                                            extra custa{' '}
                                            {money(extraUserPrice)}/mês.
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="size-8"
                                            disabled={extras <= 0}
                                            onClick={() =>
                                                setExtras(extras - 1)
                                            }
                                            aria-label="Remover um usuário adicional"
                                        >
                                            <Minus className="size-3.5" />
                                        </Button>
                                        <span className="w-8 text-center text-sm font-semibold text-foreground">
                                            {extras}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="size-8"
                                            disabled={
                                                extras >= maxExtraUsers
                                            }
                                            onClick={() =>
                                                setExtras(extras + 1)
                                            }
                                            aria-label="Adicionar um usuário adicional"
                                        >
                                            <Plus className="size-3.5" />
                                        </Button>
                                    </div>
                                </div>
                                <InputError
                                    message={errors.requested_extra_users}
                                    className="mt-2"
                                />

                                <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
                                    <p className="text-xs text-muted-foreground">
                                        Total de{' '}
                                        <strong className="text-foreground">
                                            {totalSeats} usuários
                                        </strong>{' '}
                                        · {tenant.seats_in_use} em uso hoje
                                    </p>
                                    <div className="text-right">
                                        <p className="text-[10px] text-muted-foreground">
                                            Total mensal estimado
                                        </p>
                                        <p className="text-base font-bold text-foreground">
                                            {monthlyTotal === null ? (
                                                <span className="text-sm text-muted-foreground">
                                                    Sob consulta
                                                    {extras > 0
                                                        ? ` + ${money(extrasCost)}`
                                                        : ''}
                                                </span>
                                            ) : (
                                                money(monthlyTotal)
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="mt-4 grid gap-2">
                            <Label htmlFor="plan_request_notes">
                                Observações{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opcional)
                                </span>
                            </Label>
                            <textarea
                                id="plan_request_notes"
                                value={data.plan_request_notes}
                                onChange={(e) =>
                                    setData(
                                        'plan_request_notes',
                                        e.target.value,
                                    )
                                }
                                rows={2}
                                maxLength={2000}
                                placeholder="Melhor horário para contato, forma de pagamento preferida..."
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            />
                            <InputError
                                message={errors.plan_request_notes}
                            />
                        </div>

                        {/* Submit */}
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Button
                                type="submit"
                                disabled={processing}
                                className="gap-2"
                            >
                                {processing && (
                                    <Spinner className="mr-1" />
                                )}
                                {tenant.has_pending_plan_request
                                    ? 'Atualizar solicitação'
                                    : 'Solicitar plano'}
                                <ArrowRight className="size-4" />
                            </Button>

                            {contactEmail && (
                                <a
                                    href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Contratação de plano - ${tenant.name}`)}`}
                                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                                >
                                    <Mail className="size-4" />
                                    Falar com a equipe
                                </a>
                            )}
                        </div>
                    </div>
                </form>

                {/* All plans include */}
                <div className="rounded-xl border border-border bg-muted/30 p-5">
                    <h3 className="text-sm font-semibold text-foreground">
                        Todos os planos incluem
                    </h3>
                    <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                        {includedFeatures.map((feature) => (
                            <li
                                key={feature}
                                className="flex items-start gap-1.5 text-xs text-foreground/90"
                            >
                                <Check className="mt-0.5 size-3.5 shrink-0 text-secondary-foreground" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Payment History */}
                <div className="space-y-4 rounded-xl border border-border bg-card p-6">
                    <Heading
                        variant="small"
                        title="Histórico de pagamentos"
                        description="Pagamentos registrados pela equipe."
                    />

                    {payments.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                                <Receipt className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    Nenhum pagamento registrado
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Os pagamentos aparecerão aqui assim que
                                    forem registrados.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Período</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Valor</TableHead>
                                        <TableHead>Método</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="w-10" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.data.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell className="font-medium">
                                                {formatPeriod(
                                                    payment.reference_period,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-foreground">
                                                    {payment.description}
                                                </span>
                                                {payment.notes && (
                                                    <span className="ml-1.5 text-muted-foreground">
                                                        · {payment.notes}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-semibold text-foreground">
                                                {money(payment.amount)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {methodLabels[
                                                        payment.method
                                                    ] ?? payment.method}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {formatShortDate(
                                                    payment.paid_at,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {payment.receipt_url && (
                                                    <a
                                                        href={
                                                            payment.receipt_url
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center text-muted-foreground hover:text-foreground"
                                                        title="Ver comprovante"
                                                    >
                                                        <Download className="size-4" />
                                                    </a>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <Pagination
                                links={payments.links}
                                from={payments.from}
                                to={payments.to}
                                total={payments.total}
                            />
                        </>
                    )}
                </div>
            </div>

            <Toaster
                position="top-right"
                richColors
                closeButton
                theme="system"
            />
        </AppLayout>
    );
}
