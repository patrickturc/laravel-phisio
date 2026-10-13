import { useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
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
import type {
    Availability,
    BusinessHours,
    Professional,
    ScheduleSettings,
    TimeRange,
} from '@/lib/agenda';
import { WEEK_ORDER, WEEKDAY_LONG, WEEKDAY_SHORT } from '@/lib/agenda';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settings: ScheduleSettings;
    professionals: Professional[];
    onSaved: () => void;
}

/**
 * Whole hours the clinic opens on that weekday, e.g. 07:00–20:00 → 7…19.
 */
function openHoursOf(hours: BusinessHours): number[] {
    if (!hours.open) return [];

    const first = Number(hours.start.slice(0, 2));
    const [endHour, endMinute] = hours.end.split(':').map(Number);
    const last = endMinute > 0 ? endHour : endHour - 1;

    return first > last
        ? []
        : Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/**
 * "Configurar agenda": opening hours per weekday, breaks hidden from the
 * agenda, students per time slot, default length, rooms, and each
 * professional's colour and availability. Mounted with a fresh key per
 * opening.
 */
export function AgendaSettingsDialog({
    open,
    onOpenChange,
    settings,
    professionals,
    onSaved,
}: Props) {
    const [tab, setTab] = useState<'general' | 'team'>('general');

    const { data, setData, patch, processing, errors } = useForm({
        business_hours: settings.business_hours,
        breaks: settings.breaks,
        slot_capacity: String(settings.slot_capacity),
        default_duration: String(settings.default_duration),
        colors: Object.fromEntries(
            professionals.map((professional) => [
                String(professional.id),
                professional.color,
            ]),
        ) as Record<string, string>,
        rooms: settings.rooms ?? [],
        availability: Object.fromEntries(
            professionals.map((professional) => [
                String(professional.id),
                professional.availability ?? null,
            ]),
        ) as Record<string, Availability | null>,
    });

    // Rows of the availability grid: every hour the clinic opens on any day.
    const gridHours = Array.from(
        new Set(data.business_hours.flatMap(openHoursOf)),
    ).sort((a, b) => a - b);

    function setAvailability(
        professionalId: number,
        value: Availability | null,
    ) {
        setData('availability', {
            ...data.availability,
            [String(professionalId)]: value,
        });
    }

    /** Restricting starts from the clinic hours, then hours get unticked. */
    function restrictAvailability(professionalId: number) {
        setAvailability(
            professionalId,
            Object.fromEntries(
                data.business_hours.map((hours, weekday) => [
                    String(weekday),
                    openHoursOf(hours),
                ]),
            ),
        );
    }

    function toggleHour(professionalId: number, weekday: number, hour: number) {
        const current = data.availability[String(professionalId)] ?? {};
        const hours = current[String(weekday)] ?? [];

        setAvailability(professionalId, {
            ...current,
            [String(weekday)]: hours.includes(hour)
                ? hours.filter((h) => h !== hour)
                : [...hours, hour].sort((a, b) => a - b),
        });
    }

    const fieldErrors = errors as Record<string, string | undefined>;

    function setHours(weekday: number, changes: Partial<BusinessHours>) {
        setData(
            'business_hours',
            data.business_hours.map((hours, index) =>
                index === weekday ? { ...hours, ...changes } : hours,
            ),
        );
    }

    function setBreak(index: number, changes: Partial<TimeRange>) {
        setData(
            'breaks',
            data.breaks.map((range, i) =>
                i === index ? { ...range, ...changes } : range,
            ),
        );
    }

    function save() {
        patch('/settings/schedule', {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                onOpenChange(false);
                onSaved();
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Configurar agenda</DialogTitle>
                    <DialogDescription>
                        Horários de funcionamento, limite de alunos por horário
                        e cores da equipe.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex w-fit rounded-xl border border-border/50 bg-muted/50 p-1">
                    {(
                        [
                            ['general', 'Geral'],
                            ['team', 'Equipe'],
                        ] as const
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                                tab === key
                                    ? 'border border-border/50 bg-background text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'general' ? (
                    <div className="space-y-6">
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold">
                                Horário de funcionamento
                            </h3>
                            {WEEK_ORDER.map((weekday) => {
                                const hours = data.business_hours[weekday];

                                return (
                                    <div key={weekday} className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <label className="flex w-28 cursor-pointer items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={hours.open}
                                                    onChange={(e) =>
                                                        setHours(weekday, {
                                                            open: e.target
                                                                .checked,
                                                        })
                                                    }
                                                    className="size-4 accent-primary"
                                                />
                                                {WEEKDAY_LONG[weekday]}
                                            </label>
                                            <Input
                                                type="time"
                                                value={hours.start}
                                                disabled={!hours.open}
                                                onChange={(e) =>
                                                    setHours(weekday, {
                                                        start: e.target.value,
                                                    })
                                                }
                                                className="w-32"
                                                aria-label={`Abertura ${WEEKDAY_LONG[weekday]}`}
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                às
                                            </span>
                                            <Input
                                                type="time"
                                                value={hours.end}
                                                disabled={!hours.open}
                                                onChange={(e) =>
                                                    setHours(weekday, {
                                                        end: e.target.value,
                                                    })
                                                }
                                                className="w-32"
                                                aria-label={`Fechamento ${WEEKDAY_LONG[weekday]}`}
                                            />
                                            {!hours.open && (
                                                <span className="text-xs text-muted-foreground">
                                                    Fechado
                                                </span>
                                            )}
                                        </div>
                                        <InputError
                                            message={
                                                fieldErrors[
                                                    `business_hours.${weekday}.end`
                                                ]
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </section>

                        <section className="space-y-3">
                            <div>
                                <h3 className="text-sm font-semibold">
                                    Intervalos
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Horários sem atendimento, como o almoço.
                                    Aparecem como fechados na agenda.
                                </p>
                            </div>
                            {data.breaks.map((range, index) => (
                                <div key={index} className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="time"
                                            value={range.start}
                                            onChange={(e) =>
                                                setBreak(index, {
                                                    start: e.target.value,
                                                })
                                            }
                                            className="w-32"
                                            aria-label="Início do intervalo"
                                        />
                                        <span className="text-sm text-muted-foreground">
                                            às
                                        </span>
                                        <Input
                                            type="time"
                                            value={range.end}
                                            onChange={(e) =>
                                                setBreak(index, {
                                                    end: e.target.value,
                                                })
                                            }
                                            className="w-32"
                                            aria-label="Fim do intervalo"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                setData(
                                                    'breaks',
                                                    data.breaks.filter(
                                                        (_, i) => i !== index,
                                                    ),
                                                )
                                            }
                                            title="Remover intervalo"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                    <InputError
                                        message={
                                            fieldErrors[`breaks.${index}.end`]
                                        }
                                    />
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setData('breaks', [
                                        ...data.breaks,
                                        { start: '12:00', end: '13:00' },
                                    ])
                                }
                            >
                                <Plus className="size-4" />
                                Adicionar intervalo
                            </Button>
                        </section>

                        <section className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="slot-capacity">
                                    Máximo de alunos por horário
                                </Label>
                                <Input
                                    id="slot-capacity"
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={data.slot_capacity}
                                    onChange={(e) =>
                                        setData('slot_capacity', e.target.value)
                                    }
                                />
                                <InputError message={errors.slot_capacity} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="default-duration">
                                    Duração padrão da aula (min)
                                </Label>
                                <Input
                                    id="default-duration"
                                    type="number"
                                    min={10}
                                    max={180}
                                    value={data.default_duration}
                                    onChange={(e) =>
                                        setData(
                                            'default_duration',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError message={errors.default_duration} />
                            </div>
                        </section>

                        <section className="space-y-3">
                            <div>
                                <h3 className="text-sm font-semibold">
                                    Salas / unidades
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Opcional. Aparecem no agendamento e no card
                                    da agenda.
                                </p>
                            </div>
                            {data.rooms.map((room, index) => (
                                <div key={index} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={room}
                                            onChange={(e) =>
                                                setData(
                                                    'rooms',
                                                    data.rooms.map((r, i) =>
                                                        i === index
                                                            ? e.target.value
                                                            : r,
                                                    ),
                                                )
                                            }
                                            placeholder="Ex.: Sala 1, Unidade Centro"
                                            maxLength={60}
                                            className="max-w-xs"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                setData(
                                                    'rooms',
                                                    data.rooms.filter(
                                                        (_, i) => i !== index,
                                                    ),
                                                )
                                            }
                                            title="Remover sala"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                    <InputError
                                        message={fieldErrors[`rooms.${index}`]}
                                    />
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setData('rooms', [...data.rooms, ''])
                                }
                            >
                                <Plus className="size-4" />
                                Adicionar sala
                            </Button>
                        </section>
                    </div>
                ) : (
                    <section className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            A cor identifica os alunos de cada profissional na
                            agenda.
                        </p>
                        {professionals.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                Nenhum profissional cadastrado.
                            </p>
                        )}
                        {professionals.map((professional) => {
                            const color = data.colors[String(professional.id)];
                            const availability =
                                data.availability[String(professional.id)];

                            return (
                                <div
                                    key={professional.id}
                                    className="space-y-3 rounded-lg border border-border/60 p-3"
                                    style={{
                                        borderLeft: `4px solid ${color}`,
                                    }}
                                >
                                    <div className="flex flex-wrap items-center gap-3">
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={(e) =>
                                                setData('colors', {
                                                    ...data.colors,
                                                    [String(professional.id)]:
                                                        e.target.value,
                                                })
                                            }
                                            className="size-8 cursor-pointer rounded border-0 bg-transparent p-0"
                                            aria-label={`Cor de ${professional.name}`}
                                        />
                                        <span className="text-sm font-medium">
                                            {professional.name}
                                        </span>
                                        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                                            <input
                                                type="checkbox"
                                                checked={availability !== null}
                                                onChange={(e) =>
                                                    e.target.checked
                                                        ? restrictAvailability(
                                                              professional.id,
                                                          )
                                                        : setAvailability(
                                                              professional.id,
                                                              null,
                                                          )
                                                }
                                                className="size-4 accent-primary"
                                            />
                                            Definir horários de atendimento
                                        </label>
                                    </div>

                                    {availability !== null && (
                                        <div className="overflow-x-auto">
                                            <table className="text-xs">
                                                <thead>
                                                    <tr>
                                                        <th />
                                                        {WEEK_ORDER.map(
                                                            (weekday) => (
                                                                <th
                                                                    key={
                                                                        weekday
                                                                    }
                                                                    className="px-1 pb-1 font-semibold text-muted-foreground"
                                                                >
                                                                    {
                                                                        WEEKDAY_SHORT[
                                                                            weekday
                                                                        ]
                                                                    }
                                                                </th>
                                                            ),
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {gridHours.map((hour) => (
                                                        <tr key={hour}>
                                                            <td className="pr-2 text-right text-muted-foreground tabular-nums">
                                                                {String(
                                                                    hour,
                                                                ).padStart(
                                                                    2,
                                                                    '0',
                                                                )}
                                                                h
                                                            </td>
                                                            {WEEK_ORDER.map(
                                                                (weekday) => {
                                                                    const on = (
                                                                        availability[
                                                                            String(
                                                                                weekday,
                                                                            )
                                                                        ] ?? []
                                                                    ).includes(
                                                                        hour,
                                                                    );

                                                                    return (
                                                                        <td
                                                                            key={
                                                                                weekday
                                                                            }
                                                                            className="p-0.5"
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    toggleHour(
                                                                                        professional.id,
                                                                                        weekday,
                                                                                        hour,
                                                                                    )
                                                                                }
                                                                                className={`h-5 w-9 rounded transition-colors ${on ? '' : 'bg-muted hover:bg-muted-foreground/20'}`}
                                                                                style={
                                                                                    on
                                                                                        ? {
                                                                                              backgroundColor:
                                                                                                  color,
                                                                                          }
                                                                                        : undefined
                                                                                }
                                                                                aria-pressed={
                                                                                    on
                                                                                }
                                                                                aria-label={`${WEEKDAY_SHORT[weekday]} ${hour}h`}
                                                                            />
                                                                        </td>
                                                                    );
                                                                },
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </section>
                )}

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button onClick={save} disabled={processing}>
                        {processing ? 'Salvando...' : 'Salvar tudo'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
