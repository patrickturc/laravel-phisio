import { useForm } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { Plus, Trash2, CalendarClock, Palette } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';

interface GroupClassFormSheetProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    groupClass?: any;
    patients?: any[];
    users?: Array<{ id: number; name: string }>;
}

export function GroupClassFormSheet({
    isOpen,
    setIsOpen,
    groupClass,
    patients = [],
    users = [],
}: GroupClassFormSheetProps) {
    const isEditMode = !!groupClass;
    const [showUpdateFutureModal, setShowUpdateFutureModal] = useState(false);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            name: groupClass?.name || '',
            color: groupClass?.color || '#8b5cf6',
            user_id: groupClass?.user_id || '',
            max_participants: groupClass?.max_participants || 4,
            status: groupClass?.status || 'active',
            schedules: groupClass?.schedules || [
                { day_of_week: 1, start_time: '08:00', duration_minutes: 50 },
            ],
            patient_ids:
                groupClass?.patients?.map((p: any) => p.id) || ([] as string[]),
        });

    const presetColors = [
        '#8b5cf6',
        '#3b82f6',
        '#06b6d4',
        '#10b981',
        '#22c55e',
        '#eab308',
        '#f97316',
        '#ef4444',
        '#ec4899',
        '#a855f7',
        '#6366f1',
        '#0ea5e9',
        '#14b8a6',
        '#84cc16',
        '#f59e0b',
    ];

    useEffect(() => {
        if (isOpen) {
            clearErrors();
            if (!isEditMode) {
                reset();
            } else {
                setData({
                    name: groupClass.name,
                    color: groupClass.color || '#8b5cf6',
                    user_id: groupClass.user_id || '',
                    max_participants: groupClass.max_participants,
                    status: groupClass.status,
                    schedules: groupClass.schedules,
                    patient_ids:
                        groupClass.patients?.map((p: any) => p.id) || [],
                });
            }
        }
    }, [isOpen, groupClass]);

    const addSchedule = () => {
        setData('schedules', [
            ...data.schedules,
            { day_of_week: 1, start_time: '08:00', duration_minutes: 50 },
        ]);
    };

    const removeSchedule = (index: number) => {
        const newSchedules = [...data.schedules];
        newSchedules.splice(index, 1);
        setData('schedules', newSchedules);
    };

    const updateSchedule = (index: number, field: string, value: any) => {
        const newSchedules = [...data.schedules];
        newSchedules[index] = { ...newSchedules[index], [field]: value };
        setData('schedules', newSchedules);
    };

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (isEditMode) {
            put(`/group-classes/${groupClass.id}`, {
                onSuccess: () => {
                    setIsOpen(false);
                    // Check if schedules were changed
                    const schedulesChanged =
                        JSON.stringify(
                            groupClass.schedules?.map((s: any) => ({
                                day_of_week: s.day_of_week,
                                start_time: s.start_time?.substring(0, 5),
                                duration_minutes: s.duration_minutes,
                            })),
                        ) !==
                        JSON.stringify(
                            data.schedules.map((s: any) => ({
                                day_of_week: s.day_of_week,
                                start_time: s.start_time?.substring(0, 5),
                                duration_minutes: s.duration_minutes,
                            })),
                        );

                    if (schedulesChanged) {
                        setShowUpdateFutureModal(true);
                    }
                },
            });
        } else {
            post('/group-classes', {
                onSuccess: () => setIsOpen(false),
            });
        }
    }

    return (
        <>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent
                    side="right"
                    className="w-full overflow-y-auto border-l-border/50 sm:max-w-md"
                >
                    <SheetHeader className="mb-6">
                        <SheetTitle className="text-xl">
                            {isEditMode ? 'Editar Turma' : 'Nova Turma'}
                        </SheetTitle>
                        <SheetDescription>
                            {isEditMode
                                ? 'Edite os dados desta turma.'
                                : 'Defina os horários base em que essa turma ocorre.'}
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label>Nome da Turma *</Label>
                            <Input
                                placeholder="ex: Pilates T/Q 08:00"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                className="bg-background"
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Palette className="size-4" /> Cor da Turma
                            </Label>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-wrap gap-1.5">
                                    {presetColors.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setData('color', c)}
                                            className={`size-7 rounded-lg transition-all hover:scale-110 ${data.color === c ? 'scale-110 ring-2 ring-primary ring-offset-2' : 'ring-1 ring-black/10'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                                <div className="ml-auto flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={data.color}
                                        onChange={(e) =>
                                            setData('color', e.target.value)
                                        }
                                        className="size-8 cursor-pointer rounded-lg border border-border/50 p-0.5"
                                        title="Cor personalizada"
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Essa cor será usada na agenda para identificar
                                esta turma.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="user_id">
                                Profissional Responsável
                            </Label>
                            <select
                                id="user_id"
                                value={data.user_id}
                                onChange={(e) =>
                                    setData('user_id', e.target.value)
                                }
                                className="h-10 w-full rounded-md border-border/50 bg-background px-3 text-sm focus:border-primary focus:ring-primary/20"
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
                            <InputError message={errors.user_id as string} />
                        </div>

                        <div className="space-y-2">
                            <Label>Máximo de Participantes *</Label>
                            <Input
                                type="number"
                                min="1"
                                value={data.max_participants}
                                onChange={(e) =>
                                    setData(
                                        'max_participants',
                                        parseInt(e.target.value) || 1,
                                    )
                                }
                            />
                            <InputError message={errors.max_participants} />
                        </div>

                        <div className="grid gap-2">
                            <Label>
                                Alunos da Turma ({data.patient_ids.length}/
                                {data.max_participants})
                            </Label>
                            <div className="grid max-h-[160px] grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-2">
                                {patients.map((p) => (
                                    <label
                                        key={p.id}
                                        className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-background"
                                    >
                                        <input
                                            type="checkbox"
                                            name="patients"
                                            value={p.id}
                                            checked={data.patient_ids.includes(
                                                p.id,
                                            )}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    if (
                                                        data.patient_ids
                                                            .length <
                                                        data.max_participants
                                                    ) {
                                                        setData('patient_ids', [
                                                            ...data.patient_ids,
                                                            p.id,
                                                        ]);
                                                    }
                                                } else {
                                                    setData(
                                                        'patient_ids',
                                                        data.patient_ids.filter(
                                                            (id: string) =>
                                                                id !== p.id,
                                                        ),
                                                    );
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

                        <div className="space-y-4 border-t border-border pt-4">
                            <div className="mb-2 flex items-center justify-between">
                                <Label className="flex items-center gap-2 text-base font-semibold">
                                    <CalendarClock className="size-4" />{' '}
                                    Horários Base
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addSchedule}
                                    className="h-8 gap-2 rounded-xl text-xs"
                                >
                                    <Plus className="size-3" /> Adicionar
                                </Button>
                            </div>

                            {isEditMode && (
                                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                                    <strong>💡 Dica:</strong> Ao salvar
                                    alterações nos horários, você será
                                    perguntado se deseja atualizar
                                    automaticamente todos os agendamentos
                                    futuros na agenda.
                                </div>
                            )}

                            {data.schedules.map(
                                (schedule: any, index: number) => (
                                    <div
                                        key={index}
                                        className="group relative space-y-4 rounded-xl border border-border/50 bg-muted/50 p-4"
                                    >
                                        {data.schedules.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeSchedule(index)
                                                }
                                                className="absolute top-2 right-2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        )}

                                        <div className="space-y-2 pr-8">
                                            <Label className="text-xs">
                                                Dia da Semana
                                            </Label>
                                            <Select
                                                value={schedule.day_of_week.toString()}
                                                onValueChange={(val) =>
                                                    updateSchedule(
                                                        index,
                                                        'day_of_week',
                                                        parseInt(val),
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">
                                                        Domingo
                                                    </SelectItem>
                                                    <SelectItem value="1">
                                                        Segunda-feira
                                                    </SelectItem>
                                                    <SelectItem value="2">
                                                        Terça-feira
                                                    </SelectItem>
                                                    <SelectItem value="3">
                                                        Quarta-feira
                                                    </SelectItem>
                                                    <SelectItem value="4">
                                                        Quinta-feira
                                                    </SelectItem>
                                                    <SelectItem value="5">
                                                        Sexta-feira
                                                    </SelectItem>
                                                    <SelectItem value="6">
                                                        Sábado
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs">
                                                    Horário Inicial
                                                </Label>
                                                <Input
                                                    type="time"
                                                    value={schedule.start_time}
                                                    onChange={(e) =>
                                                        updateSchedule(
                                                            index,
                                                            'start_time',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">
                                                    Duração (min)
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={
                                                        schedule.duration_minutes
                                                    }
                                                    onChange={(e) =>
                                                        updateSchedule(
                                                            index,
                                                            'duration_minutes',
                                                            parseInt(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {isEditMode
                                    ? 'Salvar Alterações'
                                    : 'Criar Turma'}
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
            {isEditMode && (
                <UpdateFutureModal
                    groupClassId={groupClass.id}
                    open={showUpdateFutureModal}
                    onClose={() => setShowUpdateFutureModal(false)}
                />
            )}
        </>
    );
}

function UpdateFutureModal({
    groupClassId,
    open,
    onClose,
}: {
    groupClassId: string;
    open: boolean;
    onClose: () => void;
}) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="mb-2 text-lg font-bold">
                    Atualizar Agendamentos Futuros?
                </h3>
                <p className="mb-6 text-sm text-muted-foreground">
                    Você alterou os horários desta turma. Deseja atualizar todos
                    os agendamentos futuros que já estão na agenda para refletir
                    o novo horário?
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>
                        Não, manter como está
                    </Button>
                    <Button
                        onClick={() => {
                            router.post(
                                `/group-classes/${groupClassId}/update-future-appointments`,
                                {},
                                {
                                    preserveScroll: true,
                                    onSuccess: () => onClose(),
                                },
                            );
                        }}
                    >
                        Sim, atualizar todos
                    </Button>
                </div>
            </div>
        </div>
    );
}
