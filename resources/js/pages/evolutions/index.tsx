import { Head, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Search,
    FileText,
    User,
    Calendar as CalendarIcon,
    ArrowUpRight,
} from 'lucide-react';
import { AlertCircle, CheckCircle2, UserMinus } from 'lucide-react';
import { useState } from 'react';
import EvolutionFormSheet from '@/components/EvolutionFormSheet';
import { MissedAttendanceModal } from '@/components/missed-attendance-modal';
import { Pagination } from '@/components/pagination';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Evoluções', href: '/evolutions' },
];

interface PaginatedEvolutions {
    data: any[];
    links: any[];
    from: number | null;
    to: number | null;
    total: number;
}

interface PendingEvolution {
    id: string;
    appointment_id: string;
    patient_id: string;
    patient_name: string;
    patient_type: string;
    appointment_date: string;
    start_time: string;
    title: string;
}

export default function EvolutionsIndex({
    evolutions,
    pendingEvolutions = [],
    patients = [],
    protocols = [],
    filters = {},
}: {
    evolutions: PaginatedEvolutions;
    pendingEvolutions?: PendingEvolution[];
    patients?: any[];
    protocols?: any[];
    filters?: any;
}) {
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search || '');
    const [tipoFilter, setTipoFilter] = useState(filters.tipo || '');
    const [activeTab, setActiveTab] = useState(filters.tab || 'todas');

    function applyFilters(overrides?: any) {
        const params: any = {};
        const s = overrides?.search ?? search;
        const t = overrides?.tipo ?? tipoFilter;
        const tab = overrides?.tab ?? activeTab;

        if (s) params.search = s;
        if (t) params.tipo = t;
        if (tab && tab !== 'todas') params.tab = tab;

        router.get('/evolutions', params, {
            preserveState: true,
            replace: true,
        });
    }

    function handleSearchKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') applyFilters();
    }

    function clearFilters() {
        setSearch('');
        setTipoFilter('');
        setActiveTab('todas');
        router.get('/evolutions', {}, { preserveState: true, replace: true });
    }

    const hasFilters = filters.search || filters.tipo || filters.tab;

    const [observations, setObservations] = useState<Record<string, string>>(
        {},
    );
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const filteredPendingEvolutions = pendingEvolutions.filter((p) => {
        if (activeTab === 'todas') return true;
        if (activeTab === 'pilates') return p.patient_type === 'pilates';
        if (activeTab === 'fisio') return p.patient_type !== 'pilates';
        return true;
    });

    function handleSaveSimple(pending: PendingEvolution) {
        if (!observations[pending.id]?.trim()) return;
        setIsSubmitting(pending.id);

        router.post(
            '/evolutions',
            {
                evolution_type: 'simple',
                paciente_id: pending.patient_id,
                agendamento_id: pending.appointment_id,
                data_atendimento: pending.appointment_date,
                observacoes: observations[pending.id],
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmitting(null);
                    setObservations((prev) => {
                        const next = { ...prev };
                        delete next[pending.id];
                        return next;
                    });
                },
                onError: () => setIsSubmitting(null),
            },
        );
    }

    const [missedFor, setMissedFor] = useState<PendingEvolution | null>(null);

    function handleMarkMissed(pending: PendingEvolution) {
        setMissedFor(pending);
    }

    function confirmMissed(justified: boolean, reason: string) {
        if (!missedFor) return;
        setIsSubmitting(missedFor.id + '_missed');
        router.post(
            `/appointments/${missedFor.appointment_id}/patients/${missedFor.patient_id}/status`,
            {
                status: 'missed',
                justified,
                reason,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmitting(null);
                    setMissedFor(null);
                },
                onError: () => setIsSubmitting(null),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evoluções - Phisio" />

            <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-6 p-6 md:p-10">
                {/* Header section */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                            Evoluções (SOAP)
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            Acompanhe histórico e progresso clínico dos
                            pacientes.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative w-full md:w-48">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar paciente..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className="h-10 w-full rounded-xl border border-border bg-card pl-9 text-sm shadow-sm transition-all focus:ring-2 focus:ring-primary/50 focus:outline-none"
                            />
                        </div>
                        <select
                            value={tipoFilter}
                            onChange={(e) => {
                                setTipoFilter(e.target.value);
                                applyFilters({
                                    tipo: e.target.value || undefined,
                                });
                            }}
                            className="h-10 rounded-xl border border-border bg-card px-3 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        >
                            <option value="">Todos os tipos</option>
                            <option value="sessao">Sessão</option>
                            <option value="avaliacao">Avaliação</option>
                            <option value="reavaliacao">Reavaliação</option>
                        </select>
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="h-10 rounded-xl border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                            >
                                Limpar
                            </button>
                        )}

                        {can('evolutions.manage.create') && (
                            <button
                                onClick={() => setIsSheetOpen(true)}
                                className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                            >
                                <Activity className="size-4" />
                                <span className="hidden sm:inline">
                                    Nova Evolução
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border/50">
                    <button
                        onClick={() => {
                            setActiveTab('todas');
                            applyFilters({ tab: 'todas' });
                        }}
                        className={`border-b-2 px-4 pb-3 text-sm font-medium transition-colors ${
                            activeTab === 'todas'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                        }`}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('pilates');
                            applyFilters({ tab: 'pilates' });
                        }}
                        className={`border-b-2 px-4 pb-3 text-sm font-medium transition-colors ${
                            activeTab === 'pilates'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                        }`}
                    >
                        Pilates
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('fisio');
                            applyFilters({ tab: 'fisio' });
                        }}
                        className={`border-b-2 px-4 pb-3 text-sm font-medium transition-colors ${
                            activeTab === 'fisio'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                        }`}
                    >
                        Fisioterapia
                    </button>
                </div>

                {/* Pending Evolutions Section */}
                <AnimatePresence>
                    {filteredPendingEvolutions.length > 0 && !hasFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6 space-y-4"
                        >
                            <div className="mb-2 flex items-center gap-2 px-1 text-amber-600 dark:text-amber-500">
                                <AlertCircle className="size-5" />
                                <h2 className="text-lg font-semibold">
                                    Evoluções Pendentes
                                </h2>
                                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                    {filteredPendingEvolutions.length}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {filteredPendingEvolutions.map((pending) => (
                                    <div
                                        key={pending.id}
                                        className="relative flex flex-col overflow-hidden rounded-2xl border border-amber-200/50 bg-amber-50/50 p-5 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/10"
                                    >
                                        <div className="absolute top-0 right-0 -z-10 h-24 w-24 rounded-bl-[100px] bg-amber-500/5" />

                                        <div className="mb-3 flex items-start justify-between">
                                            <div>
                                                <h3
                                                    className="truncate pr-2 text-base font-bold text-foreground"
                                                    title={pending.patient_name}
                                                >
                                                    {pending.patient_name}
                                                </h3>
                                                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <span className="font-medium text-amber-700/80 dark:text-amber-400/80">
                                                        {pending.title}
                                                    </span>
                                                    <span>&bull;</span>
                                                    <span>
                                                        {new Date(
                                                            pending.appointment_date +
                                                                'T00:00:00',
                                                        ).toLocaleDateString(
                                                            'pt-BR',
                                                        )}{' '}
                                                        às {pending.start_time}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <textarea
                                            placeholder="Observações da aula..."
                                            value={
                                                observations[pending.id] || ''
                                            }
                                            onChange={(e) =>
                                                setObservations({
                                                    ...observations,
                                                    [pending.id]:
                                                        e.target.value,
                                                })
                                            }
                                            className="mb-3 h-24 w-full resize-none rounded-xl border border-amber-200/50 bg-background/50 p-3 text-sm transition-all focus:ring-2 focus:ring-amber-500/50 focus:outline-none dark:border-amber-800/50"
                                        />

                                        <div className="mt-auto flex items-center gap-2">
                                            {can(
                                                'evolutions.manage.create',
                                            ) && (
                                                <button
                                                    onClick={() =>
                                                        handleSaveSimple(
                                                            pending,
                                                        )
                                                    }
                                                    disabled={
                                                        isSubmitting ===
                                                            pending.id ||
                                                        !observations[
                                                            pending.id
                                                        ]?.trim()
                                                    }
                                                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-600 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <CheckCircle2 className="size-4" />
                                                    Salvar
                                                </button>
                                            )}
                                            <button
                                                onClick={() =>
                                                    handleMarkMissed(pending)
                                                }
                                                disabled={
                                                    isSubmitting ===
                                                    pending.id + '_missed'
                                                }
                                                className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                                                title="Marcar como Falta"
                                            >
                                                <UserMinus className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* List section with Glassmorphism */}
                <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] backdrop-blur-xl">
                    <div className="p-2">
                        {evolutions.data.length > 0 ? (
                            <div className="divide-y divide-border/30">
                                {evolutions.data.map(
                                    (patient: any, index: number) => {
                                        const latestEvo =
                                            patient.evolutions?.[0];
                                        if (!latestEvo) return null;

                                        return (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{
                                                    delay: index * 0.05,
                                                }}
                                                key={patient.id}
                                                className="group flex flex-col justify-between gap-4 rounded-xl p-4 transition-colors hover:bg-muted/30 md:flex-row md:items-center md:p-6"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="mb-2 flex flex-wrap items-center gap-3">
                                                        <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                                            <CalendarIcon className="size-3.5" />
                                                            {new Date(
                                                                latestEvo.data_atendimento,
                                                            ).toLocaleDateString(
                                                                'pt-BR',
                                                                {
                                                                    timeZone:
                                                                        'UTC',
                                                                },
                                                            )}
                                                        </div>
                                                        <span
                                                            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                                                                latestEvo.tipo_atendimento ===
                                                                'avaliacao'
                                                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                                    : latestEvo.tipo_atendimento ===
                                                                        'reavaliacao'
                                                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                            }`}
                                                        >
                                                            {latestEvo.tipo_atendimento ===
                                                            'avaliacao'
                                                                ? 'Avaliação'
                                                                : latestEvo.tipo_atendimento ===
                                                                    'reavaliacao'
                                                                  ? 'Reavaliação'
                                                                  : 'Evolução'}
                                                        </span>
                                                        {latestEvo.dor_eva !==
                                                            null && (
                                                            <span className="rounded-md border border-destructive/20 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                                                                Dor EVA:{' '}
                                                                {
                                                                    latestEvo.dor_eva
                                                                }
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-foreground">
                                                        <User className="size-4 text-muted-foreground" />
                                                        <span className="truncate">
                                                            {patient.name}
                                                        </span>
                                                    </h3>

                                                    <p className="mt-2 line-clamp-2 text-sm break-words text-muted-foreground">
                                                        {latestEvo.observacoes ? (
                                                            <span>
                                                                <strong>
                                                                    Resumo:
                                                                </strong>{' '}
                                                                {
                                                                    latestEvo.observacoes
                                                                }
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <strong>
                                                                    Subjetivo:
                                                                </strong>{' '}
                                                                {latestEvo.queixa_principal ||
                                                                    latestEvo.relato_paciente ||
                                                                    'Sem relato subjetivo.'}{' '}
                                                                <br />
                                                                <strong>
                                                                    Objetivo:
                                                                </strong>{' '}
                                                                {latestEvo.condutas_realizadas ||
                                                                    'Sem conduta detalhada.'}
                                                            </>
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="flex flex-shrink-0 items-center justify-between gap-3 md:justify-center">
                                                    <Link
                                                        href={`/evolutions/patient/${patient.id}`}
                                                        className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-4 py-2 text-sm font-medium shadow-sm transition-all group-hover:shadow hover:border-primary hover:text-primary"
                                                    >
                                                        Ver Evoluções
                                                        <ArrowUpRight className="size-4" />
                                                    </Link>
                                                </div>
                                            </motion.div>
                                        );
                                    },
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-muted/50 shadow-sm">
                                    <FileText className="size-8 text-muted-foreground/50" />
                                </div>
                                <h3 className="mb-2 text-xl font-bold">
                                    Nenhuma evolução
                                </h3>
                                <p className="max-w-sm text-muted-foreground">
                                    Os registros clínicos e SOAP dos pacientes
                                    aparecerão aqui.
                                </p>
                            </div>
                        )}
                    </div>
                    {evolutions.total > 0 && (
                        <div className="border-t border-border/30 px-6">
                            <Pagination
                                links={evolutions.links}
                                from={evolutions.from}
                                to={evolutions.to}
                                total={evolutions.total}
                            />
                        </div>
                    )}
                </div>
            </div>

            <EvolutionFormSheet
                isOpen={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                patients={patients}
                protocols={protocols}
            />

            <MissedAttendanceModal
                open={!!missedFor}
                patientName={missedFor?.patient_name}
                onConfirm={confirmMissed}
                onCancel={() => setMissedFor(null)}
            />
        </AppLayout>
    );
}
