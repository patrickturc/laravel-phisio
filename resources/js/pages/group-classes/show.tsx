import { Head, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    ArrowLeft,
    Calendar,
    User,
    Clock,
    Settings,
    Plus,
    PlayCircle,
    Trash2,
    CalendarDays,
    BarChart3,
    ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { useConfirmModal } from '@/components/confirm-modal';
import { InlineEdit } from '@/components/inline-edit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { GroupClassFormSheet } from './group-class-form-sheet';

export default function GroupClassShow({
    groupClass,
    futureAppointments = [],
    lastAppointmentDate = null,
    occupancy = null,
    patients,
    users = [],
    absences = [],
}: {
    groupClass: any;
    futureAppointments?: any[];
    lastAppointmentDate?: string | null;
    occupancy?: {
        total_classes: number;
        avg_participants: number;
        occupancy_rate: number;
        attended: number;
        missed: number;
        cancelled: number;
        attendance_rate: number;
    } | null;
    patients: any[];
    users?: any[];
    absences?: any[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Turmas', href: '/group-classes' },
        { title: groupClass.name, href: `/group-classes/${groupClass.id}` },
    ];

    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateEndDate, setGenerateEndDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().split('T')[0];
    });
    const [generateReschedule, setGenerateReschedule] = useState(false);
    const { confirm, modal } = useConfirmModal();
    const { can } = usePermissions();
    const [isGenerating, setIsGenerating] = useState(false);
    const [showAbsences, setShowAbsences] = useState(false);

    function handleGenerateAppointments() {
        setIsGenerating(true);
        router.post(
            `/group-classes/${groupClass.id}/generate-appointments`,
            {
                end_date: generateEndDate,
                reschedule: generateReschedule,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowGenerateModal(false);
                    setIsGenerating(false);
                    setGenerateReschedule(false);
                },
                onError: () => setIsGenerating(false),
            },
        );
    }

    async function handleDelete() {
        const confirmed = await confirm({
            title: 'Excluir Turma',
            message: `Tem certeza que deseja excluir a turma "${groupClass.name}"? Essa ação não excluirá os agendamentos já criados.`,
            confirmLabel: 'Excluir Turma',
        });
        if (confirmed) router.delete(`/group-classes/${groupClass.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={groupClass.name} />
            <div className="mx-auto flex h-full w-full max-w-5xl flex-1 flex-col gap-6 p-6 md:p-10">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/group-classes"
                            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div className="flex items-center gap-4">
                            <div
                                className="flex size-16 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-inner"
                                style={{
                                    backgroundColor:
                                        groupClass.color || '#8b5cf6',
                                }}
                            >
                                <Users className="size-8" />
                            </div>
                            <div>
                                {can('group_classes.manage.edit') ? (
                                    <InlineEdit
                                        value={groupClass.name}
                                        onSave={(val) =>
                                            router.put(
                                                `/group-classes/${groupClass.id}`,
                                                { name: val },
                                                { preserveScroll: true },
                                            )
                                        }
                                        className="bg-transparent text-2xl font-bold tracking-tight"
                                    />
                                ) : (
                                    <span className="bg-transparent text-2xl font-bold tracking-tight">
                                        {groupClass.name}
                                    </span>
                                )}
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                            groupClass.status === 'active'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}
                                    >
                                        {can('group_classes.manage.edit') ? (
                                            <InlineEdit
                                                value={groupClass.status}
                                                type="select"
                                                options={[
                                                    {
                                                        value: 'active',
                                                        label: 'Ativa',
                                                    },
                                                    {
                                                        value: 'inactive',
                                                        label: 'Inativa',
                                                    },
                                                ]}
                                                onSave={(val) =>
                                                    router.put(
                                                        `/group-classes/${groupClass.id}`,
                                                        { status: val },
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                                className="text-xs font-semibold"
                                            />
                                        ) : (
                                            <span className="text-xs font-semibold">
                                                {groupClass.status === 'active'
                                                    ? 'Ativa'
                                                    : 'Inativa'}
                                            </span>
                                        )}
                                    </span>
                                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                        {can('group_classes.manage.edit') ? (
                                            <InlineEdit
                                                value={String(
                                                    groupClass.max_participants,
                                                )}
                                                type="number"
                                                onSave={(val) =>
                                                    router.put(
                                                        `/group-classes/${groupClass.id}`,
                                                        {
                                                            max_participants:
                                                                Number(val),
                                                        },
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                                className="w-16 text-center text-xs"
                                                renderDisplay={(val) => (
                                                    <span>
                                                        {groupClass.patients
                                                            ?.length || 0}{' '}
                                                        de {val} alunos
                                                    </span>
                                                )}
                                            />
                                        ) : (
                                            <span>
                                                {groupClass.patients?.length ||
                                                    0}{' '}
                                                de {groupClass.max_participants}{' '}
                                                alunos
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {can('group_classes.manage.delete') && (
                            <Button
                                variant="outline"
                                className="gap-2 rounded-xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-900/50 dark:hover:bg-red-950/50"
                                onClick={handleDelete}
                            >
                                <Trash2 className="size-4" /> Excluir
                            </Button>
                        )}
                        {can('group_classes.manage.edit') && (
                            <Button
                                className="gap-2 rounded-xl shadow-sm"
                                onClick={() => setIsEditSheetOpen(true)}
                            >
                                <Settings className="size-4" /> Editar Turma
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left Column - Info & Alunos */}
                    <div className="space-y-6 lg:col-span-1">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-border/50 bg-card/50 p-6 shadow-sm backdrop-blur-xl"
                        >
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                                <Clock className="size-5 text-primary" />{' '}
                                Horários
                            </h2>
                            <div className="space-y-3">
                                {groupClass.schedules?.length > 0 ? (
                                    groupClass.schedules.map(
                                        (schedule: any) => {
                                            const days = [
                                                'Domingo',
                                                'Segunda',
                                                'Terça',
                                                'Quarta',
                                                'Quinta',
                                                'Sexta',
                                                'Sábado',
                                            ];
                                            return (
                                                <div
                                                    key={schedule.id}
                                                    className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/50 p-3"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                                                            {days[
                                                                schedule
                                                                    .day_of_week
                                                            ].substring(0, 3)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold">
                                                                {
                                                                    days[
                                                                        schedule
                                                                            .day_of_week
                                                                    ]
                                                                }
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {schedule.start_time.substring(
                                                                    0,
                                                                    5,
                                                                )}{' '}
                                                                •{' '}
                                                                {
                                                                    schedule.duration_minutes
                                                                }
                                                                min
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        },
                                    )
                                ) : (
                                    <p className="py-4 text-center text-sm text-muted-foreground">
                                        Nenhum horário definido.
                                    </p>
                                )}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="rounded-2xl border border-border/50 bg-card/50 p-6 shadow-sm backdrop-blur-xl"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="flex items-center gap-2 text-lg font-bold">
                                    <User className="size-5 text-primary" />{' '}
                                    Alunos Fixos
                                </h2>
                                <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold">
                                    {groupClass.patients?.length || 0} /{' '}
                                    {groupClass.max_participants}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {groupClass.patients?.length > 0 ? (
                                    groupClass.patients.map((patient: any) => (
                                        <Link
                                            key={patient.id}
                                            href={`/patients/${patient.id}`}
                                            className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/50"
                                        >
                                            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                                {patient.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                                                    {patient.name}
                                                </p>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="rounded-xl border border-dashed border-border bg-muted/30 py-6 text-center">
                                        <p className="text-sm text-muted-foreground">
                                            Nenhum aluno matriculado nesta turma
                                            ainda.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => setIsEditSheetOpen(true)}
                                className="mt-4 w-full gap-2 rounded-xl border-dashed"
                            >
                                <Plus className="size-4" /> Adicionar Aluno
                            </Button>
                        </motion.div>

                        {occupancy && occupancy.total_classes > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="rounded-2xl border border-border/50 bg-card/50 p-6 shadow-sm backdrop-blur-xl"
                            >
                                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                                    <BarChart3 className="size-5 text-primary" />{' '}
                                    Ocupação
                                </h2>

                                <div className="mb-4">
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">
                                            Taxa média de ocupação
                                        </span>
                                        <span className="text-sm font-bold">
                                            {occupancy.occupancy_rate}%
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all"
                                            style={{
                                                width: `${Math.min(100, occupancy.occupancy_rate)}%`,
                                            }}
                                        />
                                    </div>
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        Média de {occupancy.avg_participants} de{' '}
                                        {groupClass.max_participants} alunos por
                                        aula • {occupancy.total_classes} aulas
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/20">
                                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                            {occupancy.attended}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                            Presenças
                                        </p>
                                    </div>
                                    {absences.length > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowAbsences(!showAbsences)
                                            }
                                            className={`rounded-xl p-3 text-center transition-all duration-200 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:outline-none active:scale-95 dark:focus:ring-offset-card ${
                                                showAbsences
                                                    ? 'bg-amber-100 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:ring-amber-800'
                                                    : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30'
                                            }`}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                                    {occupancy.missed}
                                                </p>
                                                <ChevronDown
                                                    className={`size-3.5 text-amber-600 transition-transform duration-200 dark:text-amber-400 ${showAbsences ? 'rotate-180' : ''}`}
                                                />
                                            </div>
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                Faltas
                                            </p>
                                        </button>
                                    ) : (
                                        <div className="rounded-xl bg-amber-50 p-3 opacity-60 dark:bg-amber-900/20">
                                            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                                {occupancy.missed}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                Faltas
                                            </p>
                                        </div>
                                    )}
                                    <div className="rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
                                        <p className="text-xl font-bold text-red-600 dark:text-red-400">
                                            {occupancy.cancelled}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                            Cancel.
                                        </p>
                                    </div>
                                </div>

                                {occupancy.attended + occupancy.missed > 0 && (
                                    <p className="mt-3 text-center text-xs text-muted-foreground">
                                        Taxa de comparecimento:{' '}
                                        <span className="font-semibold text-foreground">
                                            {occupancy.attendance_rate}%
                                        </span>
                                    </p>
                                )}

                                <AnimatePresence>
                                    {showAbsences && absences.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{
                                                height: 'auto',
                                                opacity: 1,
                                            }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="mt-4 overflow-hidden border-t border-border/50 pt-4"
                                        >
                                            <h3 className="mb-2 text-left text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                                Alunos que Faltaram
                                            </h3>
                                            <div className="max-h-[200px] space-y-2 overflow-y-auto pr-1">
                                                {absences.map(
                                                    (absence: any) => {
                                                        const formattedDate =
                                                            new Date(
                                                                absence.appointment_date,
                                                            ).toLocaleDateString(
                                                                'pt-BR',
                                                                {
                                                                    timeZone:
                                                                        'UTC',
                                                                },
                                                            );
                                                        return (
                                                            <div
                                                                key={`${absence.appointment_id}-${absence.patient_id}`}
                                                                className="flex items-center justify-between rounded-lg border border-amber-500/10 bg-amber-500/5 p-2 text-xs dark:border-amber-500/20 dark:bg-amber-500/10"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex size-6 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                                        {absence.patient_name
                                                                            .charAt(
                                                                                0,
                                                                            )
                                                                            .toUpperCase()}
                                                                    </div>
                                                                    <Link
                                                                        href={`/patients/${absence.patient_id}`}
                                                                        className="max-w-[120px] truncate font-medium text-foreground transition-colors hover:text-primary hover:underline"
                                                                    >
                                                                        {
                                                                            absence.patient_name
                                                                        }
                                                                    </Link>
                                                                </div>
                                                                <span className="text-muted-foreground">
                                                                    {
                                                                        formattedDate
                                                                    }{' '}
                                                                    às{' '}
                                                                    {absence.start_time.substring(
                                                                        0,
                                                                        5,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </div>

                    {/* Right Column - Agendamentos */}
                    <div className="space-y-6 lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-1 flex-col rounded-2xl border border-border/50 bg-card/50 p-6 shadow-sm backdrop-blur-xl"
                        >
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <h2 className="flex items-center gap-2 text-lg font-bold">
                                        <CalendarDays className="size-5 text-primary" />{' '}
                                        Agendamentos (Aulas)
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Sessões agendadas no calendário para
                                        esta turma.
                                    </p>
                                    {lastAppointmentDate ? (
                                        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary">
                                            <CalendarDays className="size-4" />
                                            Aulas geradas até{' '}
                                            {new Date(
                                                lastAppointmentDate,
                                            ).toLocaleDateString('pt-BR', {
                                                timeZone: 'UTC',
                                            })}
                                        </p>
                                    ) : (
                                        <p className="mt-1 text-sm font-medium text-amber-600">
                                            Nenhuma aula gerada ainda.
                                        </p>
                                    )}
                                </div>
                                {can('group_classes.manage.edit') && (
                                    <Button
                                        className="gap-2 rounded-xl"
                                        onClick={() =>
                                            setShowGenerateModal(true)
                                        }
                                    >
                                        <PlayCircle className="size-4" /> Gerar
                                        Aulas
                                    </Button>
                                )}
                            </div>

                            {futureAppointments.length > 0 ? (
                                <div className="max-h-[500px] space-y-3 overflow-y-auto pr-2">
                                    {futureAppointments.map(
                                        (appointment: any) => (
                                            <Link
                                                key={appointment.id}
                                                href={`/appointments/${appointment.id}`}
                                                className="group flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col items-center justify-center rounded-lg border border-primary/10 bg-primary/5 px-3 py-2 text-primary">
                                                        <span className="text-xs font-semibold uppercase">
                                                            {new Date(
                                                                appointment.appointment_date,
                                                            ).toLocaleDateString(
                                                                'pt-BR',
                                                                {
                                                                    month: 'short',
                                                                    timeZone:
                                                                        'UTC',
                                                                },
                                                            )}
                                                        </span>
                                                        <span className="text-xl leading-none font-bold">
                                                            {new Date(
                                                                appointment.appointment_date,
                                                            ).toLocaleDateString(
                                                                'pt-BR',
                                                                {
                                                                    day: '2-digit',
                                                                    timeZone:
                                                                        'UTC',
                                                                },
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="mb-1 flex items-center gap-2">
                                                            <span className="text-sm font-semibold">
                                                                {appointment.start_time.substring(
                                                                    0,
                                                                    5,
                                                                )}
                                                            </span>
                                                            <span
                                                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                                                                    appointment.status ===
                                                                    'scheduled'
                                                                        ? 'bg-blue-100 text-blue-700'
                                                                        : appointment.status ===
                                                                            'completed'
                                                                          ? 'bg-emerald-100 text-emerald-700'
                                                                          : 'bg-red-100 text-red-700'
                                                                }`}
                                                            >
                                                                {appointment.status ===
                                                                'scheduled'
                                                                    ? 'Agendado'
                                                                    : appointment.status ===
                                                                        'completed'
                                                                      ? 'Realizado'
                                                                      : 'Cancelado'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {appointment
                                                                .patients
                                                                ?.length ||
                                                                0}{' '}
                                                            participantes
                                                            confirmados
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-primary opacity-0 transition-opacity group-hover:opacity-100">
                                                    Ver →
                                                </div>
                                            </Link>
                                        ),
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center">
                                    <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                                        <Calendar className="size-8 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="mb-1 text-base font-semibold">
                                        Nenhuma aula gerada
                                    </h3>
                                    <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                                        As sessões reais dessa turma ainda não
                                        foram criadas na sua agenda.
                                    </p>
                                    {can('group_classes.manage.edit') && (
                                        <Button
                                            className="gap-2 rounded-xl shadow-sm"
                                            onClick={() =>
                                                setShowGenerateModal(true)
                                            }
                                        >
                                            <PlayCircle className="size-4" />{' '}
                                            Gerar Próximas Aulas
                                        </Button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
            {modal}

            {/* Generate Appointments Modal */}
            {showGenerateModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onClick={() => setShowGenerateModal(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="mb-1 text-lg font-bold">
                            Gerar Aulas na Agenda
                        </h3>
                        <p className="mb-5 text-sm text-muted-foreground">
                            Defina até qual data deseja gerar os agendamentos
                            para esta turma.
                        </p>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Gerar aulas até:</Label>
                                <Input
                                    type="date"
                                    value={generateEndDate}
                                    onChange={(e) =>
                                        setGenerateEndDate(e.target.value)
                                    }
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            {futureAppointments.length > 0 && (
                                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                                    <input
                                        type="checkbox"
                                        checked={generateReschedule}
                                        onChange={(e) =>
                                            setGenerateReschedule(
                                                e.target.checked,
                                            )
                                        }
                                        className="mt-0.5 size-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                                            Reagendar aulas existentes
                                        </p>
                                        <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/80">
                                            Remove todos os agendamentos futuros
                                            pendentes desta turma e gera novos
                                            com os horários atuais.
                                        </p>
                                    </div>
                                </label>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setShowGenerateModal(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleGenerateAppointments}
                                disabled={isGenerating}
                            >
                                <PlayCircle className="mr-2 size-4" />
                                {isGenerating ? 'Gerando...' : 'Gerar Aulas'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <GroupClassFormSheet
                isOpen={isEditSheetOpen}
                setIsOpen={setIsEditSheetOpen}
                groupClass={groupClass}
                patients={patients}
                users={users}
            />
        </AppLayout>
    );
}
