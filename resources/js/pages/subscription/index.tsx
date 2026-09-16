import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Check,
    Clock,
    HardDrive,
    LogOut,
    Mail,
    Minus,
    Plus,
    Sparkles,
    Users,
} from 'lucide-react';
import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

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

type Props = {
    tenant: TenantInfo;
    plans: Plan[];
    includedFeatures: string[];
    extraUserPrice: number;
    maxExtraUsers: number;
    contactEmail: string | null;
    canManage: boolean;
};

const money = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

export default function SubscriptionIndex({
    tenant,
    plans,
    includedFeatures,
    extraUserPrice,
    maxExtraUsers,
    contactEmail,
    canManage,
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

    const expired = tenant.is_trial_expired;
    const trialEnd = formatDate(tenant.trial_ends_at);
    const requestedAt = formatDate(tenant.plan_requested_at);

    const setExtras = (value: number) =>
        setData(
            'requested_extra_users',
            Math.min(maxExtraUsers, Math.max(0, value)),
        );

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        post('/assinatura/solicitar', { preserveScroll: true });
    };

    return (
        <div className="min-h-svh bg-background">
            <Head title="Assinatura - Phisio" />

            <header className="border-b border-border">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary-foreground text-primary-foreground">
                            <Sparkles className="size-4" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                {tenant.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Plano {tenant.plan_name} · {tenant.seats_in_use}
                                /{tenant.seat_limit} usuários
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!expired && (
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/dashboard">Voltar ao sistema</Link>
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.post('/logout')}
                            className="gap-1.5"
                        >
                            <LogOut className="size-4" />
                            Sair
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-6 py-10">
                <div
                    className={`mb-8 rounded-2xl border p-6 ${
                        expired
                            ? 'border-destructive/30 bg-destructive/5'
                            : 'border-primary/20 bg-primary/5'
                    }`}
                >
                    <div className="flex items-start gap-4">
                        <div
                            className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                                expired
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-primary/10 text-primary'
                            }`}
                        >
                            {expired ? (
                                <AlertTriangle className="size-5" />
                            ) : (
                                <Clock className="size-5" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                                {expired
                                    ? 'Seu período de teste terminou'
                                    : tenant.is_on_trial
                                      ? `Faltam ${tenant.trial_days_left} dias de teste`
                                      : `Plano ${tenant.plan_name} ativo`}
                            </h1>
                            <p className="mt-1.5 text-muted-foreground">
                                {expired
                                    ? 'O acesso ao sistema está pausado, mas seus dados continuam salvos. Escolha um plano abaixo para retomar de onde parou.'
                                    : tenant.is_on_trial
                                      ? `Seu teste vai até ${trialEnd}. Escolha um plano quando quiser, sem perder nada do que já cadastrou.`
                                      : 'Precisa de mais usuários ou de outro plano? Faça a solicitação abaixo.'}
                            </p>
                        </div>
                    </div>
                </div>

                {!tenant.profile_complete && canManage && (
                    <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700/60 dark:bg-amber-950/40">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-amber-900 dark:text-amber-100">
                                <strong>Complete o cadastro da clínica</strong>{' '}
                                antes de contratar um plano. Precisamos dos
                                dados para emitir a nota fiscal.
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

                {tenant.has_pending_plan_request && (
                    <div className="mb-8 rounded-2xl border border-secondary-foreground/20 bg-secondary/40 p-5">
                        <div className="flex items-start gap-3">
                            <Check className="mt-0.5 size-5 shrink-0 text-secondary-foreground" />
                            <p className="text-sm text-foreground">
                                <strong>Solicitação em análise.</strong> Você
                                pediu o plano{' '}
                                <strong className="capitalize">
                                    {tenant.requested_plan}
                                </strong>
                                {tenant.requested_extra_users > 0
                                    ? ` com ${tenant.requested_extra_users} usuários adicionais`
                                    : ''}
                                {requestedAt ? ` em ${requestedAt}` : ''}. Nossa
                                equipe entrará em contato para concluir a
                                ativação.
                            </p>
                        </div>
                    </div>
                )}

                <h2 className="mb-1 text-lg font-semibold text-foreground">
                    Escolha seu plano
                </h2>
                <p className="mb-6 text-sm text-muted-foreground">
                    Todos os planos dão acesso ao sistema completo. O que muda é
                    quantos usuários e quanto armazenamento cabem. A ativação é
                    feita pela nossa equipe após o contato.
                </p>

                <form onSubmit={submit}>
                    <div className="grid gap-4 lg:grid-cols-3">
                        {plans.map((plan) => {
                            const active = data.requested_plan === plan.key;
                            const current = tenant.plan === plan.key;

                            return (
                                <button
                                    key={plan.key}
                                    type="button"
                                    onClick={() =>
                                        setData('requested_plan', plan.key)
                                    }
                                    disabled={!canManage}
                                    className={`flex flex-col rounded-2xl border p-6 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                                        active
                                            ? 'border-primary bg-card shadow-md ring-2 ring-primary/20'
                                            : 'border-border bg-card hover:border-primary/40'
                                    }`}
                                >
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <h3 className="text-base font-bold text-foreground">
                                            {plan.name}
                                        </h3>
                                        <span
                                            className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                                                active
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border'
                                            }`}
                                        >
                                            {active && (
                                                <Check className="size-3" />
                                            )}
                                        </span>
                                    </div>

                                    {current && (
                                        <span className="mb-2 w-fit rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                                            Plano atual
                                        </span>
                                    )}

                                    <p className="mb-4 text-sm text-muted-foreground">
                                        {plan.tagline}
                                    </p>

                                    <p className="mb-4 text-2xl font-bold text-foreground">
                                        {plan.price === null ? (
                                            <span className="text-base font-semibold text-muted-foreground">
                                                Sob consulta
                                            </span>
                                        ) : (
                                            <>
                                                {money(plan.price)}
                                                <span className="text-sm font-normal text-muted-foreground">
                                                    /mês
                                                </span>
                                            </>
                                        )}
                                    </p>

                                    <ul className="space-y-2.5 border-t border-border pt-4">
                                        <li className="flex items-center gap-2 text-sm text-foreground">
                                            <Users className="size-4 shrink-0 text-primary" />
                                            <span>
                                                <strong>
                                                    {plan.users} usuários
                                                </strong>{' '}
                                                incluídos
                                            </span>
                                        </li>
                                        <li className="flex items-center gap-2 text-sm text-foreground">
                                            <HardDrive className="size-4 shrink-0 text-primary" />
                                            <span>
                                                <strong>
                                                    {storage(plan.storage_mb)}
                                                </strong>{' '}
                                                de armazenamento
                                            </span>
                                        </li>
                                        <li className="flex items-center gap-2 text-sm text-foreground">
                                            <Check className="size-4 shrink-0 text-secondary-foreground" />
                                            Sistema completo, sem recurso
                                            bloqueado
                                        </li>
                                        {plan.allows_extra_users && (
                                            <li className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Plus className="size-4 shrink-0" />
                                                Usuários extras por{' '}
                                                {money(extraUserPrice)}/mês
                                            </li>
                                        )}
                                    </ul>
                                </button>
                            );
                        })}
                    </div>
                    <InputError
                        message={errors.requested_plan}
                        className="mt-2"
                    />

                    <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-6">
                        <h3 className="font-semibold text-foreground">
                            Todos os planos incluem
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Nenhum recurso fica preso a um plano mais caro.
                        </p>
                        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                            {includedFeatures.map((feature) => (
                                <li
                                    key={feature}
                                    className="flex items-start gap-2 text-sm text-foreground/90"
                                >
                                    <Check className="mt-0.5 size-4 shrink-0 text-secondary-foreground" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Extra seats */}
                    {selected?.allows_extra_users && (
                        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-semibold text-foreground">
                                        Usuários adicionais
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        O plano {selected.name} inclui{' '}
                                        {selected.users} usuários. Cada usuário
                                        a mais custa {money(extraUserPrice)} por
                                        mês.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        disabled={!canManage || extras <= 0}
                                        onClick={() => setExtras(extras - 1)}
                                        aria-label="Remover um usuário adicional"
                                    >
                                        <Minus className="size-4" />
                                    </Button>
                                    <span className="w-10 text-center text-lg font-semibold text-foreground">
                                        {extras}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        disabled={
                                            !canManage ||
                                            extras >= maxExtraUsers
                                        }
                                        onClick={() => setExtras(extras + 1)}
                                        aria-label="Adicionar um usuário adicional"
                                    >
                                        <Plus className="size-4" />
                                    </Button>
                                </div>
                            </div>
                            <InputError
                                message={errors.requested_extra_users}
                                className="mt-2"
                            />

                            <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-5">
                                <div className="text-sm text-muted-foreground">
                                    Total de{' '}
                                    <strong className="text-foreground">
                                        {totalSeats} usuários
                                    </strong>{' '}
                                    · sua equipe usa {tenant.seats_in_use} hoje
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground">
                                        Total mensal estimado
                                    </p>
                                    <p className="text-xl font-bold text-foreground">
                                        {monthlyTotal === null ? (
                                            <span className="text-base text-muted-foreground">
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

                    <div className="mt-6 grid gap-2">
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
                                setData('plan_request_notes', e.target.value)
                            }
                            disabled={!canManage}
                            rows={3}
                            maxLength={2000}
                            placeholder="Melhor horário para contato, forma de pagamento preferida, dúvidas..."
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
                        />
                        <InputError message={errors.plan_request_notes} />
                    </div>

                    {canManage ? (
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Button
                                type="submit"
                                disabled={processing}
                                className="gap-2"
                            >
                                {processing && <Spinner className="mr-1" />}
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
                    ) : (
                        <p className="mt-6 rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                            Somente um administrador da organização pode
                            solicitar a contratação do plano. Fale com quem
                            administra a conta de {tenant.name}.
                        </p>
                    )}
                </form>
            </main>

            <Toaster
                position="top-right"
                richColors
                closeButton
                theme="system"
            />
        </div>
    );
}
