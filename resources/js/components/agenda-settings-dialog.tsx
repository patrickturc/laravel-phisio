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
    BusinessHours,
    Professional,
    ScheduleSettings,
    TimeRange,
} from '@/lib/agenda';
import { WEEK_ORDER, WEEKDAY_LONG } from '@/lib/agenda';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settings: ScheduleSettings;
    professionals: Professional[];
    onSaved: () => void;
}

/**
 * "Configurar agenda": opening hours per weekday, breaks hidden from the
 * agenda, students per time slot, default length, and each professional's
 * colour. Mounted with a fresh key per opening.
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
    });

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

                            return (
                                <label
                                    key={professional.id}
                                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-3"
                                    style={{
                                        borderLeft: `4px solid ${color}`,
                                    }}
                                >
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
                                    />
                                    <span className="text-sm font-medium">
                                        {professional.name}
                                    </span>
                                </label>
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
