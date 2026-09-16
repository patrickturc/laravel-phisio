import { useForm } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { Users, User, Trash2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';

interface AppointmentFormSheetProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    patients: Array<{ id: string; name: string }>;
    editingAppointment?: any; // If provided, it's edit mode
    initialDate?: string;
    initialTime?: string;
    initialDuration?: number;
    initialPatientId?: string;
    users?: Array<{ id: number; name: string }>;
    groupClasses?: Array<{
        id: string;
        name: string;
        max_participants: number;
    }>;
    onNewGroupClass?: () => void;
}

export function AppointmentFormSheet({
    isOpen,
    setIsOpen,
    patients,
    editingAppointment,
    initialDate,
    initialTime,
    initialDuration,
    initialPatientId,
    users = [],
    groupClasses = [],
    onNewGroupClass,
}: AppointmentFormSheetProps) {
    const isEditMode = !!editingAppointment;

    const { data, setData, post, put, processing, errors, clearErrors } =
        useForm({
            type: 'individual',
            title: '',
            user_id: '',
            group_class_id: '',
            max_participants: 1,
            patient_ids: initialPatientId
                ? [initialPatientId]
                : ([] as string[]),
            appointment_date:
                initialDate || new Date().toISOString().split('T')[0],
            start_time: initialTime || '08:00',
            duration_minutes: initialDuration ? String(initialDuration) : '50',
            status: 'scheduled',
            notes: '',
            is_recurring: false,
            recurrence_end_date: '',
        });

    useEffect(() => {
        if (isOpen) {
            clearErrors();
            if (editingAppointment) {
                setData({
                    type: editingAppointment.type || 'individual',
                    title: editingAppointment.title || '',
                    user_id: editingAppointment.user_id || '',
                    group_class_id: editingAppointment.group_class_id || '',
                    max_participants: editingAppointment.max_participants || 1,
                    patient_ids: editingAppointment.patients
                        ? editingAppointment.patients.map((p: any) => p.id)
                        : [],
                    appointment_date:
                        editingAppointment.appointment_date?.slice(0, 10) || '',
                    start_time:
                        editingAppointment.start_time?.slice(0, 5) || '',
                    duration_minutes: String(
                        editingAppointment.duration_minutes,
                    ),
                    status: editingAppointment.status || 'scheduled',
                    notes: editingAppointment.notes || '',
                    is_recurring: false,
                    recurrence_end_date: '',
                });
            } else {
                setData({
                    type: 'individual',
                    title: '',
                    user_id: '',
                    group_class_id: '',
                    max_participants: 1,
                    patient_ids: initialPatientId ? [initialPatientId] : [],
                    appointment_date:
                        initialDate || new Date().toISOString().split('T')[0],
                    start_time: initialTime || '08:00',
                    duration_minutes: initialDuration
                        ? String(initialDuration)
                        : '50',
                    status: 'scheduled',
                    notes: '',
                    is_recurring: false,
                    recurrence_end_date: '',
                });
            }
        }
    }, [isOpen, editingAppointment, initialDate, initialTime, initialDuration]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setIsOpen(false);
            },
        };

        if (isEditMode) {
            put(`/appointments/${editingAppointment?.id}`, options);
        } else {
            post('/appointments', options);
        }
    }

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    function handleDelete() {
        // Show modal for all appointments to give the option to delete future ones
        setShowDeleteModal(true);
    }

    function executeDelete(mode: 'single' | 'future') {
        router.delete(
            `/appointments/${editingAppointment?.id}?delete_mode=${mode}`,
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setShowDeleteModal(false);
                    setIsOpen(false);
                },
            },
        );
    }

    return (
        <>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                    <SheetHeader className="mb-4">
                        <SheetTitle>
                            {isEditMode
                                ? 'Editar Agendamento'
                                : 'Novo Agendamento'}
                        </SheetTitle>
                        <SheetDescription>
                            {isEditMode
                                ? 'Edite as informações deste agendamento.'
                                : 'Preencha os dados abaixo para criar um novo agendamento.'}
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex w-fit rounded-xl border border-border/50 bg-muted/50 p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setData((d) => ({
                                        ...d,
                                        type: 'individual',
                                        max_participants: 1,
                                        title: '',
                                        patient_ids:
                                            d.patient_ids.length > 0
                                                ? [d.patient_ids[0]]
                                                : [],
                                    }));
                                }}
                                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${data.type === 'individual' ? 'border border-border/50 bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                            >
                                <User className="size-4" />
                                Individual
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setData('type', 'group');
                                    setData(
                                        'max_participants',
                                        Math.max(4, data.patient_ids.length),
                                    );
                                }}
                                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${data.type === 'group' ? 'border border-border/50 bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                            >
                                <Users className="size-4" />
                                Turma
                            </button>
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="user_id" className="text-xs">
                                Profissional Responsável
                            </Label>
                            <select
                                id="user_id"
                                value={data.user_id}
                                onChange={(e) =>
                                    setData('user_id', e.target.value)
                                }
                                className="h-8 rounded-md border-border/50 bg-background text-sm focus:border-primary focus:ring-primary/20"
                            >
                                <option value="">
                                    -- Selecione (Padrão: Você) --
                                </option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                            <InputError
                                message={errors.user_id}
                                className="text-[10px]"
                            />
                        </div>

                        {data.type === 'group' && (
                            <div className="grid grid-cols-1 gap-4 rounded-xl border border-primary/10 bg-primary/5 p-3">
                                <div className="grid gap-1.5">
                                    <Label
                                        htmlFor="group_class_id"
                                        className="text-xs"
                                    >
                                        Turma *
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <select
                                            id="group_class_id"
                                            value={data.group_class_id}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setData('group_class_id', val);
                                                if (val) {
                                                    const gc =
                                                        groupClasses.find(
                                                            (g) => g.id === val,
                                                        );
                                                    if (gc) {
                                                        setData((d) => ({
                                                            ...d,
                                                            group_class_id: val,
                                                            title: gc.name,
                                                            max_participants:
                                                                gc.max_participants,
                                                        }));
                                                    }
                                                }
                                            }}
                                            className="h-8 flex-1 rounded-md border-border/50 bg-background text-sm focus:border-primary focus:ring-primary/20"
                                            required={data.type === 'group'}
                                        >
                                            <option value="">
                                                -- Selecione uma Turma --
                                            </option>
                                            {groupClasses.map((gc) => (
                                                <option
                                                    key={gc.id}
                                                    value={gc.id}
                                                >
                                                    {gc.name} (
                                                    {gc.max_participants} vagas)
                                                </option>
                                            ))}
                                        </select>
                                        {onNewGroupClass && (
                                            <Button
                                                type="button"
                                                onClick={onNewGroupClass}
                                                variant="outline"
                                                className="h-8 gap-1 px-3 text-xs"
                                            >
                                                <Plus className="size-3" /> Nova
                                                Turma
                                            </Button>
                                        )}
                                    </div>
                                    <InputError
                                        message={errors.group_class_id}
                                        className="text-[10px]"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>
                                Pacientes{' '}
                                {data.type === 'group'
                                    ? `(${data.patient_ids.length}/${data.max_participants})`
                                    : '*'}
                            </Label>
                            <div className="grid max-h-[160px] grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-2">
                                {[...patients]
                                    .sort((a, b) => {
                                        const aSelected =
                                            data.patient_ids.includes(a.id);
                                        const bSelected =
                                            data.patient_ids.includes(b.id);
                                        if (aSelected && !bSelected) return -1;
                                        if (!aSelected && bSelected) return 1;
                                        return a.name.localeCompare(b.name);
                                    })
                                    .map((p) => (
                                        <label
                                            key={p.id}
                                            className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-background"
                                        >
                                            <input
                                                type={
                                                    data.type === 'individual'
                                                        ? 'radio'
                                                        : 'checkbox'
                                                }
                                                name="patients"
                                                value={p.id}
                                                checked={data.patient_ids.includes(
                                                    p.id,
                                                )}
                                                onChange={(e) => {
                                                    if (
                                                        data.type ===
                                                        'individual'
                                                    ) {
                                                        setData('patient_ids', [
                                                            p.id,
                                                        ]);
                                                    } else {
                                                        if (e.target.checked) {
                                                            if (
                                                                data.patient_ids
                                                                    .length <
                                                                data.max_participants
                                                            ) {
                                                                setData(
                                                                    'patient_ids',
                                                                    [
                                                                        ...data.patient_ids,
                                                                        p.id,
                                                                    ],
                                                                );
                                                            }
                                                        } else {
                                                            setData(
                                                                'patient_ids',
                                                                data.patient_ids.filter(
                                                                    (id) =>
                                                                        id !==
                                                                        p.id,
                                                                ),
                                                            );
                                                        }
                                                    }
                                                }}
                                                className="size-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm font-medium">
                                                {p.name}
                                            </span>
                                        </label>
                                    ))}
                                {patients.length === 0 && (
                                    <div className="py-2 text-center text-xs text-muted-foreground">
                                        Nenhum paciente.
                                    </div>
                                )}
                            </div>
                            <InputError
                                message={errors.patient_ids as string}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="grid gap-1.5">
                                <Label
                                    htmlFor="appointment_date"
                                    className="text-xs"
                                >
                                    Data *
                                </Label>
                                <Input
                                    id="appointment_date"
                                    type="date"
                                    value={data.appointment_date}
                                    onChange={(e) =>
                                        setData(
                                            'appointment_date',
                                            e.target.value,
                                        )
                                    }
                                    className="h-8 text-sm"
                                    required
                                />
                                <InputError
                                    message={errors.appointment_date}
                                    className="text-[10px]"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="start_time" className="text-xs">
                                    Horário *
                                </Label>
                                <Input
                                    id="start_time"
                                    type="time"
                                    value={data.start_time}
                                    onChange={(e) =>
                                        setData('start_time', e.target.value)
                                    }
                                    className="h-8 text-sm"
                                    required
                                />
                                <InputError
                                    message={errors.start_time}
                                    className="text-[10px]"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label
                                    htmlFor="duration_minutes"
                                    className="text-xs"
                                >
                                    Minutos *
                                </Label>
                                <Input
                                    id="duration_minutes"
                                    type="number"
                                    value={data.duration_minutes}
                                    onChange={(e) =>
                                        setData(
                                            'duration_minutes',
                                            e.target.value,
                                        )
                                    }
                                    className="h-8 text-sm"
                                    min="10"
                                    max="180"
                                    required
                                />
                                <InputError
                                    message={errors.duration_minutes}
                                    className="text-[10px]"
                                />
                            </div>
                        </div>

                        {!isEditMode && (
                            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_recurring"
                                        checked={data.is_recurring}
                                        onChange={(e) =>
                                            setData(
                                                'is_recurring',
                                                e.target.checked,
                                            )
                                        }
                                        className="size-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Label
                                        htmlFor="is_recurring"
                                        className="cursor-pointer text-sm font-semibold"
                                    >
                                        Repetir semanalmente?
                                    </Label>
                                </div>

                                {data.is_recurring && (
                                    <div className="grid gap-1.5 pl-6">
                                        <Label
                                            htmlFor="recurrence_end_date"
                                            className="text-xs"
                                        >
                                            Até qual data? *
                                        </Label>
                                        <Input
                                            id="recurrence_end_date"
                                            type="date"
                                            value={data.recurrence_end_date}
                                            onChange={(e) =>
                                                setData(
                                                    'recurrence_end_date',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-8 text-sm"
                                            min={
                                                data.appointment_date ||
                                                new Date()
                                                    .toISOString()
                                                    .split('T')[0]
                                            }
                                            required={data.is_recurring}
                                        />
                                        <InputError
                                            message={errors.recurrence_end_date}
                                            className="text-[10px]"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid gap-1.5">
                            <Label htmlFor="status" className="text-xs">
                                Status
                            </Label>
                            <select
                                id="status"
                                value={data.status}
                                onChange={(e) =>
                                    setData('status', e.target.value)
                                }
                                className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="scheduled">Agendado</option>
                                <option value="completed">Realizado</option>
                                <option value="cancelled">Cancelado</option>
                            </select>
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="notes" className="text-xs">
                                Observações
                            </Label>
                            <textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) =>
                                    setData('notes', e.target.value)
                                }
                                className="flex min-h-[60px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                placeholder="..."
                            />
                            <InputError
                                message={errors.notes}
                                className="text-[10px]"
                            />
                        </div>

                        <div className="flex items-center justify-between border-t border-border/50 pt-4">
                            {isEditMode ? (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDelete}
                                    className="gap-2"
                                >
                                    <Trash2 className="size-4" />
                                    Excluir
                                </Button>
                            ) : (
                                <div></div>
                            )}
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={processing}
                                >
                                    {processing ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>

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
                            {editingAppointment?.type === 'group'
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
        </>
    );
}
