import { Head, router } from '@inertiajs/react';
import {
    Cake,
    CalendarDays,
    Check,
    Copy,
    GraduationCap,
    Info,
    MessageCircle,
    MessageSquareText,
    PencilLine,
    Search,
} from 'lucide-react';
import { useState } from 'react';
import { PatientLink } from '@/components/patient-link';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useClipboard } from '@/hooks/use-clipboard';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import { formatPhone, whatsappUrl } from '@/lib/whatsapp';
import type { BreadcrumbItem } from '@/types';

type Tab = 'birthdays' | 'enrollment';

interface CelebrationRow {
    id: string;
    name: string;
    nickname: string | null;
    phone: string | null;
    day: number;
    /** Age turning (birthdays) or years since enrollment. */
    years: number;
}

interface Templates {
    birthday: string;
    enrollment: string;
}

interface Props {
    tab: Tab;
    month: number;
    currentMonth: number;
    rows: CelebrationRow[];
    /** Index 0 = January. */
    monthCounts: number[];
    templates: Templates;
    clinicName: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Aniversariantes', href: '/celebrations' },
];

const MONTHS = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
];

const TEMPLATE_KEY: Record<Tab, keyof Templates> = {
    birthdays: 'birthday',
    enrollment: 'enrollment',
};

const TIPS: Record<Tab, string> = {
    birthdays:
        'Aniversários são ótimos momentos para oferecer uma aula experimental para um amigo do paciente ou um pequeno brinde.',
    enrollment:
        'Celebre a fidelidade: um desconto na renovação ou uma aula especial reforça o vínculo de quem está com vocês há anos.',
};

const VARIABLES = ['primeiro_nome', 'nome', 'idade', 'anos', 'clinica'];

const textareaClass =
    'flex min-h-[180px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none';

function normalize(text: string): string {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function firstName(row: CelebrationRow): string {
    return (row.nickname || row.name).trim().split(/\s+/)[0];
}

function yearsLabel(years: number): string {
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
}

function renderTemplate(
    template: string,
    row: CelebrationRow,
    clinicName: string,
): string {
    const values: Record<string, string> = {
        nome: row.name,
        primeiro_nome: firstName(row),
        idade: String(row.years),
        anos: yearsLabel(row.years),
        clinica: clinicName,
    };

    return template.replace(
        /\{(\w+)\}/g,
        (match, key: string) => values[key] ?? match,
    );
}

export default function CelebrationsIndex({
    tab,
    month,
    currentMonth,
    rows,
    monthCounts,
    templates,
    clinicName,
}: Props) {
    const { can } = usePermissions();
    const [copiedText, copy] = useClipboard();
    const [search, setSearch] = useState('');

    const [messageRow, setMessageRow] = useState<CelebrationRow | null>(null);
    const [messageText, setMessageText] = useState('');

    const [templateOpen, setTemplateOpen] = useState(false);
    const [templateText, setTemplateText] = useState('');
    const [savingTemplate, setSavingTemplate] = useState(false);

    const templateKey = TEMPLATE_KEY[tab];
    const filtered = rows.filter((row) =>
        normalize(row.name).includes(normalize(search)),
    );
    const messageUrl = messageRow
        ? whatsappUrl(messageRow.phone, messageText)
        : null;

    function visit(params: { tab?: Tab; month?: number }) {
        router.get(
            '/celebrations',
            { tab, month, ...params },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function openMessage(row: CelebrationRow) {
        setMessageRow(row);
        setMessageText(renderTemplate(templates[templateKey], row, clinicName));
    }

    function openTemplate() {
        setTemplateText(templates[templateKey]);
        setTemplateOpen(true);
    }

    function saveTemplate() {
        router.patch(
            '/message-templates',
            { [templateKey]: templateText },
            {
                preserveScroll: true,
                onStart: () => setSavingTemplate(true),
                onFinish: () => setSavingTemplate(false),
                onSuccess: () => setTemplateOpen(false),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Aniversariantes - Phisio" />

            <div className="mx-auto flex h-full w-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-pink-500/10 p-2.5 text-pink-600">
                            <Cake className="size-6" />
                        </div>
                        <div>
                            <h1 className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                                Aniversariantes
                            </h1>
                            <p className="mt-1 text-muted-foreground">
                                Mantenha a conexão e celebre os momentos
                                importantes dos seus pacientes.
                            </p>
                        </div>
                    </div>
                    {can('patients.manage.edit') && (
                        <Button
                            variant="outline"
                            onClick={openTemplate}
                            className="rounded-xl"
                        >
                            <PencilLine className="size-4" />
                            Editar modelo de mensagem
                        </Button>
                    )}
                </div>

                <div className="flex w-fit rounded-xl border border-border/50 bg-muted/50 p-1">
                    {(
                        [
                            {
                                key: 'birthdays',
                                label: 'Aniversariantes',
                                icon: Cake,
                            },
                            {
                                key: 'enrollment',
                                label: 'Aniversário de matrícula',
                                icon: GraduationCap,
                            },
                        ] as const
                    ).map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => visit({ tab: item.key })}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                tab === item.key
                                    ? 'border border-border/50 bg-background text-primary shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            <item.icon className="size-4" />
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                    {/* Month selector */}
                    <div className="rounded-2xl border border-border/50 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
                        <h2 className="mb-3 flex items-center gap-2 px-2 font-semibold">
                            <CalendarDays className="size-4 text-primary" />
                            Selecionar mês
                        </h2>
                        <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                            {MONTHS.map((name, index) => {
                                const value = index + 1;
                                const active = value === month;

                                return (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => visit({ month: value })}
                                        className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                                            active
                                                ? 'bg-primary/10 font-semibold text-primary'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            {name}
                                            {value === currentMonth && (
                                                <span
                                                    className="size-1.5 rounded-full bg-primary"
                                                    title="Mês atual"
                                                />
                                            )}
                                        </span>
                                        {monthCounts[index] > 0 && (
                                            <span className="rounded-md bg-muted px-1.5 text-xs font-medium text-muted-foreground tabular-nums">
                                                {monthCounts[index]}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex min-w-0 flex-col gap-4">
                        {/* Search + counter */}
                        <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/60 p-4 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={
                                        tab === 'birthdays'
                                            ? 'Buscar em aniversariantes...'
                                            : 'Buscar em aniversários de matrícula...'
                                    }
                                    className="h-10 w-full rounded-xl border border-border bg-background pl-9 text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                />
                            </div>
                            <span className="rounded-lg bg-muted px-3 py-2 text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                {filtered.length}{' '}
                                {filtered.length === 1
                                    ? 'paciente'
                                    : 'pacientes'}{' '}
                                em {MONTHS[month - 1]}
                            </span>
                        </div>

                        {/* List */}
                        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-sm backdrop-blur-xl">
                            <div className="hidden grid-cols-[64px_1fr_190px_150px] gap-4 border-b border-border/50 px-5 py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase md:grid">
                                <span>Dia</span>
                                <span>Paciente</span>
                                <span>WhatsApp</span>
                                <span className="text-right">Mensagem</span>
                            </div>

                            {filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                                    <Cake className="mb-3 size-8 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">
                                        {rows.length === 0
                                            ? tab === 'birthdays'
                                                ? `Nenhum aniversariante em ${MONTHS[month - 1]}.`
                                                : `Nenhum aniversário de matrícula em ${MONTHS[month - 1]}.`
                                            : 'Nenhum paciente encontrado para a busca.'}
                                    </p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-border/50">
                                    {filtered.map((row) => {
                                        const chatUrl = whatsappUrl(row.phone);

                                        return (
                                            <li
                                                key={row.id}
                                                className="grid grid-cols-[48px_1fr] items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-muted/20 md:grid-cols-[64px_1fr_190px_150px]"
                                            >
                                                <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-sm font-bold tabular-nums">
                                                    {row.day}
                                                </span>
                                                <div className="min-w-0">
                                                    <PatientLink
                                                        patientId={row.id}
                                                        className="block truncate font-semibold hover:text-primary"
                                                    >
                                                        {row.name}
                                                    </PatientLink>
                                                    <p className="text-xs text-muted-foreground">
                                                        {tab === 'birthdays'
                                                            ? `Faz ${yearsLabel(row.years)}`
                                                            : `${yearsLabel(row.years)} de casa`}
                                                    </p>
                                                </div>
                                                <div className="col-start-2 md:col-start-auto">
                                                    {chatUrl ? (
                                                        <a
                                                            href={chatUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                                                        >
                                                            <MessageCircle className="size-4" />
                                                            {formatPhone(
                                                                row.phone,
                                                            )}
                                                        </a>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">
                                                            Sem telefone
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="col-start-2 md:col-start-auto md:text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openMessage(row)
                                                        }
                                                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                                                    >
                                                        <MessageSquareText className="size-4" />
                                                        Criar mensagem
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Tip */}
                        <div className="flex gap-4 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-xl">
                            <div className="h-fit rounded-xl bg-primary/10 p-2.5 text-primary">
                                <Info className="size-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold">
                                    Dica de fidelização
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {TIPS[tab]}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Message for one patient */}
            <Dialog
                open={messageRow !== null}
                onOpenChange={(open) => !open && setMessageRow(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Mensagem para{' '}
                            {messageRow ? firstName(messageRow) : ''}
                        </DialogTitle>
                        <DialogDescription>
                            Ajuste o texto se quiser e envie pelo WhatsApp.
                        </DialogDescription>
                    </DialogHeader>
                    <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className={textareaClass}
                    />
                    {messageRow && !messageUrl && (
                        <p className="text-xs text-amber-600">
                            Este paciente não tem um telefone válido. Copie a
                            mensagem para enviar por outro canal.
                        </p>
                    )}
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            variant="outline"
                            onClick={() => copy(messageText)}
                        >
                            {copiedText === messageText ? (
                                <Check className="size-4" />
                            ) : (
                                <Copy className="size-4" />
                            )}
                            {copiedText === messageText ? 'Copiado' : 'Copiar'}
                        </Button>
                        <Button
                            disabled={!messageUrl}
                            onClick={() =>
                                messageUrl &&
                                window.open(
                                    messageUrl,
                                    '_blank',
                                    'noopener,noreferrer',
                                )
                            }
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            <MessageCircle className="size-4" />
                            Abrir no WhatsApp
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Clinic template */}
            <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Modelo —{' '}
                            {tab === 'birthdays'
                                ? 'aniversário'
                                : 'aniversário de matrícula'}
                        </DialogTitle>
                        <DialogDescription>
                            Texto usado como ponto de partida em "Criar
                            mensagem". Deixe em branco para voltar ao padrão.
                        </DialogDescription>
                    </DialogHeader>
                    <textarea
                        value={templateText}
                        onChange={(e) => setTemplateText(e.target.value)}
                        className={textareaClass}
                    />
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Inserir:</span>
                        {VARIABLES.map((variable) => (
                            <button
                                key={variable}
                                type="button"
                                onClick={() =>
                                    setTemplateText(
                                        (text) => `${text}{${variable}}`,
                                    )
                                }
                                className="rounded-md bg-muted px-2 py-0.5 font-mono text-foreground hover:bg-primary/10 hover:text-primary"
                            >
                                {`{${variable}}`}
                            </button>
                        ))}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setTemplateOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={saveTemplate}
                            disabled={savingTemplate}
                        >
                            {savingTemplate ? 'Salvando...' : 'Salvar modelo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
