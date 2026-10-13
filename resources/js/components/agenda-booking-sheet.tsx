import { useForm } from '@inertiajs/react';
import axios from 'axios';
import { CalendarDays, Repeat } from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import type { Professional } from '@/lib/agenda';
import {
    addDays,
    capacityToneClass,
    isAvailable,
    shortDate,
    todayISO,
    WEEK_ORDER,
    WEEKDAY_LONG,
    weekdayOf,
} from '@/lib/agenda';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patients: Array<{ id: string; name: string }>;
    professionals: Professional[];
    defaultDuration: number;
    /** The clinic's rooms; the room field only shows when there are some. */
    rooms: string[];
    /** Prefilled from the slot clicked in the grid. */
    preset: { date: string; time: string; patientId?: string };
    onBooked: () => void;
}

const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none';

/** First date on or after `from` (and not before today) on that weekday. */
function nextOccurrence(from: string, weekday: number): string {
    let date = from < todayISO() ? todayISO() : from;

    while (weekdayOf(date) !== weekday) {
        date = addDays(date, 1);
    }

    return date;
}

/**
 * "Agendar horário": one patient with one professional, either every week
 * ("Fixo") or on a single day. Mounted with a fresh key per opening, so the
 * form starts from the preset.
 */
export function AgendaBookingSheet({
    open,
    onOpenChange,
    patients,
    professionals,
    defaultDuration,
    rooms,
    preset,
    onBooked,
}: Props) {
    const { data, setData, post, processing, errors } = useForm({
        mode: 'fixed' as 'fixed' | 'single',
        patient_id: preset.patientId ?? '',
        user_id: professionals.length === 1 ? String(professionals[0].id) : '',
        day_of_week: String(weekdayOf(preset.date)),
        starts_on: preset.date,
        ends_on: '',
        date: preset.date,
        start_time: preset.time,
        duration_minutes: String(defaultDuration),
        notes: '',
        room: '',
        interval_weeks: 1,
        rotation_user_ids: [] as number[],
    });

    const weekday =
        data.mode === 'single'
            ? weekdayOf(data.date)
            : Number(data.day_of_week);
    const timeChosen = /^\d{2}:\d{2}$/.test(data.start_time);
    const availableAtSlot = (professional: Professional) =>
        !timeChosen || isAvailable(professional, weekday, data.start_time);
    const others = professionals.filter(
        (professional) => String(professional.id) !== data.user_id,
    );

    function toggleRotation(professionalId: number) {
        setData(
            'rotation_user_ids',
            data.rotation_user_ids.includes(professionalId)
                ? data.rotation_user_ids.filter((id) => id !== professionalId)
                : [...data.rotation_user_ids, professionalId],
        );
    }

    const targetDate =
        data.mode === 'single'
            ? data.date
            : data.starts_on
              ? nextOccurrence(data.starts_on, Number(data.day_of_week))
              : '';
    const occupancyKey =
        targetDate && /^\d{2}:\d{2}$/.test(data.start_time)
            ? `${targetDate}|${data.start_time}`
            : null;

    const [occupancy, setOccupancy] = useState<{
        key: string;
        count: number;
        capacity: number;
    } | null>(null);

    useEffect(() => {
        if (!occupancyKey) return;

        let cancelled = false;
        const [date, time] = occupancyKey.split('|');

        axios
            .get('/api/appointments/slot-occupancy', { params: { date, time } })
            .then((response) => {
                if (!cancelled) {
                    setOccupancy({ key: occupancyKey, ...response.data });
                }
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [occupancyKey]);

    const slot = occupancy?.key === occupancyKey ? occupancy : null;

    function submit(event: React.FormEvent) {
        event.preventDefault();
        post('/recurring-bookings', {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                onOpenChange(false);
                onBooked();
            },
        });
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                <SheetHeader className="mb-4">
                    <SheetTitle>Agendar horário</SheetTitle>
                    <SheetDescription>
                        Vários pacientes podem dividir o mesmo horário, cada um
                        com o seu profissional.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={submit} className="space-y-5 px-4 pb-8">
                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/50 bg-muted/50 p-1">
                        {(
                            [
                                ['fixed', 'Fixo (toda semana)', Repeat],
                                ['single', 'Só um dia', CalendarDays],
                            ] as const
                        ).map(([mode, label, Icon]) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setData('mode', mode)}
                                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                                    data.mode === mode
                                        ? 'border border-border/50 bg-background text-primary shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Icon className="size-4" />
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="booking-patient">Paciente *</Label>
                        <select
                            id="booking-patient"
                            value={data.patient_id}
                            onChange={(e) =>
                                setData('patient_id', e.target.value)
                            }
                            className={selectClass}
                            required
                        >
                            <option value="">Selecione o paciente</option>
                            {patients.map((patient) => (
                                <option key={patient.id} value={patient.id}>
                                    {patient.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.patient_id} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="booking-professional">
                            Profissional *
                        </Label>
                        <select
                            id="booking-professional"
                            value={data.user_id}
                            onChange={(e) => setData('user_id', e.target.value)}
                            className={selectClass}
                            required
                        >
                            <option value="">Selecione o profissional</option>
                            {professionals.map((professional) => (
                                <option
                                    key={professional.id}
                                    value={professional.id}
                                >
                                    {professional.name}
                                    {availableAtSlot(professional)
                                        ? ''
                                        : ' — não atende neste horário'}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.user_id} />
                    </div>

                    {data.mode === 'fixed' ? (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="booking-weekday">
                                        Dia da semana *
                                    </Label>
                                    <select
                                        id="booking-weekday"
                                        value={data.day_of_week}
                                        onChange={(e) =>
                                            setData(
                                                'day_of_week',
                                                e.target.value,
                                            )
                                        }
                                        className={selectClass}
                                    >
                                        {WEEK_ORDER.map((weekday) => (
                                            <option
                                                key={weekday}
                                                value={weekday}
                                            >
                                                {WEEKDAY_LONG[weekday]}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.day_of_week} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="booking-time">
                                        Horário *
                                    </Label>
                                    <Input
                                        id="booking-time"
                                        type="time"
                                        value={data.start_time}
                                        onChange={(e) =>
                                            setData(
                                                'start_time',
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="booking-starts">
                                        A partir de *
                                    </Label>
                                    <Input
                                        id="booking-starts"
                                        type="date"
                                        value={data.starts_on}
                                        onChange={(e) =>
                                            setData('starts_on', e.target.value)
                                        }
                                        required
                                    />
                                    <InputError message={errors.starts_on} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="booking-ends">
                                        Até (opcional)
                                    </Label>
                                    <Input
                                        id="booking-ends"
                                        type="date"
                                        value={data.ends_on}
                                        onChange={(e) =>
                                            setData('ends_on', e.target.value)
                                        }
                                    />
                                    <InputError message={errors.ends_on} />
                                </div>
                            </div>

                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={data.interval_weeks === 2}
                                    onChange={(e) =>
                                        setData(
                                            'interval_weeks',
                                            e.target.checked ? 2 : 1,
                                        )
                                    }
                                    className="size-4 accent-primary"
                                />
                                Semana alternada (a cada 2 semanas)
                            </label>

                            {others.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Revezar com (opcional)</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Os profissionais se alternam a cada
                                        aula, na ordem marcada.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {others.map((professional) => {
                                            const position =
                                                data.rotation_user_ids.indexOf(
                                                    professional.id,
                                                );

                                            return (
                                                <button
                                                    key={professional.id}
                                                    type="button"
                                                    onClick={() =>
                                                        toggleRotation(
                                                            professional.id,
                                                        )
                                                    }
                                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                                        position >= 0
                                                            ? 'border-primary bg-primary/10 text-primary'
                                                            : 'border-border text-muted-foreground hover:text-foreground'
                                                    } ${availableAtSlot(professional) ? '' : 'opacity-50'}`}
                                                >
                                                    <span
                                                        className="size-2 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                professional.color,
                                                        }}
                                                    />
                                                    {position >= 0 &&
                                                        `${position + 2}º · `}
                                                    {professional.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <InputError
                                        message={errors.rotation_user_ids}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="booking-date">Data *</Label>
                                <Input
                                    id="booking-date"
                                    type="date"
                                    value={data.date}
                                    onChange={(e) =>
                                        setData('date', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={errors.date} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="booking-time-single">
                                    Horário *
                                </Label>
                                <Input
                                    id="booking-time-single"
                                    type="time"
                                    value={data.start_time}
                                    onChange={(e) =>
                                        setData('start_time', e.target.value)
                                    }
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {slot && (
                        <div
                            className={`rounded-lg px-3 py-2 text-sm ${capacityToneClass(slot.count, slot.capacity)}`}
                        >
                            {slot.count >= slot.capacity
                                ? `Horário lotado em ${shortDate(targetDate)} (${slot.count}/${slot.capacity}).`
                                : `${slot.count}/${slot.capacity} alunos neste horário em ${shortDate(targetDate)}.`}
                        </div>
                    )}
                    <InputError message={errors.start_time} />

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="booking-duration">
                                Duração (min)
                            </Label>
                            <Input
                                id="booking-duration"
                                type="number"
                                min={10}
                                max={180}
                                value={data.duration_minutes}
                                onChange={(e) =>
                                    setData('duration_minutes', e.target.value)
                                }
                            />
                            <InputError message={errors.duration_minutes} />
                        </div>
                        {rooms.length > 0 && (
                            <div className="grid gap-2">
                                <Label htmlFor="booking-room">
                                    Sala / unidade
                                </Label>
                                <select
                                    id="booking-room"
                                    value={data.room}
                                    onChange={(e) =>
                                        setData('room', e.target.value)
                                    }
                                    className={selectClass}
                                >
                                    <option value="">Sem sala</option>
                                    {rooms.map((room) => (
                                        <option key={room} value={room}>
                                            {room}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.room} />
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="booking-notes">Observações</Label>
                        <textarea
                            id="booking-notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            className="flex min-h-[70px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        />
                        <InputError message={errors.notes} />
                    </div>

                    <div className="flex justify-end gap-2 border-t pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Agendando...' : 'Agendar'}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
