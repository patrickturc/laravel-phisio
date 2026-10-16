import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, Info } from 'lucide-react';

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
 * Quiet, one-line reminder to finish the organization registration. Not
 * dismissible: the data is needed for billing and the clinic's documents, and
 * the line disappears on its own once the form is completed. Hovering it lists
 * the missing fields.
 */
export function ProfileCompletionBanner() {
    const { profileCompletion } = usePage<{
        profileCompletion?: ProfileCompletion | null;
    }>().props;

    if (!profileCompletion || profileCompletion.complete) {
        return null;
    }

    const { missing, missing_count, percent, can_edit } = profileCompletion;
    const missingList = missing
        .map((field) => fieldLabels[field] ?? field)
        .join(', ');

    return (
        <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground"
            title={`Falta preencher: ${missingList}`}
        >
            <Info className="size-3.5 shrink-0 text-amber-500" />
            <span className="min-w-0 flex-1">
                Cadastro da clínica {percent}% completo · faltam {missing_count}{' '}
                {missing_count === 1 ? 'informação' : 'informações'}
                {!can_edit && ' (peça ao administrador da conta)'}
            </span>
            <span className="hidden h-1 w-20 overflow-hidden rounded-full bg-border sm:block">
                <span
                    className="block h-full rounded-full bg-amber-500 transition-[width] duration-500"
                    style={{ width: `${percent}%` }}
                />
            </span>
            {can_edit && (
                <Link
                    href="/settings/organization"
                    className="inline-flex shrink-0 items-center gap-1 font-medium text-foreground hover:text-primary hover:underline"
                >
                    Completar
                    <ArrowRight className="size-3" />
                </Link>
            )}
        </div>
    );
}
