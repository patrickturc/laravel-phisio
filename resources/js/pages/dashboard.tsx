import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Users,
    Calendar,
    FileText,
    Clock,
    Plus,
    ChevronRight,
    ChevronLeft,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    CreditCard,
    BarChart3,
    CalendarDays,
    AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
];

interface DayAppointment {
    id: string;
    appointment_date: string;
    start_time: string;
    duration_minutes: number;
    status: string;
    type: string;
    title: string;
    patients: Array<{ id: string; name: string; type: string }>;
}

interface WeekDay {
    date: string;
    dayName: string;
    dayNumber: number;
    isToday: boolean;
    isSelected: boolean;
}

interface UpcomingBirthday {
    id: string;
    name: string;
    birthdate: string;
    isToday: boolean;
    daysToBirthday: number;
    age_turning: number;
}

interface Props {
    totalPatients: number;
    dayAppointments: DayAppointment[];
    dayCount: number;
    pendingEvolutions: number;
    selectedDate: string;
    weekDays: WeekDay[];
    weekLabel: string;
    upcomingBirthdays: UpcomingBirthday[];
    financialSummary: {
        income: number;
        expense: number;
        pending_income: number;
        pending_expense: number;
    };
    growthIndicators: {
        newPatients: { current: number; change: number };
        revenue: { current: number; change: number };
        completionRate: { current: number; change: number };
        activeMemberships: { current: number; expiring: number };
    };
    classesNeedingExtension: Array<{
        id: string;
        name: string;
        color: string | null;
        last_appointment_date: string | null;
    }>;
}

function navigateToDate(date: string) {
    router.get(
        '/dashboard',
        { date },
        { preserveState: true, preserveScroll: true },
    );
}

function shiftWeek(currentDate: string, direction: number) {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + direction * 7);
    navigateToDate(d.toISOString().split('T')[0]);
}

export default function Dashboard({
    totalPatients,
    dayAppointments,
    dayCount,
    pendingEvolutions,
    selectedDate,
    weekDays,
    weekLabel,
    upcomingBirthdays,
    financialSummary,
    growthIndicators,
    classesNeedingExtension = [],
}: Props) {
    const { can } = usePermissions();
    const statusLabel: Record<string, string> = {
        scheduled: 'Agendado',
        completed: 'Realizado',
        cancelled: 'Cancelado',
    };
    const statusColor: Record<string, string> = {
        scheduled: 'bg-blue-100 text-blue-700',
        completed: 'bg-emerald-100 text-emerald-700',
        cancelled: 'bg-red-100 text-red-700',
    };

    const [isExtending, setIsExtending] = useState(false);

    function extendClasses() {
        setIsExtending(true);
        router.post(
            '/group-classes/extend-active',
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsExtending(false),
            },
        );
    }

    const formatCurrency = (val: number) => {
        return Number(val).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
    };

    const selectedDayFormatted = new Date(
        selectedDate + 'T12:00:00',
    ).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 md:p-10">
                {/* Welcome */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Bom dia! 👋
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Aqui está o resumo do seu dia.
                    </p>
                </div>

                {/* Classes running out of generated appointments */}
                {classesNeedingExtension.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10"
                    >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                            <div className="flex items-start gap-3">
                                <div className="shrink-0 rounded-xl bg-amber-500/15 p-2.5">
                                    <AlertTriangle className="size-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                                        {classesNeedingExtension.length}{' '}
                                        turma(s) com aulas acabando
                                    </h3>
                                    <p className="mt-0.5 text-sm text-amber-700/80 dark:text-amber-400/80">
                                        Gere as próximas aulas para não ficar
                                        sem agenda. Clique para estender por
                                        mais 8 semanas.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {classesNeedingExtension.map((gc) => (
                                            <Link
                                                key={gc.id}
                                                href={`/group-classes/${gc.id}`}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white/60 px-2.5 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-white dark:border-amber-500/20 dark:bg-black/20 dark:text-amber-300"
                                            >
                                                <span
                                                    className="size-2 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            gc.color ||
                                                            '#8b5cf6',
                                                    }}
                                                />
                                                {gc.name}
                                                <span className="text-amber-600/70">
                                                    {gc.last_appointment_date
                                                        ? `até ${new Date(gc.last_appointment_date + 'T12:00:00').toLocaleDateString('pt-BR')}`
                                                        : 'sem aulas'}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {can('group_classes.manage.edit') && (
                                <button
                                    onClick={extendClasses}
                                    disabled={isExtending}
                                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700 disabled:opacity-60"
                                >
                                    <CalendarDays className="size-4" />
                                    {isExtending
                                        ? 'Gerando...'
                                        : 'Estender todas as turmas'}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-md"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <div className="rounded-xl bg-primary/10 p-2.5">
                                <Users className="size-5 text-primary" />
                            </div>
                            <Link
                                href="/patients"
                                className="text-xs font-semibold text-primary hover:text-primary/80"
                            >
                                Ver todos →
                            </Link>
                        </div>
                        <p className="text-3xl font-bold">{totalPatients}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Pacientes cadastrados
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-md"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <div className="rounded-xl bg-emerald-500/10 p-2.5">
                                <Calendar className="size-5 text-emerald-600" />
                            </div>
                            <Link
                                href="/appointments"
                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-500"
                            >
                                Ver agenda →
                            </Link>
                        </div>
                        <p className="text-3xl font-bold">{dayCount}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Sessões neste dia
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-md"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <div className="rounded-xl bg-amber-500/10 p-2.5">
                                <FileText className="size-5 text-amber-600" />
                            </div>
                            <Link
                                href="/evolutions"
                                className="text-xs font-semibold text-amber-600 hover:text-amber-500"
                            >
                                Ver todas →
                            </Link>
                        </div>
                        <p className="text-3xl font-bold">
                            {pendingEvolutions}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Evoluções pendentes
                        </p>
                    </motion.div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 }}
                        className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-md"
                    >
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent" />
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 font-semibold text-muted-foreground">
                                <span className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600">
                                    <TrendingUp className="size-4" />
                                </span>
                                Receitas do Mês
                            </h3>
                            <Link
                                href="/financial?type=income"
                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-500"
                            >
                                Fluxo de Caixa →
                            </Link>
                        </div>
                        <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(financialSummary.income)}
                        </p>
                        <p className="mt-1 line-clamp-1 max-w-[80%] text-xs text-muted-foreground">
                            +{formatCurrency(financialSummary.pending_income)}{' '}
                            previstos para receber
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14 }}
                        className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-md"
                    >
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent" />
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 font-semibold text-muted-foreground">
                                <span className="rounded-lg bg-red-500/10 p-1.5 text-red-600">
                                    <TrendingDown className="size-4" />
                                </span>
                                Despesas do Mês
                            </h3>
                            <Link
                                href="/financial?type=expense"
                                className="text-xs font-semibold text-red-600 hover:text-red-500"
                            >
                                Fluxo de Caixa →
                            </Link>
                        </div>
                        <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(financialSummary.expense)}
                        </p>
                        <p className="mt-1 line-clamp-1 max-w-[80%] text-xs text-muted-foreground">
                            +{formatCurrency(financialSummary.pending_expense)}{' '}
                            previstos para pagar
                        </p>
                    </motion.div>
                </div>

                {/* Growth Indicators */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16 }}
                    className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
                >
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-lg font-bold">
                            <BarChart3 className="size-5 text-primary" />
                            Indicadores de Crescimento
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            vs. mês anterior
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="rounded-xl border border-border/30 bg-muted/30 p-4">
                            <div className="mb-2 flex items-center gap-2">
                                <Users className="size-4 text-primary" />
                                <span className="text-xs text-muted-foreground">
                                    Novos Pacientes
                                </span>
                            </div>
                            <p className="text-2xl font-bold">
                                {growthIndicators.newPatients.current}
                            </p>
                            <div
                                className={`mt-1 flex items-center gap-1 text-xs font-semibold ${growthIndicators.newPatients.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                            >
                                {growthIndicators.newPatients.change >= 0 ? (
                                    <ArrowUpRight className="size-3" />
                                ) : (
                                    <ArrowDownRight className="size-3" />
                                )}
                                {Math.abs(growthIndicators.newPatients.change)}%
                            </div>
                        </div>
                        <div className="rounded-xl border border-border/30 bg-muted/30 p-4">
                            <div className="mb-2 flex items-center gap-2">
                                <TrendingUp className="size-4 text-emerald-600" />
                                <span className="text-xs text-muted-foreground">
                                    Receita
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(
                                    growthIndicators.revenue.current,
                                )}
                            </p>
                            <div
                                className={`mt-1 flex items-center gap-1 text-xs font-semibold ${growthIndicators.revenue.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                            >
                                {growthIndicators.revenue.change >= 0 ? (
                                    <ArrowUpRight className="size-3" />
                                ) : (
                                    <ArrowDownRight className="size-3" />
                                )}
                                {Math.abs(growthIndicators.revenue.change)}%
                            </div>
                        </div>
                        <div className="rounded-xl border border-border/30 bg-muted/30 p-4">
                            <div className="mb-2 flex items-center gap-2">
                                <Calendar className="size-4 text-blue-500" />
                                <span className="text-xs text-muted-foreground">
                                    Taxa Conclusão
                                </span>
                            </div>
                            <p className="text-2xl font-bold">
                                {growthIndicators.completionRate.current}%
                            </p>
                            <div
                                className={`mt-1 flex items-center gap-1 text-xs font-semibold ${growthIndicators.completionRate.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                            >
                                {growthIndicators.completionRate.change >= 0 ? (
                                    <ArrowUpRight className="size-3" />
                                ) : (
                                    <ArrowDownRight className="size-3" />
                                )}
                                {Math.abs(
                                    growthIndicators.completionRate.change,
                                )}
                                pp
                            </div>
                        </div>
                        <div className="rounded-xl border border-border/30 bg-muted/30 p-4">
                            <div className="mb-2 flex items-center gap-2">
                                <CreditCard className="size-4 text-purple-500" />
                                <span className="text-xs text-muted-foreground">
                                    Matrículas Ativas
                                </span>
                            </div>
                            <p className="text-2xl font-bold">
                                {growthIndicators.activeMemberships.current}
                            </p>
                            {growthIndicators.activeMemberships.expiring >
                                0 && (
                                <p className="mt-1 text-xs font-medium text-amber-500">
                                    ⚠{' '}
                                    {
                                        growthIndicators.activeMemberships
                                            .expiring
                                    }{' '}
                                    vencendo em breve
                                </p>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Weekly Agenda */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-sm backdrop-blur-xl"
                >
                    {/* Week Navigation Header */}
                    <div className="border-b border-border/30 px-6 pt-5 pb-4">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="flex items-center gap-2 text-lg font-bold">
                                <Clock className="size-5 text-primary" />
                                Agenda Semanal
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => shiftWeek(selectedDate, -1)}
                                    className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                <span className="text-center text-sm font-medium text-muted-foreground">
                                    {weekLabel}
                                </span>
                                <button
                                    onClick={() => shiftWeek(selectedDate, 1)}
                                    className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                                <Link
                                    href="/settings/profile"
                                    className="rounded-xl border border-border/50 p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                                    title="Sincronizar Agenda Externa"
                                >
                                    <CalendarDays className="size-4" />
                                </Link>
                            </div>
                            {can('appointments.manage.create') && (
                                <Link
                                    href="/appointments/create"
                                    className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
                                >
                                    <Plus className="size-4" /> Agendar
                                </Link>
                            )}
                        </div>

                        {/* Day Pills */}
                        <div className="-mx-2 flex snap-x gap-1.5 overflow-x-auto px-2 pb-2">
                            {weekDays.map((day) => (
                                <button
                                    key={day.date}
                                    onClick={() => navigateToDate(day.date)}
                                    className={`flex min-w-[2.75rem] flex-1 flex-shrink-0 cursor-pointer snap-start flex-col items-center rounded-xl border px-1 py-2.5 text-center transition-all ${
                                        day.isSelected
                                            ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                                            : day.isToday
                                              ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                                              : 'border-transparent bg-transparent text-muted-foreground hover:border-border/30 hover:bg-muted/40'
                                    }`}
                                >
                                    <span className="text-[10px] font-semibold tracking-wider uppercase">
                                        {day.dayName}
                                    </span>
                                    <span
                                        className={`mt-0.5 text-lg font-bold ${day.isSelected ? 'text-white' : ''}`}
                                    >
                                        {day.dayNumber}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selected Day Appointments */}
                    <div className="p-6">
                        <p className="mb-4 text-sm font-medium text-muted-foreground capitalize">
                            {selectedDayFormatted}
                        </p>

                        {dayAppointments.length === 0 ? (
                            <div className="py-10 text-center">
                                <Calendar className="mx-auto mb-3 size-12 text-muted-foreground/30" />
                                <p className="text-sm text-muted-foreground">
                                    Nenhuma sessão neste dia.
                                </p>
                                {can('appointments.manage.create') && (
                                    <Link
                                        href="/appointments/create"
                                        className="mt-2 inline-block text-sm font-semibold text-primary hover:text-primary/80"
                                    >
                                        Criar agendamento →
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {dayAppointments.map((app) => (
                                    <Link
                                        key={app.id}
                                        href={`/appointments/${app.id}`}
                                        className="group flex items-center justify-between rounded-xl border border-border/20 p-4 transition-colors hover:bg-muted/40"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="min-w-[52px] text-center">
                                                <p className="text-lg font-bold text-foreground">
                                                    {app.start_time?.slice(
                                                        0,
                                                        5,
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {app.duration_minutes}min
                                                </p>
                                            </div>
                                            <div className="h-10 w-px bg-border/30" />
                                            <div>
                                                <p className="line-clamp-1 text-sm font-semibold">
                                                    {app.type === 'group'
                                                        ? app.title || 'Turma'
                                                        : app.patients?.[0]
                                                              ?.name ||
                                                          'Sem paciente'}
                                                </p>
                                                <p className="text-xs text-muted-foreground capitalize">
                                                    {app.type === 'group'
                                                        ? app.patients?.length
                                                            ? app.patients
                                                                  .map(
                                                                      (p) =>
                                                                          p.nickname ||
                                                                          p.name.split(
                                                                              ' ',
                                                                          )[0],
                                                                  )
                                                                  .join(', ')
                                                            : 'Nenhum participante'
                                                        : app.patients?.[0]
                                                                ?.type ===
                                                            'pilates'
                                                          ? 'Pilates'
                                                          : 'Fisioterapia'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[app.status]}`}
                                            >
                                                {statusLabel[app.status]}
                                            </span>
                                            <ChevronRight className="size-4 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Upcoming Birthdays */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
                >
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-lg font-bold">
                            <span className="text-xl">🎂</span> Próximos
                            Aniversários
                        </h2>
                    </div>

                    {upcomingBirthdays.length === 0 ? (
                        <div className="py-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                Nenhum aniversário nos próximos 7 dias.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {upcomingBirthdays.map((patient) => (
                                <Link
                                    key={patient.id}
                                    href={`/patients/${patient.id}`}
                                    className={`flex items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-md ${patient.isToday ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/20' : 'border-border/40 bg-transparent hover:bg-muted/30'}`}
                                >
                                    <div
                                        className={`flex size-12 items-center justify-center rounded-full font-bold ${patient.isToday ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-muted text-muted-foreground'}`}
                                    >
                                        {patient.age_turning}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="truncate text-sm font-semibold">
                                            {patient.name}
                                        </p>
                                        <p
                                            className={`mt-0.5 text-xs ${patient.isToday ? 'font-medium text-primary' : 'text-muted-foreground'}`}
                                        >
                                            {patient.isToday
                                                ? 'Hoje! 🎉'
                                                : `Daqui a ${patient.daysToBirthday} dia(s)`}
                                        </p>
                                    </div>
                                    <ChevronRight className="size-4 text-muted-foreground/40" />
                                </Link>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {can('patients.manage.create') && (
                        <Link
                            href="/patients/create"
                            className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-xl transition-all hover:border-primary/30 hover:shadow-md"
                        >
                            <div className="rounded-xl bg-primary/10 p-2.5 transition-colors group-hover:bg-primary/20">
                                <Plus className="size-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">
                                    Novo Paciente
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Cadastrar paciente
                                </p>
                            </div>
                        </Link>
                    )}
                    {can('appointments.manage.create') && (
                        <Link
                            href="/appointments/create"
                            className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-xl transition-all hover:border-emerald-500/30 hover:shadow-md"
                        >
                            <div className="rounded-xl bg-emerald-500/10 p-2.5 transition-colors group-hover:bg-emerald-500/20">
                                <Calendar className="size-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">
                                    Agendar Sessão
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Criar agendamento
                                </p>
                            </div>
                        </Link>
                    )}
                    <Link
                        href="/patients"
                        className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-xl transition-all hover:border-amber-500/30 hover:shadow-md"
                    >
                        <div className="rounded-xl bg-amber-500/10 p-2.5 transition-colors group-hover:bg-amber-500/20">
                            <FileText className="size-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Prontuários</p>
                            <p className="text-xs text-muted-foreground">
                                Acessar ficha de pacientes
                            </p>
                        </div>
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}
