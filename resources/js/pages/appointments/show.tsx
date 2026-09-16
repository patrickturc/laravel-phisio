import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Edit,
    Trash2,
    Clock,
    User,
    Users,
    FileText,
    CheckCircle2,
    XCircle,
    Clock4,
    Check,
} from 'lucide-react';
import { useState } from 'react';
import { useConfirmModal } from '@/components/confirm-modal';
import EvolutionFormSheet from '@/components/EvolutionFormSheet';
import { MissedAttendanceModal } from '@/components/missed-attendance-modal';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface Appointment {
    id: string;
    type: 'individual' | 'group';
    title: string | null;
    max_participants: number;
    appointment_date: string;
    start_time: string;
    duration_minutes: number;
    status: string;
    notes: string | null;
    patients?: Array<{ id: string; name: string; pivot?: { status: string } }>;
}

export default function AppointmentShow({
    appointment,
    protocols = [],
}: {
    appointment: Appointment;
    protocols?: Array<{ id: string; name: string }>;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Agenda', href: '/appointments' },
        {
            title: `${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}`,
            href: `/appointments/${appointment.id}`,
        },
    ];

    const { can } = usePermissions();
    const [isEvolutionSheetOpen, setIsEvolutionSheetOpen] = useState(false);
    const { modal } = useConfirmModal();

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    async function handleDelete() {
        setShowDeleteModal(true);
    }

    function executeDelete(mode: 'single' | 'future') {
        router.delete(`/appointments/${appointment.id}?delete_mode=${mode}`, {
            preserveScroll: true,
            onSuccess: () => setShowDeleteModal(false),
        });
    }

    function updatePatientStatus(patientId: string, status: string) {
        router.post(
            `/appointments/${appointment.id}/patients/${patientId}/status`,
            { status },
            {
                preserveScroll: true,
            },
        );
    }

    const [missedFor, setMissedFor] = useState<{
        id: string;
        name: string;
    } | null>(null);

    function confirmMissed(justified: boolean, reason: string) {
        if (!missedFor) return;
        router.post(
            `/appointments/${appointment.id}/patients/${missedFor.id}/status`,
            {
                status: 'missed',
                justified,
                reason,
            },
            {
                preserveScroll: true,
                onSuccess: () => setMissedFor(null),
            },
        );
    }

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

    const pivotStatusInfo: Record<
        string,
        { label: string; color: string; icon: any }
    > = {
        scheduled: {
            label: 'Agendado',
            color: 'text-blue-600 bg-blue-100',
            icon: Clock4,
        },
        attended: {
            label: 'Presente',
            color: 'text-emerald-600 bg-emerald-100',
            icon: CheckCircle2,
        },
        missed: {
            label: 'Faltou',
            color: 'text-amber-600 bg-amber-100',
            icon: XCircle,
        },
        cancelled: {
            label: 'Cancelado',
            color: 'text-red-600 bg-red-100',
            icon: XCircle,
        },
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Detalhes do Agendamento" />
            <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col gap-6 p-6 md:p-10">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/appointments"
                            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div>
                            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                                {appointment.type === 'group' ? (
                                    <Users className="size-6 text-primary" />
                                ) : (
                                    <User className="size-6 text-primary" />
                                )}
                                {appointment.type === 'group'
                                    ? appointment.title || 'Turma'
                                    : 'Detalhes do Agendamento'}
                            </h1>
                            <span
                                className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${statusColor[appointment.status]}`}
                            >
                                {statusLabel[appointment.status]}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {can('appointments.manage.edit') && (
                            <Link
                                href={`/appointments/${appointment.id}/edit`}
                                className="rounded-xl border border-border/50 p-2.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                            >
                                <Edit className="size-4" />
                            </Link>
                        )}
                        {can('appointments.manage.delete') && (
                            <button
                                onClick={handleDelete}
                                className="rounded-xl border border-red-200 p-2.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        )}
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                    <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl">
                        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                            <Users className="size-4" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Tipo
                            </p>
                            <p className="text-sm font-semibold">
                                {appointment.type === 'group'
                                    ? `Turma (${appointment.patients?.length || 0}/${appointment.max_participants} participantes)`
                                    : 'Sessão Individual'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl">
                        <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600">
                            <Clock className="size-4" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Data e Horário
                            </p>
                            <p className="text-sm font-semibold">
                                {new Date(
                                    appointment.appointment_date,
                                ).toLocaleDateString('pt-BR')}{' '}
                                às {appointment.start_time?.slice(0, 5)} (
                                {appointment.duration_minutes}min)
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Patients List */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-sm backdrop-blur-xl"
                >
                    <div className="flex items-center justify-between border-b border-border/50 p-5">
                        <h2 className="flex items-center gap-2 text-lg font-bold">
                            <User className="size-5 text-primary" /> Pacientes
                        </h2>
                    </div>
                    <div className="divide-y divide-border/50">
                        {appointment.patients?.map((patient) => {
                            const pStatus =
                                patient.pivot?.status || 'scheduled';
                            const StatusIcon = pivotStatusInfo[pStatus].icon;
                            return (
                                <div
                                    key={patient.id}
                                    className="flex items-center justify-between p-4 transition-colors hover:bg-muted/20"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                                            {patient.name.charAt(0)}
                                        </div>
                                        <div>
                                            <Link
                                                href={`/patients/${patient.id}`}
                                                className="text-sm font-semibold hover:underline"
                                            >
                                                {patient.name}
                                            </Link>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${pivotStatusInfo[pStatus].color}`}
                                                >
                                                    <StatusIcon className="size-3" />
                                                    {
                                                        pivotStatusInfo[pStatus]
                                                            .label
                                                    }
                                                </span>
                                                {pStatus === 'missed' &&
                                                    (patient.pivot as any)
                                                        ?.missed_justified ===
                                                        true && (
                                                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                                            Justificada
                                                            {(
                                                                patient.pivot as any
                                                            )?.missed_reason
                                                                ? `: ${(patient.pivot as any).missed_reason}`
                                                                : ''}
                                                        </span>
                                                    )}
                                                {pStatus === 'missed' &&
                                                    (patient.pivot as any)
                                                        ?.missed_justified ===
                                                        false && (
                                                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                                            Não justificada •
                                                            consumiu aula
                                                        </span>
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                    {can('appointments.manage.edit') && (
                                        <div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 border-border/50 text-xs font-medium"
                                                    >
                                                        Alterar Status
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="end"
                                                    className="w-40"
                                                >
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            updatePatientStatus(
                                                                patient.id,
                                                                'scheduled',
                                                            )
                                                        }
                                                        className="flex cursor-pointer items-center gap-2"
                                                    >
                                                        <Clock4 className="size-4 text-blue-500" />{' '}
                                                        Agendado
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            updatePatientStatus(
                                                                patient.id,
                                                                'attended',
                                                            )
                                                        }
                                                        className="flex cursor-pointer items-center gap-2"
                                                    >
                                                        <CheckCircle2 className="size-4 text-emerald-500" />{' '}
                                                        Presente
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            setMissedFor({
                                                                id: patient.id,
                                                                name: patient.name,
                                                            })
                                                        }
                                                        className="flex cursor-pointer items-center gap-2"
                                                    >
                                                        <XCircle className="size-4 text-amber-500" />{' '}
                                                        Faltou
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            updatePatientStatus(
                                                                patient.id,
                                                                'cancelled',
                                                            )
                                                        }
                                                        className="flex cursor-pointer items-center gap-2 text-red-600 focus:text-red-600"
                                                    >
                                                        <XCircle className="size-4 text-red-500" />{' '}
                                                        Cancelado
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {(!appointment.patients ||
                            appointment.patients.length === 0) && (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                Nenhum paciente vinculado a este agendamento.
                            </div>
                        )}
                    </div>
                </motion.div>

                {appointment.notes && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
                    >
                        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                            <FileText className="size-5 text-primary" />{' '}
                            Observações
                        </h2>
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                            {appointment.notes}
                        </p>
                    </motion.div>
                )}

                {/* Register Evolution Action */}
                {appointment.status === 'scheduled' &&
                    appointment.type === 'individual' &&
                    appointment.patients?.length === 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <button
                                onClick={() => setIsEvolutionSheetOpen(true)}
                                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 p-5 font-semibold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
                            >
                                <FileText className="size-5" />
                                Registrar Evolução e Concluir Sessão
                            </button>
                            <p className="mt-2 text-center text-xs text-muted-foreground">
                                Ao registrar a evolução, o agendamento será
                                marcado como "Realizado" automaticamente.
                            </p>
                        </motion.div>
                    )}

                {appointment.status === 'scheduled' &&
                    appointment.type === 'group' &&
                    can('appointments.manage.edit') && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Button
                                onClick={() =>
                                    router.patch(
                                        `/appointments/${appointment.id}/status`,
                                        { status: 'completed' },
                                        { preserveScroll: true },
                                    )
                                }
                                className="flex h-auto w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 p-5 font-semibold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
                            >
                                <Check className="size-5" />
                                Concluir Sessão da Turma
                            </Button>
                        </motion.div>
                    )}

                {appointment.status === 'completed' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-900/20"
                    >
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            ✅ Sessão realizada
                        </p>
                    </motion.div>
                )}
            </div>
            {modal}

            {showDeleteModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onClick={() => setShowDeleteModal(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="mb-2 text-lg font-bold">
                            Excluir Agendamentos{' '}
                            {appointment?.type === 'group'
                                ? 'da Turma'
                                : 'Recorrentes'}
                        </h3>
                        <p className="mb-6 text-sm text-muted-foreground">
                            Você está prestes a excluir um agendamento. Deseja
                            excluir apenas esta aula ou todas as próximas aulas
                            pendentes a partir de hoje?
                        </p>
                        <div className="flex flex-col gap-3">
                            <Button
                                variant="outline"
                                onClick={() => executeDelete('single')}
                                className="h-auto justify-start px-4 py-3"
                            >
                                <div className="text-left">
                                    <div className="font-semibold">
                                        Excluir apenas este evento
                                    </div>
                                    <div className="text-xs font-normal text-muted-foreground">
                                        Mantém os demais agendamentos intactos.
                                    </div>
                                </div>
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => executeDelete('future')}
                                className="h-auto justify-start px-4 py-3"
                            >
                                <div className="text-left">
                                    <div className="font-semibold">
                                        Excluir este e todos os próximos
                                    </div>
                                    <div className="text-xs font-normal text-white/80">
                                        Remove este agendamento e os futuros que
                                        não foram realizados.
                                    </div>
                                </div>
                            </Button>
                            <Button
                                variant="ghost"
                                className="mt-2"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {appointment.patients?.length === 1 && (
                <EvolutionFormSheet
                    isOpen={isEvolutionSheetOpen}
                    onOpenChange={setIsEvolutionSheetOpen}
                    patientId={appointment.patients[0].id}
                    appointmentId={appointment.id}
                    protocols={protocols}
                />
            )}

            <MissedAttendanceModal
                open={!!missedFor}
                patientName={missedFor?.name}
                onConfirm={confirmMissed}
                onCancel={() => setMissedFor(null)}
            />
        </AppLayout>
    );
}
