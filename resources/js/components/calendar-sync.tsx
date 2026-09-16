import { usePage, router } from '@inertiajs/react';
import { CalendarDays, Copy, RefreshCw, Unplug } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generate, revoke } from '@/routes/profile/calendar-token';

export default function CalendarSync() {
    const { auth } = usePage().props as any;
    const [generating, setGenerating] = useState(false);
    const [revoking, setRevoking] = useState(false);

    const hasToken = !!auth.user.calendar_token;

    // Construct the absolute feed URL
    const feedUrl = hasToken
        ? `${window.location.origin}/feed/calendar/${auth.user.calendar_token}.ics`
        : '';

    const webcalUrl = hasToken
        ? feedUrl.replace(/^https?:\/\//i, 'webcal://')
        : '';

    const handleGenerate = () => {
        setGenerating(true);
        router.post(
            generate().url,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Link gerado com sucesso!');
                },
                onFinish: () => setGenerating(false),
            },
        );
    };

    const handleRevoke = () => {
        if (
            !confirm(
                'Tem certeza? Isso fará com que o link antigo pare de funcionar nas suas agendas.',
            )
        )
            return;

        setRevoking(true);
        router.delete(revoke().url, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Sincronização desativada.');
            },
            onFinish: () => setRevoking(false),
        });
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(feedUrl);
        toast.success('Link copiado para a área de transferência!');
    };

    return (
        <div className="space-y-6">
            <Heading
                variant="small"
                title="Sincronização de Agenda"
                description="Conecte a agenda do Phisio ao seu Outlook, Google Calendar ou Apple Calendar."
            />

            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="space-y-4 p-6">
                    {!hasToken ? (
                        <div className="space-y-4 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <CalendarDays className="h-6 w-6" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">
                                    Sincronize seus agendamentos
                                </h3>
                                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                                    Gere um link secreto para visualizar suas
                                    consultas diretamente no seu app de
                                    calendário preferido.
                                </p>
                            </div>
                            <Button
                                onClick={handleGenerate}
                                disabled={generating}
                            >
                                {generating && (
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Gerar Link de Sincronização
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Seu Link Secreto (Feed iCal)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        readOnly
                                        value={feedUrl}
                                        className="bg-muted font-mono text-sm"
                                    />
                                    <Button
                                        variant="secondary"
                                        onClick={copyToClipboard}
                                    >
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copiar
                                    </Button>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Copie este link e adicione como uma nova
                                    agenda "Por URL" no seu Outlook ou Google
                                    Calendar.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 border-t pt-4">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="gap-2"
                                >
                                    <a href={webcalUrl}>
                                        <CalendarDays className="h-4 w-4" />
                                        Abrir no App de Calendário
                                    </a>
                                </Button>

                                <Button
                                    variant="ghost"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={handleRevoke}
                                    disabled={revoking}
                                >
                                    {revoking ? (
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Unplug className="mr-2 h-4 w-4" />
                                    )}
                                    Desativar Sincronização
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
