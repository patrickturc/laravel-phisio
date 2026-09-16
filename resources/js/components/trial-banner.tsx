import { Link, usePage } from '@inertiajs/react';
import { Clock, Sparkles } from 'lucide-react';

interface TrialData {
    days_left: number | null;
    ends_at: string | null;
    has_pending_request: boolean;
}

export function TrialBanner() {
    const { trial } = usePage<{ trial?: TrialData | null }>().props;

    if (!trial) {
        return null;
    }

    const days = trial.days_left ?? 0;
    // The last stretch of the trial gets a warmer, more urgent treatment.
    const urgent = days <= 3;

    return (
        <div
            className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-sm ${
                urgent
                    ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200'
                    : 'border-primary/20 bg-primary/5 text-foreground'
            }`}
        >
            <div className="flex items-center gap-2">
                {urgent ? (
                    <Clock className="size-4 shrink-0" />
                ) : (
                    <Sparkles className="size-4 shrink-0 text-primary" />
                )}
                <span>
                    {days === 0 ? (
                        <>
                            <strong>Último dia de teste.</strong> Contrate um
                            plano para não perder o acesso.
                        </>
                    ) : (
                        <>
                            <strong>
                                {days}{' '}
                                {days === 1 ? 'dia restante' : 'dias restantes'}
                            </strong>{' '}
                            no seu período de teste.
                        </>
                    )}
                </span>
            </div>

            <Link
                href="/assinatura"
                className={`shrink-0 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                    urgent
                        ? 'bg-amber-900 text-amber-50 hover:bg-amber-800'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
            >
                {trial.has_pending_request
                    ? 'Ver solicitação'
                    : 'Escolher plano'}
            </Link>
        </div>
    );
}
