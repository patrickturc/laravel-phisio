import { Link, router } from '@inertiajs/react';
import axios from 'axios';
import {
    BadgeCheck,
    Ban,
    CalendarClock,
    CheckCircle2,
    DoorOpen,
    MessageCircle,
    Pencil,
    Repeat,
    RotateCcw,
    Trash2,
    Users,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/hooks/use-permissions';
import type { SelectedStudent, StudentStatus } from '@/lib/agenda';
import {
    renderReminder,
    shortDate,
    STATUS_LABELS,
    WEEKDAY_LONG,
    weekdayOf,
} from '@/lib/agenda';
import { whatsappUrl } from '@/lib/whatsapp';

interface Props {
    student: SelectedStudent;
    onClose: () => void;
    /** Something changed: reload the grid. */
    onChanged: () => void;
    /** "Falta" asks whether it was justified in its own modal. */
    onMarkMissed: (student: SelectedStudent) => void;
    onEdit: (appointmentId: string) => void;
    reminderTemplate: string;
    clinicName: string;
}

const STATUS_BADGE: Record<StudentStatus, string> = {
    scheduled: 'bg-muted text-muted-foreground',
    attended:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    missed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

/**
 * Everything the front desk does with one student's class: check-in, absence,
 * cancel the day, reschedule (this week or the fixed slot from now on) and
 * delete. Mounted with a key per student, so its state starts fresh.
 */
export function AgendaStudentDialog({
    student,
    onClose,
    onChanged,
    onMarkMissed,
    onEdit,
    reminderTemplate,
    clinicName,
}: Props) {
    const { can } = usePermissions();
    const [step, setStep] = useState<'actions' | 'reschedule' | 'delete'>(
        'actions',
    );
    const [newDate, setNewDate] = useState(student.date);
    const [newTime, setNewTime] = useState(student.time);
    const [scope, setScope] = useState<'single' | 'future'>('single');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [reminded, setReminded] = useState(student.reminded);
    const [confirmed, setConfirmed] = useState(student.confirmed);

    const isIndividual = student.type === 'individual';
    const appointmentUrl = `/appointments/${student.appointment_id}`;
    const patientUrl = `${appointmentUrl}/patients/${student.patient_id}`;
    const reminderUrl = whatsappUrl(
        student.phone,
        renderReminder(reminderTemplate, {
            name: student.patient_name,
            nickname: student.nickname,
            date: student.date,
            time: student.time,
            professional: student.professional_name,
            room: student.room,
            clinic: clinicName,
        }),
    );

    function sendReminder() {
        if (!reminderUrl) return;

        // Open WhatsApp straight from the click so the browser allows it.
        window.open(reminderUrl, '_blank', 'noopener,noreferrer');
        axios.post(`${patientUrl}/whatsapp-reminder`).then(() => {
            setReminded(true);
            onChanged();
        });
    }

    function toggleConfirmed() {
        axios
            .post(`${patientUrl}/confirmation`, { confirmed: !confirmed })
            .then(() => {
                setConfirmed(!confirmed);
                onChanged();
            });
    }

    const visitOptions = {
        preserveScroll: true,
        preserveState: true,
        onStart: () => setBusy(true),
        onFinish: () => setBusy(false),
        onSuccess: () => {
            onClose();
            onChanged();
        },
    };

    function setStatus(status: StudentStatus) {
        router.post(
            `${appointmentUrl}/patients/${student.patient_id}/status`,
            { status },
            visitOptions,
        );
    }

    async function reschedule() {
        setBusy(true);
        setError(null);

        try {
            await axios.post(`${appointmentUrl}/reschedule`, {
                appointment_date: newDate,
                start_time: newTime,
                update_mode: scope,
            });
            toast.success(
                scope === 'future'
                    ? 'Horário fixo alterado a partir desta semana.'
                    : 'Aula reagendada.',
            );
            onClose();
            onChanged();
        } catch (exception) {
            setError(
                (axios.isAxiosError(exception) &&
                    exception.response?.data?.message) ||
                    'Não foi possível reagendar.',
            );
        } finally {
            setBusy(false);
        }
    }

    function remove(mode: 'single' | 'future') {
        router.delete(`${appointmentUrl}?delete_mode=${mode}`, visitOptions);
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{student.patient_name}</DialogTitle>
                    <DialogDescription>
                        {WEEKDAY_LONG[weekdayOf(student.date)]},{' '}
                        {shortDate(student.date)} · {student.time} ·{' '}
                        {student.duration_minutes} min
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5">
                        <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: student.color }}
                        />
                        {student.professional_name}
                    </span>
                    <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[student.status]}`}
                    >
                        {STATUS_LABELS[student.status]}
                        {student.status === 'missed' &&
                            student.missed_justified &&
                            ' (justificada)'}
                    </span>
                    {student.recurring && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <Repeat className="size-3" />
                            Horário fixo
                        </span>
                    )}
                    {student.group_class && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                            <Users className="size-3" />
                            {student.group_class}
                        </span>
                    )}
                    {student.room && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                            <DoorOpen className="size-3" />
                            {student.room}
                        </span>
                    )}
                    {confirmed && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                            <BadgeCheck className="size-3" />
                            Confirmou
                        </span>
                    )}
                </div>

                {step === 'actions' && (
                    <div className="space-y-4">
                        {can('appointments.manage.edit') &&
                            student.status === 'scheduled' && (
                                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                                    <Button
                                        size="sm"
                                        disabled={!reminderUrl}
                                        onClick={sendReminder}
                                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        title={
                                            reminderUrl
                                                ? undefined
                                                : 'Paciente sem telefone válido'
                                        }
                                    >
                                        <MessageCircle className="size-4" />
                                        {reminded
                                            ? 'Reenviar lembrete'
                                            : 'Enviar lembrete'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={
                                            confirmed ? 'secondary' : 'outline'
                                        }
                                        onClick={toggleConfirmed}
                                    >
                                        <BadgeCheck className="size-4" />
                                        {confirmed
                                            ? 'Desfazer confirmação'
                                            : 'Confirmou presença'}
                                    </Button>
                                    {reminded && (
                                        <span className="text-xs text-muted-foreground">
                                            Lembrete enviado
                                        </span>
                                    )}
                                </div>
                            )}

                        {can('appointments.manage.edit') && (
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    disabled={
                                        busy || student.status === 'attended'
                                    }
                                    onClick={() => setStatus('attended')}
                                    className="justify-start"
                                >
                                    <CheckCircle2 className="size-4 text-emerald-600" />
                                    Check-in
                                </Button>
                                <Button
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => onMarkMissed(student)}
                                    className="justify-start"
                                >
                                    <XCircle className="size-4 text-amber-600" />
                                    Falta
                                </Button>
                                <Button
                                    variant="outline"
                                    disabled={
                                        busy || student.status === 'cancelled'
                                    }
                                    onClick={() => setStatus('cancelled')}
                                    className="justify-start"
                                >
                                    <Ban className="size-4 text-red-600" />
                                    Cancelar no dia
                                </Button>
                                {student.status !== 'scheduled' && (
                                    <Button
                                        variant="outline"
                                        disabled={busy}
                                        onClick={() => setStatus('scheduled')}
                                        className="justify-start"
                                    >
                                        <RotateCcw className="size-4" />
                                        Voltar a agendado
                                    </Button>
                                )}
                            </div>
                        )}

                        {isIndividual ? (
                            <div className="flex flex-wrap gap-2 border-t pt-4">
                                {can('appointments.manage.edit') && (
                                    <>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() =>
                                                setStep('reschedule')
                                            }
                                        >
                                            <CalendarClock className="size-4" />
                                            Reagendar
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() =>
                                                onEdit(student.appointment_id)
                                            }
                                        >
                                            <Pencil className="size-4" />
                                            Editar
                                        </Button>
                                    </>
                                )}
                                {can('appointments.manage.delete') && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setStep('delete')}
                                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                                    >
                                        <Trash2 className="size-4" />
                                        Excluir
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <p className="border-t pt-4 text-xs text-muted-foreground">
                                Aula da turma. Para mover ou excluir a aula
                                inteira, abra o agendamento.
                            </p>
                        )}

                        <Link
                            href={appointmentUrl}
                            className="block text-sm font-medium text-primary hover:underline"
                        >
                            Abrir agendamento →
                        </Link>
                    </div>
                )}

                {step === 'reschedule' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="reschedule-date">Data</Label>
                                <Input
                                    id="reschedule-date"
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="reschedule-time">Horário</Label>
                                <Input
                                    id="reschedule-time"
                                    type="time"
                                    value={newTime}
                                    onChange={(e) => setNewTime(e.target.value)}
                                />
                            </div>
                        </div>

                        {student.recurring && (
                            <div className="space-y-2 text-sm">
                                {(
                                    [
                                        ['single', 'Só esta semana'],
                                        [
                                            'future',
                                            'Esta e as próximas (muda o horário fixo)',
                                        ],
                                    ] as const
                                ).map(([value, label]) => (
                                    <label
                                        key={value}
                                        className="flex cursor-pointer items-center gap-2"
                                    >
                                        <input
                                            type="radio"
                                            name="reschedule-scope"
                                            checked={scope === value}
                                            onChange={() => setScope(value)}
                                            className="size-4 accent-primary"
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        )}

                        <InputError message={error ?? undefined} />

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setStep('actions')}
                            >
                                Voltar
                            </Button>
                            <Button
                                onClick={reschedule}
                                disabled={busy || !newDate || !newTime}
                            >
                                Reagendar
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'delete' && (
                    <div className="space-y-3">
                        {student.recurring ? (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Esta aula faz parte de um horário fixo.
                                </p>
                                <Button
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => remove('single')}
                                    className="w-full justify-start"
                                >
                                    Cancelar só esta semana
                                </Button>
                                <Button
                                    variant="destructive"
                                    disabled={busy}
                                    onClick={() => remove('future')}
                                    className="w-full justify-start"
                                >
                                    Encerrar o horário fixo a partir desta
                                    semana
                                </Button>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Excluir este agendamento? Essa ação não pode
                                    ser desfeita.
                                </p>
                                <Button
                                    variant="destructive"
                                    disabled={busy}
                                    onClick={() => remove('single')}
                                    className="w-full"
                                >
                                    Excluir agendamento
                                </Button>
                            </>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => setStep('actions')}
                            className="w-full"
                        >
                            Voltar
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
