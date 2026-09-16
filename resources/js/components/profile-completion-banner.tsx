import { Link, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface ProfileCompletion {
    complete: boolean;
    missing: string[];
    missing_count: number;
    percent: number;
    can_edit: boolean;
}

const fieldLabels: Record<string, string> = {
    document: 'CNPJ ou CPF',
    cep: 'CEP',
    street: 'Endereço',
    number: 'Número',
    neighborhood: 'Bairro',
    city: 'Cidade',
    state: 'Estado',
    technical_manager_name: 'Responsável técnico',
    technical_manager_document: 'Registro do responsável (CREFITO)',
};

/**
 * Persistent reminder to finish the organization registration. Deliberately
 * not dismissible: the missing data is needed for billing and for the clinic's
 * own documents, and it disappears on its own once the form is completed.
 */
export function ProfileCompletionBanner() {
    const { profileCompletion } = usePage<{ profileCompletion?: ProfileCompletion | null }>().props;

    if (!profileCompletion || profileCompletion.complete) {
        return null;
    }

    const { missing, missing_count, percent, can_edit } = profileCompletion;
    const preview = missing.slice(0, 3).map((field) => fieldLabels[field] ?? field);
    const rest = missing_count - preview.length;

    return (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold">
                            Cadastro incompleto — faltam {missing_count}{' '}
                            {missing_count === 1 ? 'informação' : 'informações'}
                        </p>
                        <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
                            {can_edit
                                ? 'Complete os dados da clínica para emitir documentos e contratar um plano.'
                                : 'Peça ao administrador da conta para completar os dados da clínica.'}{' '}
                            Falta preencher: {preview.join(', ')}
                            {rest > 0 ? ` e mais ${rest}` : ''}.
                        </p>
                    </div>
                </div>

                {can_edit && (
                    <Link
                        href="/settings/organization"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-semibold text-amber-50 transition-colors hover:bg-amber-800"
                    >
                        Completar cadastro
                        <ArrowRight className="size-3.5" />
                    </Link>
                )}
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900/60">
                <div
                    className="h-full rounded-full bg-amber-600 transition-[width] duration-500 dark:bg-amber-400"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
