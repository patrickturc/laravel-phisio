import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Check,
    Clock,
    LogOut,
    Mail,
    Sparkles,
} from 'lucide-react';
import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type TenantInfo = {
    name: string;
    plan: string;
    access_status: string;
    is_on_trial: boolean;
    is_trial_expired: boolean;
    trial_days_left: number | null;
    trial_ends_at: string | null;
    requested_plan: string | null;
    plan_requested_at: string | null;
    has_pending_plan_request: boolean;
};

type Props = {
    tenant: TenantInfo;
    contactEmail: string | null;
    canManage: boolean;
};

const plans = [
    {
        key: 'basic',
        name: 'Essencial',
        tagline: 'Para quem atende sozinho ou em dupla.',
        features: [
            'Agenda e prontuário completos',
            'Evoluções SOAP com fotos',
            'Matrículas e planos comerciais',
            'Até 3 usuários',
        ],
    },
    {
        key: 'pro',
        name: 'Clínica',
        tagline: 'Para equipes que precisam de gestão e relatórios.',
        features: [
            'Tudo do Essencial',
            'Financeiro e gastos recorrentes',
            'Relatórios gerenciais',
            'Turmas de Pilates e perfis de acesso',
        ],
    },
];

function formatDate(value: string | null) {
    if (!value) return null;

    return new Date(value).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

export default function SubscriptionIndex({ tenant, contactEmail, canManage }: Props) {
    const { flash } = usePage<{
        flash?: { success?: string; error?: string; warning?: string };
    }>().props;

    const { data, setData, post, processing, errors } = useForm({
        requested_plan: tenant.requested_plan || 'basic',
        plan_request_notes: '',
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
        if (flash?.warning) toast.warning(flash.warning);
    }, [flash]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/assinatura/solicitar', { preserveScroll: true });
    };

    const expired = tenant.is_trial_expired;
    const trialEnd = formatDate(tenant.trial_ends_at);
    const requestedAt = formatDate(tenant.plan_requested_at);

    return (
        <div className="min-h-svh bg-background">
            <Head title="Assinatura - Phisio" />

            <header className="border-b border-border">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary-foreground text-primary-foreground">
                            <Sparkles className="size-4" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">{tenant.name}</p>
                            <p className="text-xs text-muted-foreground">Plano atual: {tenant.plan}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!expired && (
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/dashboard">Voltar ao sistema</Link>
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.post('/logout')}
                            className="gap-1.5"
                        >
                            <LogOut className="size-4" />
                            Sair
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-6 py-10">
                {/* Status */}
                <div
                    className={`mb-10 rounded-2xl border p-6 ${
                        expired
                            ? 'border-destructive/30 bg-destructive/5'
                            : 'border-primary/20 bg-primary/5'
                    }`}
                >
                    <div className="flex items-start gap-4">
                        <div
                            className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                                expired
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-primary/10 text-primary'
                            }`}
                        >
                            {expired ? <AlertTriangle className="size-5" /> : <Clock className="size-5" />}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                                {expired
                                    ? 'Seu período de teste terminou'
                                    : `Faltam ${tenant.trial_days_left} dias de teste`}
                            </h1>
                            <p className="mt-1.5 text-muted-foreground">
                                {expired
                                    ? 'O acesso ao sistema está pausado, mas seus dados continuam salvos. Escolha um plano abaixo para retomar de onde parou.'
                                    : `Seu teste vai até ${trialEnd}. Escolha um plano quando quiser, sem perder nada do que já cadastrou.`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pending request */}
                {tenant.has_pending_plan_request && (
                    <div className="mb-10 rounded-2xl border border-secondary-foreground/20 bg-secondary/40 p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                                <Check className="size-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-foreground">Solicitação em análise</h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Recebemos seu pedido do plano{' '}
                                    <strong className="text-foreground">{tenant.requested_plan}</strong>
                                    {requestedAt ? ` em ${requestedAt}` : ''}. Nossa equipe entrará em contato
                                    para concluir a ativação.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Plans */}
                <h2 className="mb-1 text-lg font-semibold text-foreground">Escolha seu plano</h2>
                <p className="mb-6 text-sm text-muted-foreground">
                    A ativação é feita pela nossa equipe após o contato. Você não é cobrado agora.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 md:grid-cols-2">
                        {plans.map((plan) => {
                            const selected = data.requested_plan === plan.key;

                            return (
                                <button
                                    key={plan.key}
                                    type="button"
                                    onClick={() => setData('requested_plan', plan.key)}
                                    disabled={!canManage}
                                    className={`rounded-2xl border p-6 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                                        selected
                                            ? 'border-primary bg-card shadow-md ring-2 ring-primary/20'
                                            : 'border-border bg-card hover:border-primary/40'
                                    }`}
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                                        <span
                                            className={`flex size-5 items-center justify-center rounded-full border ${
                                                selected
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border'
                                            }`}
                                        >
                                            {selected && <Check className="size-3" />}
                                        </span>
                                    </div>
                                    <p className="mb-4 text-sm text-muted-foreground">{plan.tagline}</p>
                                    <ul className="space-y-2">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-start gap-2 text-sm text-foreground/90">
                                                <Check className="mt-0.5 size-4 shrink-0 text-secondary-foreground" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </button>
                            );
                        })}
                    </div>
                    <InputError message={errors.requested_plan} className="mt-2" />

                    <div className="mt-6 grid gap-2">
                        <Label htmlFor="plan_request_notes">
                            Observações <span className="font-normal text-muted-foreground">(opcional)</span>
                        </Label>
                        <textarea
                            id="plan_request_notes"
                            value={data.plan_request_notes}
                            onChange={(e) => setData('plan_request_notes', e.target.value)}
                            disabled={!canManage}
                            rows={3}
                            maxLength={2000}
                            placeholder="Quantos profissionais vão usar, melhor horário para contato, dúvidas..."
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
                        />
                        <InputError message={errors.plan_request_notes} />
                    </div>

                    {canManage ? (
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Button type="submit" disabled={processing} className="gap-2">
                                {processing && <Spinner className="mr-1" />}
                                {tenant.has_pending_plan_request
                                    ? 'Atualizar solicitação'
                                    : 'Solicitar plano'}
                                <ArrowRight className="size-4" />
                            </Button>

                            {contactEmail && (
                                <a
                                    href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Contratação de plano - ${tenant.name}`)}`}
                                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                                >
                                    <Mail className="size-4" />
                                    Falar com a equipe
                                </a>
                            )}
                        </div>
                    ) : (
                        <p className="mt-6 rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                            Somente um administrador da organização pode solicitar a contratação do plano. Fale
                            com quem administra a conta de {tenant.name}.
                        </p>
                    )}
                </form>
            </main>

            <Toaster position="top-right" richColors closeButton theme="system" />
        </div>
    );
}
