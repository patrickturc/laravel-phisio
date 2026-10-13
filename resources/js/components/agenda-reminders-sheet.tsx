import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    BadgeCheck,
    Check,
    Loader2,
    MessageCircle,
    PencilLine,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { usePermissions } from '@/hooks/use-permissions';
import { addDays, renderReminder, todayISO } from '@/lib/agenda';
import { formatPhone, whatsappUrl } from '@/lib/whatsapp';

interface ReminderRow {
    appointment_id: string;
    patient_id: string;
    patient_name: string;
    nickname: string | null;
    phone: string | null;
    time: string;
    professional_name: string | null;
    room: string | null;
    reminded_at: string | null;
    confirmed_at: string | null;
}

interface RemindersData {
    date: string;
    rows: ReminderRow[];
    template: string;
    clinic_name: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** A reminder or confirmation changed: reload the grid. */
    onChanged: () => void;
}

const VARIABLES = [
    'primeiro_nome',
    'data',
    'horario',
    'profissional',
    'sala',
    'clinica',
];

/**
 * Next day's classes with a one-click WhatsApp reminder each, and who
 * confirmed. The message opens in WhatsApp from the front desk's phone or
 * WhatsApp Web; the system records that it was sent.
 */
export function AgendaRemindersSheet({ open, onOpenChange, onChanged }: Props) {
    const { can } = usePermissions();
    const [date, setDate] = useState(() => addDays(todayISO(), 1));
    const [reloadKey, setReloadKey] = useState(0);
    const [result, setResult] = useState<{
        key: string;
        data: RemindersData;
    } | null>(null);
    const [editing, setEditing] = useState(false);
    const [templateText, setTemplateText] = useState('');
    const [saving, setSaving] = useState(false);

    const key = `${date}|${reloadKey}`;

    useEffect(() => {
        let cancelled = false;

        axios
            .get<RemindersData>('/api/appointments/reminders', {
                params: { date: key.split('|')[0] },
            })
            .then((response) => {
                if (!cancelled) setResult({ key, data: response.data });
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [key]);

    const data = result?.key === key ? result.data : null;
    const reload = () => {
        setReloadKey((current) => current + 1);
        onChanged();
    };

    function send(row: ReminderRow, url: string) {
        // Open WhatsApp straight from the click so the browser allows it.
        window.open(url, '_blank', 'noopener,noreferrer');
        axios
            .post(
                `/appointments/${row.appointment_id}/patients/${row.patient_id}/whatsapp-reminder`,
            )
            .then(reload);
    }

    function toggleConfirmed(row: ReminderRow) {
        axios
            .post(
                `/appointments/${row.appointment_id}/patients/${row.patient_id}/confirmation`,
                { confirmed: !row.confirmed_at },
            )
            .then(reload);
    }

    function saveTemplate() {
        router.patch(
            '/message-templates',
            { reminder: templateText },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
                onSuccess: () => {
                    setEditing(false);
                    setReloadKey((current) => current + 1);
                },
            },
        );
    }

    const sent = data?.rows.filter((row) => row.reminded_at).length ?? 0;
    const confirmed = data?.rows.filter((row) => row.confirmed_at).length ?? 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
                <SheetHeader className="mb-2">
                    <SheetTitle>Lembretes por WhatsApp</SheetTitle>
                    <SheetDescription>
                        Envie o lembrete da aula e marque quem confirmou
                        presença.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 px-4 pb-8">
                    <div className="flex flex-wrap items-center gap-3">
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) =>
                                e.target.value && setDate(e.target.value)
                            }
                            className="w-44"
                            aria-label="Dia das aulas"
                        />
                        {data && (
                            <span className="text-sm text-muted-foreground">
                                {data.rows.length} aula(s) · {sent} lembrete(s)
                                · {confirmed} confirmada(s)
                            </span>
                        )}
                        {can('patients.manage.edit') && data && !editing && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto"
                                onClick={() => {
                                    setTemplateText(data.template);
                                    setEditing(true);
                                }}
                            >
                                <PencilLine className="size-4" />
                                Editar mensagem
                            </Button>
                        )}
                    </div>

                    {editing && (
                        <div className="space-y-2 rounded-xl border border-border/60 p-3">
                            <textarea
                                value={templateText}
                                onChange={(e) =>
                                    setTemplateText(e.target.value)
                                }
                                className="flex min-h-[140px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                            />
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <span>Inserir:</span>
                                {VARIABLES.map((variable) => (
                                    <button
                                        key={variable}
                                        type="button"
                                        onClick={() =>
                                            setTemplateText(
                                                (text) =>
                                                    `${text}{${variable}}`,
                                            )
                                        }
                                        className="rounded-md bg-muted px-2 py-0.5 font-mono text-foreground hover:bg-primary/10 hover:text-primary"
                                    >
                                        {`{${variable}}`}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Deixe em branco para voltar ao texto padrão.
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditing(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={saveTemplate}
                                    disabled={saving}
                                >
                                    Salvar mensagem
                                </Button>
                            </div>
                        </div>
                    )}

                    {!data ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="size-6 animate-spin text-primary" />
                        </div>
                    ) : data.rows.length === 0 ? (
                        <p className="py-12 text-center text-sm text-muted-foreground">
                            Nenhuma aula neste dia.
                        </p>
                    ) : (
                        <ul className="divide-y divide-border/50 rounded-xl border border-border/50">
                            {data.rows.map((row) => {
                                const url = whatsappUrl(
                                    row.phone,
                                    renderReminder(data.template, {
                                        name: row.patient_name,
                                        nickname: row.nickname,
                                        date: data.date,
                                        time: row.time,
                                        professional: row.professional_name,
                                        room: row.room,
                                        clinic: data.clinic_name,
                                    }),
                                );

                                return (
                                    <li
                                        key={`${row.appointment_id}-${row.patient_id}`}
                                        className="flex flex-wrap items-center gap-3 p-3"
                                    >
                                        <span className="w-12 text-sm font-semibold tabular-nums">
                                            {row.time}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {row.patient_name}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {[
                                                    row.professional_name,
                                                    row.room,
                                                    row.phone
                                                        ? formatPhone(row.phone)
                                                        : 'sem telefone',
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </p>
                                        </div>
                                        {can('appointments.manage.edit') && (
                                            <div className="flex items-center gap-1.5">
                                                <Button
                                                    size="sm"
                                                    variant={
                                                        row.reminded_at
                                                            ? 'outline'
                                                            : 'default'
                                                    }
                                                    disabled={!url}
                                                    onClick={() =>
                                                        url && send(row, url)
                                                    }
                                                    className={
                                                        row.reminded_at
                                                            ? ''
                                                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                    }
                                                >
                                                    {row.reminded_at ? (
                                                        <Check className="size-4" />
                                                    ) : (
                                                        <MessageCircle className="size-4" />
                                                    )}
                                                    {row.reminded_at
                                                        ? 'Enviado'
                                                        : 'Enviar'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={
                                                        row.confirmed_at
                                                            ? 'secondary'
                                                            : 'ghost'
                                                    }
                                                    onClick={() =>
                                                        toggleConfirmed(row)
                                                    }
                                                    title={
                                                        row.confirmed_at
                                                            ? 'Desfazer confirmação'
                                                            : 'Marcar como confirmado'
                                                    }
                                                    className={
                                                        row.confirmed_at
                                                            ? 'text-sky-700 dark:text-sky-300'
                                                            : 'text-muted-foreground'
                                                    }
                                                >
                                                    <BadgeCheck className="size-4" />
                                                    {row.confirmed_at
                                                        ? 'Confirmou'
                                                        : 'Confirmar'}
                                                </Button>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
