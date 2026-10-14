import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Edit,
    Trash2,
    User,
    Tag,
    Calendar as CalendarIcon,
    DollarSign,
    Clock,
    Pause,
    Play,
    Repeat,
} from 'lucide-react';
import { useState } from 'react';
import { useConfirmModal } from '@/components/confirm-modal';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import {
    billingCycleLabel,
    CHARGE_STATUS,
    formatBRL,
    formatDateBR,
    MEMBERSHIP_STATUS,
} from '@/lib/billing';
import type { ChargeStatus } from '@/lib/billing';
import type { BreadcrumbItem } from '@/types';
import { MembershipFormSheet } from './membership-form-sheet';

export default function MembershipShow({
    membership,
    patients = [],
    commercialPlans = [],
}: {
    membership: any;
    patients?: any[];
    commercialPlans?: any[];
}) {
    const planName = membership.commercial_plan?.name || membership.plan_name;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Matrículas', href: '/memberships' },
        {
            title: planName || 'Detalhes da Matrícula',
            href: `/memberships/${membership.id}`,
        },
    ];

    const { can } = usePermissions();
    const { confirm, modal } = useConfirmModal();
    const [editOpen, setEditOpen] = useState(false);
    const [pauseOpen, setPauseOpen] = useState(false);
    const [pausedUntil, setPausedUntil] = useState('');
    const [pausesClasses, setPausesClasses] = useState(true);
    const [pauseError, setPauseError] = useState<string | null>(null);

    function pause() {
        router.post(
            `/memberships/${membership.id}/pause`,
            {
                paused_until: pausedUntil || null,
                pauses_classes: pausesClasses,
            },
            {
                preserveScroll: true,
                onSuccess: () => setPauseOpen(false),
                onError: (errors) =>
                    setPauseError(
                        errors.paused_until ?? 'Não foi possível pausar.',
                    ),
            },
        );
    }

    async function resume() {
        const confirmed = await confirm({
            title: 'Retomar matrícula',
            message:
                'As cobranças voltam a partir do próximo vencimento e as aulas do horário fixo voltam para a agenda.',
            confirmLabel: 'Retomar',
            variant: 'warning',
        });

        if (confirmed) {
            router.post(
                `/memberships/${membership.id}/resume`,
                {},
                { preserveScroll: true },
            );
        }
    }

    async function handleRenew() {
        const confirmed = await confirm({
            title: 'Renovar Matrícula',
            message:
                'Isso criará uma nova matrícula a partir do fim da atual e gerará uma nova cobrança. Deseja continuar?',
            confirmLabel: 'Renovar',
            variant: 'warning',
        });
        if (confirmed) router.post(`/memberships/${membership.id}/renew`);
    }

    async function handleDelete() {
        const confirmed = await confirm({
            title: 'Excluir Matrícula',
            message:
                'Tem certeza que deseja excluir esta matrícula? Esta ação não pode ser desfeita.',
            confirmLabel: 'Excluir',
        });
        if (confirmed) router.delete(`/memberships/${membership.id}`);
    }

    const getStatusBadge = (status: string) => {
        const badge = MEMBERSHIP_STATUS[status];

        return badge ? (
            <span
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${badge.className}`}
            >
                {badge.label}
            </span>
        ) : null;
    };

    const daysRemaining = () => {
        if (!membership.end_date) return null;

        const end = new Date(membership.end_date);
        const now = new Date();
        const diff = Math.ceil(
            (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        return diff;
    };

    const days = daysRemaining();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${planName} - Phisio`} />
            {modal}

            <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col gap-6 p-6 md:p-10">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/memberships"
                            className="rounded-xl border border-border bg-card p-2 transition-colors hover:bg-muted"
                        >
                            <ArrowLeft className="size-5 text-muted-foreground" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                {planName}
                            </h1>
                            <p className="mt-1 text-muted-foreground">
                                Detalhes da matrícula
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {can('memberships.manage.edit') &&
                            membership.status === 'active' && (
                                <button
                                    onClick={() => {
                                        setPauseError(null);
                                        setPauseOpen(true);
                                    }}
                                    className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                                >
                                    <Pause className="size-4" />
                                    Pausar
                                </button>
                            )}
                        {can('memberships.manage.edit') &&
                            membership.status === 'paused' && (
                                <button
                                    onClick={resume}
                                    className="flex h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 font-medium text-white shadow-sm transition-colors hover:bg-sky-700"
                                >
                                    <Play className="size-4" />
                                    Retomar
                                </button>
                            )}
                        {can('memberships.manage.create') &&
                            membership.end_date && (
                                <button
                                    onClick={handleRenew}
                                    className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
                                >
                                    <CalendarIcon className="size-4" />
                                    Renovar
                                </button>
                            )}
                        {can('memberships.manage.edit') && (
                            <button
                                onClick={() => setEditOpen(true)}
                                className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                            >
                                <Edit className="size-4" />
                                Editar
                            </button>
                        )}
                        {can('memberships.manage.delete') && (
                            <button
                                onClick={handleDelete}
                                className="flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 font-medium text-white shadow-sm transition-colors hover:bg-red-700"
                            >
                                <Trash2 className="size-4" />
                                Excluir
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
                    >
                        <div className="mb-3 flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                                <DollarSign className="size-5 text-primary" />
                            </div>
                            <span className="text-sm text-muted-foreground">
                                Valor
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            R${' '}
                            {parseFloat(membership.price)
                                .toFixed(2)
                                .replace('.', ',')}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
                    >
                        <div className="mb-3 flex items-center gap-3">
                            <div className="rounded-lg bg-blue-500/10 p-2">
                                <Clock className="size-5 text-blue-500" />
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {days === null ? 'Vigência' : 'Dias Restantes'}
                            </span>
                        </div>
                        {days === null ? (
                            <p className="text-2xl font-bold text-foreground">
                                Contínua
                            </p>
                        ) : (
                            <p
                                className={`text-2xl font-bold ${days > 7 ? 'text-foreground' : days > 0 ? 'text-amber-500' : 'text-red-500'}`}
                            >
                                {days > 0
                                    ? `${days} dias`
                                    : days === 0
                                      ? 'Vence hoje'
                                      : 'Vencida'}
                            </p>
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
                    >
                        <div className="mb-3 flex items-center gap-3">
                            <div className="rounded-lg bg-purple-500/10 p-2">
                                <Tag className="size-5 text-purple-500" />
                            </div>
                            <span className="text-sm text-muted-foreground">
                                Status
                            </span>
                        </div>
                        <div className="mt-1">
                            {getStatusBadge(membership.status)}
                        </div>
                        {membership.status === 'paused' && (
                            <p className="mt-2 text-xs text-muted-foreground">
                                {membership.paused_until
                                    ? `Retorna em ${formatDateBR(membership.paused_until)}`
                                    : 'Sem data de retorno'}
                                {membership.pauses_classes &&
                                    ' · aulas pausadas'}
                            </p>
                        )}
                    </motion.div>
                </div>

                {membership.monthly_allowance != null && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.32 }}
                        className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Aulas neste mês
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                                {membership.sessions_used_this_month} de{' '}
                                {membership.monthly_allowance}
                                {membership.sessions_remaining_this_month ===
                                    0 && (
                                    <span className="ml-2 font-bold text-amber-500">
                                        • Cota atingida
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full rounded-full transition-all ${membership.sessions_remaining_this_month === 0 ? 'bg-amber-500' : 'bg-primary'}`}
                                style={{
                                    width: `${Math.min(100, (membership.sessions_used_this_month / membership.monthly_allowance) * 100)}%`,
                                }}
                            />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {membership.sessions_remaining_this_month} aula(s)
                            restante(s) na cota do mês (presenças + faltas não
                            justificadas). Reposição além da cota é aula extra.
                        </p>
                    </motion.div>
                )}

                {membership.sessions_total != null && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Sessões utilizadas
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                                {membership.sessions_used} de{' '}
                                {membership.sessions_total}
                                {membership.sessions_remaining === 0 && (
                                    <span className="ml-2 font-bold text-red-500">
                                        • Esgotado
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full rounded-full transition-all ${membership.sessions_remaining === 0 ? 'bg-red-500' : 'bg-primary'}`}
                                style={{
                                    width: `${Math.min(100, (membership.sessions_used / membership.sessions_total) * 100)}%`,
                                }}
                            />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {membership.sessions_remaining} sessão(ões)
                            restante(s) na vigência.
                        </p>
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl md:p-8"
                >
                    <h2 className="mb-6 text-lg font-semibold text-foreground">
                        Informações da Matrícula
                    </h2>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">
                                Aluno
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="rounded-md bg-primary/10 p-1.5">
                                    <User className="size-4 text-primary" />
                                </div>
                                {membership.patient ? (
                                    <Link
                                        href={`/patients/${membership.patient.id}`}
                                        className="font-medium text-foreground transition-colors hover:text-primary"
                                    >
                                        {membership.patient.name}
                                    </Link>
                                ) : (
                                    <span className="font-medium text-muted-foreground">
                                        —
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">
                                Plano
                            </label>
                            <div className="flex items-center gap-2">
                                <Tag className="size-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">
                                    {planName}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">
                                Início
                            </label>
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="size-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">
                                    {new Date(
                                        membership.start_date,
                                    ).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">
                                Fim do plano
                            </label>
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="size-4 text-muted-foreground" />
                                {days === null ? (
                                    <span className="font-medium text-foreground">
                                        Contínua (sem data de fim)
                                    </span>
                                ) : (
                                    <span
                                        className={`font-medium ${days <= 7 && days >= 0 ? 'text-amber-500' : days < 0 ? 'text-red-500' : 'text-foreground'}`}
                                    >
                                        {formatDateBR(membership.end_date)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">
                                Valor
                            </label>
                            <div className="flex items-center gap-2">
                                <DollarSign className="size-4 text-muted-foreground" />
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                    {formatBRL(membership.price)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">
                                Cobrança
                            </label>
                            <div className="flex items-center gap-2">
                                <Repeat className="size-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">
                                    {billingCycleLabel(
                                        membership.billing_cycle,
                                    )}
                                    {membership.billing_cycle &&
                                        membership.next_billing_date &&
                                        membership.status === 'active' &&
                                        ` · próxima em ${formatDateBR(membership.next_billing_date)}`}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">
                                Status
                            </label>
                            <div>{getStatusBadge(membership.status)}</div>
                        </div>
                    </div>
                </motion.div>

                {membership.financial_transactions?.length > 0 && (
                    <div className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl">
                        <h2 className="mb-4 text-lg font-semibold text-foreground">
                            Cobranças
                        </h2>
                        <ul className="divide-y divide-border/50">
                            {membership.financial_transactions.map(
                                (charge: any) => {
                                    const status =
                                        CHARGE_STATUS[
                                            charge.status as ChargeStatus
                                        ];

                                    return (
                                        <li
                                            key={charge.id}
                                            className="flex items-center justify-between gap-3 py-2.5 text-sm"
                                        >
                                            <span className="text-muted-foreground">
                                                Vence{' '}
                                                {formatDateBR(
                                                    charge.due_date ??
                                                        charge.date,
                                                )}
                                            </span>
                                            <span className="font-medium">
                                                {formatBRL(charge.amount)}
                                            </span>
                                            {status && (
                                                <span
                                                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${status.className}`}
                                                >
                                                    {status.label}
                                                </span>
                                            )}
                                        </li>
                                    );
                                },
                            )}
                        </ul>
                    </div>
                )}
            </div>

            <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Pausar matrícula</DialogTitle>
                        <DialogDescription>
                            Enquanto pausada, nenhuma cobrança é gerada. Na
                            volta, os ciclos da pausa são pulados e o fim do
                            plano é adiado pelos dias parados.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="paused-until">
                                Retorna em (opcional)
                            </Label>
                            <Input
                                id="paused-until"
                                type="date"
                                value={pausedUntil}
                                onChange={(e) => setPausedUntil(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Sem data, a matrícula fica pausada até você
                                retomar.
                            </p>
                            {pauseError && (
                                <p className="text-sm text-red-500">
                                    {pauseError}
                                </p>
                            )}
                        </div>
                        <label className="flex cursor-pointer items-start gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={pausesClasses}
                                onChange={(e) =>
                                    setPausesClasses(e.target.checked)
                                }
                                className="mt-0.5 size-4 accent-primary"
                            />
                            Pausar também as aulas do horário fixo (liberam a
                            vaga na agenda durante a pausa)
                        </label>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setPauseOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={pause}>
                            <Pause className="size-4" />
                            Pausar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {can('memberships.manage.edit') && (
                <MembershipFormSheet
                    isOpen={editOpen}
                    setIsOpen={setEditOpen}
                    patients={patients}
                    commercialPlans={commercialPlans}
                    editingMembership={membership}
                />
            )}
        </AppLayout>
    );
}
