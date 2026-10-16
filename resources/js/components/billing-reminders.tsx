import { Link, router } from '@inertiajs/react';
import axios from 'axios';
import { Check, MessageCircle, PencilLine, QrCode } from 'lucide-react';
import { useState } from 'react';
import { PatientLink } from '@/components/patient-link';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { formatBRL, formatDateBR, renderBillingMessage } from '@/lib/billing';
import { whatsappUrl } from '@/lib/whatsapp';

export interface BillingReminder {
    id: string;
    patient_id: string;
    patient_name: string;
    nickname: string | null;
    phone: string | null;
    amount: number;
    due_date: string;
    stage: 'before' | 'due' | 'overdue';
    days: number;
    reference: string;
    pix: string | null;
    reminded_at: string | null;
}

export interface BillingTemplates {
    billing_before: string;
    billing_due: string;
    billing_overdue: string;
}

const STAGES: Array<{
    key: BillingReminder['stage'];
    label: string;
    template: keyof BillingTemplates;
}> = [
    {
        key: 'before',
        label: 'Vencem em até 3 dias',
        template: 'billing_before',
    },
    { key: 'due', label: 'Vencem hoje', template: 'billing_due' },
    { key: 'overdue', label: 'Vencidas', template: 'billing_overdue' },
];

const VARIABLES = [
    'primeiro_nome',
    'valor',
    'vencimento',
    'dias',
    'referente',
    'pix',
    'clinica',
];

/**
 * WhatsApp billing reminders, before, on and after the due date. Each
 * message opens in WhatsApp (phone or WhatsApp Web) ready to send, with the
 * PIX code when the clinic has a key; the system records that it was sent.
 */
export function BillingReminders({
    reminders,
    templates,
    clinicName,
    hasPix,
    onShowPix,
}: {
    reminders: BillingReminder[];
    templates: BillingTemplates;
    clinicName: string;
    hasPix: boolean;
    onShowPix: (reminder: BillingReminder) => void;
}) {
    const { can } = usePermissions();
    const [stage, setStage] = useState<BillingReminder['stage']>(() =>
        reminders.some((r) => r.stage === 'overdue')
            ? 'overdue'
            : reminders.some((r) => r.stage === 'due')
              ? 'due'
              : 'before',
    );
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<BillingTemplates>(templates);
    const [saving, setSaving] = useState(false);

    const current = STAGES.find((s) => s.key === stage)!;
    const rows = reminders.filter((r) => r.stage === stage);

    function send(reminder: BillingReminder, url: string) {
        // Open WhatsApp straight from the click so the browser allows it.
        window.open(url, '_blank', 'noopener,noreferrer');
        axios
            .post(`/financial/${reminder.id}/whatsapp-reminder`)
            .then(() => router.reload({ only: ['reminders'] }));
    }

    function saveTemplates() {
        router.patch(
            '/message-templates',
            { ...draft },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
                onSuccess: () => setEditing(false),
            },
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-sm backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
                <div>
                    <h2 className="flex items-center gap-2 font-semibold">
                        <MessageCircle className="size-4 text-emerald-600" />
                        Lembretes de cobrança
                    </h2>
                    {!hasPix && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Cadastre a chave PIX no{' '}
                            <Link
                                href="/settings/organization"
                                className="text-primary hover:underline"
                            >
                                Perfil da Clínica
                            </Link>{' '}
                            para enviar o PIX copia e cola junto.
                        </p>
                    )}
                </div>
                {can('financial.transactions.edit') && !editing && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setDraft(templates);
                            setEditing(true);
                        }}
                    >
                        <PencilLine className="size-4" />
                        Editar mensagens
                    </Button>
                )}
            </div>

            <div className="flex flex-wrap gap-1 border-b border-border/50 px-5 py-2">
                {STAGES.map((item) => {
                    const count = reminders.filter(
                        (r) => r.stage === item.key,
                    ).length;

                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => setStage(item.key)}
                            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                stage === item.key
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            {item.label}
                            <span className="ml-1.5 text-xs tabular-nums opacity-70">
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {editing && (
                <div className="space-y-2 border-b border-border/50 bg-muted/20 px-5 py-4">
                    <label className="text-sm font-medium">
                        Mensagem — {current.label.toLowerCase()}
                    </label>
                    <textarea
                        value={draft[current.template]}
                        onChange={(e) =>
                            setDraft({
                                ...draft,
                                [current.template]: e.target.value,
                            })
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
                                    setDraft({
                                        ...draft,
                                        [current.template]: `${draft[current.template]}{${variable}}`,
                                    })
                                }
                                className="rounded-md bg-muted px-2 py-0.5 font-mono text-foreground hover:bg-primary/10 hover:text-primary"
                            >
                                {`{${variable}}`}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        As três abas têm mensagens próprias. Em branco, volta ao
                        texto padrão.
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
                            onClick={saveTemplates}
                            disabled={saving}
                        >
                            Salvar mensagens
                        </Button>
                    </div>
                </div>
            )}

            {rows.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Nada para lembrar aqui.
                </p>
            ) : (
                <ul className="divide-y divide-border/50">
                    {rows.map((reminder) => {
                        const url = whatsappUrl(
                            reminder.phone,
                            renderBillingMessage(templates[current.template], {
                                name: reminder.patient_name,
                                nickname: reminder.nickname,
                                amount: reminder.amount,
                                dueDate: reminder.due_date,
                                days: reminder.days,
                                reference: reminder.reference,
                                clinic: clinicName,
                                pix: reminder.pix,
                            }),
                        );

                        return (
                            <li
                                key={reminder.id}
                                className="flex flex-wrap items-center gap-3 px-5 py-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <PatientLink
                                        patientId={reminder.patient_id}
                                        tab="financial"
                                        className="block truncate text-sm font-semibold hover:text-primary"
                                    >
                                        {reminder.patient_name}
                                    </PatientLink>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {reminder.reference} · vence{' '}
                                        {formatDateBR(reminder.due_date)}
                                        {reminder.stage === 'overdue' &&
                                            ` · há ${reminder.days} dia(s)`}
                                        {!reminder.phone && ' · sem telefone'}
                                    </p>
                                </div>
                                <span className="text-sm font-semibold tabular-nums">
                                    {formatBRL(reminder.amount)}
                                </span>
                                {hasPix && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onShowPix(reminder)}
                                        title="PIX copia e cola e QR Code"
                                    >
                                        <QrCode className="size-4" />
                                    </Button>
                                )}
                                {can('financial.transactions.edit') && (
                                    <Button
                                        size="sm"
                                        variant={
                                            reminder.reminded_at
                                                ? 'outline'
                                                : 'default'
                                        }
                                        disabled={!url}
                                        onClick={() =>
                                            url && send(reminder, url)
                                        }
                                        className={
                                            reminder.reminded_at
                                                ? ''
                                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        }
                                        title={
                                            reminder.reminded_at
                                                ? `Enviado em ${formatDateBR(reminder.reminded_at)}`
                                                : undefined
                                        }
                                    >
                                        {reminder.reminded_at ? (
                                            <Check className="size-4" />
                                        ) : (
                                            <MessageCircle className="size-4" />
                                        )}
                                        {reminder.reminded_at
                                            ? 'Enviado'
                                            : 'Enviar'}
                                    </Button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
