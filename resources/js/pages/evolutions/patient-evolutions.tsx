import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Activity,
    Plus,
    Calendar as CalendarIcon,
    User,
} from 'lucide-react';
import { useState } from 'react';
import EvolutionFormSheet from '@/components/EvolutionFormSheet';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const tipoLabel: Record<string, string> = {
    avaliacao: 'Avaliação',
    reavaliacao: 'Reavaliação',
    sessao: 'Sessão',
    simple: 'Evolução Rápida',
};

export default function PatientEvolutions({
    patient,
    evolutions,
    protocols = [],
}: {
    patient: any;
    evolutions: any[];
    protocols?: any[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Evoluções', href: '/evolutions' },
        {
            title: `Evoluções de ${patient.name}`,
            href: `/evolutions/patient/${patient.id}`,
        },
    ];

    const { can } = usePermissions();
    const [isEvolutionSheetOpen, setIsEvolutionSheetOpen] = useState(false);
    const [editingEvolution, setEditingEvolution] = useState<any>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Evoluções - ${patient.name}`} />

            <div className="mx-auto flex h-full w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/evolutions"
                            className="-ml-2 rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div>
                            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                                <User className="size-6 text-primary" />
                                {patient.name}
                            </h1>
                            <p className="mt-1 text-muted-foreground">
                                Histórico completo de evoluções e avaliações do
                                paciente.
                            </p>
                        </div>
                    </div>

                    {can('evolutions.manage.create') && (
                        <button
                            onClick={() => {
                                setEditingEvolution(null);
                                setIsEvolutionSheetOpen(true);
                            }}
                            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                        >
                            <Plus className="size-4" /> Nova Evolução
                        </button>
                    )}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-lg font-bold">
                                <Activity className="size-5 text-primary" />{' '}
                                Prontuário
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                    ({evolutions.length} registros)
                                </span>
                            </h2>
                        </div>

                        {evolutions.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
                                <Activity className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                                <p className="text-sm font-medium text-muted-foreground">
                                    Nenhuma evolução registrada.
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    O histórico clínico do paciente aparecerá
                                    aqui.
                                </p>
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="absolute top-2 bottom-2 left-[18px] w-0.5 bg-border/50" />
                                <div className="space-y-1">
                                    {evolutions.map((evo, i) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            key={evo.id}
                                            className="group relative flex gap-4 rounded-xl py-3 pl-10 transition-colors hover:bg-muted/20"
                                        >
                                            <div className="absolute top-5 left-2.5 size-3 rounded-full border-2 border-background bg-indigo-500" />
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                                        <CalendarIcon className="size-3" />
                                                        {new Date(
                                                            evo.data_atendimento,
                                                        ).toLocaleDateString(
                                                            'pt-BR',
                                                            { timeZone: 'UTC' },
                                                        )}
                                                    </span>
                                                    <span
                                                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                                                            evo.tipo_atendimento ===
                                                            'avaliacao'
                                                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                                : evo.tipo_atendimento ===
                                                                    'reavaliacao'
                                                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        }`}
                                                    >
                                                        {tipoLabel[
                                                            evo.tipo_atendimento
                                                        ] ||
                                                            evo.tipo_atendimento}
                                                    </span>
                                                    {evo.dor_eva !== null &&
                                                        evo.dor_eva !==
                                                            undefined && (
                                                            <span className="rounded-md border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                                                Dor EVA:{' '}
                                                                {evo.dor_eva}
                                                            </span>
                                                        )}
                                                </div>
                                                <div className="mt-2 space-y-1 text-sm text-foreground">
                                                    {evo.observacoes ? (
                                                        <p>
                                                            <strong>
                                                                Resumo:
                                                            </strong>{' '}
                                                            {evo.observacoes}
                                                        </p>
                                                    ) : (
                                                        <>
                                                            {evo.queixa_principal && (
                                                                <p>
                                                                    <strong>
                                                                        Subjetivo:
                                                                    </strong>{' '}
                                                                    {
                                                                        evo.queixa_principal
                                                                    }
                                                                </p>
                                                            )}
                                                            {evo.condutas_realizadas && (
                                                                <p>
                                                                    <strong>
                                                                        Objetivo
                                                                        (Condutas):
                                                                    </strong>{' '}
                                                                    {
                                                                        evo.condutas_realizadas
                                                                    }
                                                                </p>
                                                            )}
                                                            {evo.analise_profissional && (
                                                                <p>
                                                                    <strong>
                                                                        Análise:
                                                                    </strong>{' '}
                                                                    {
                                                                        evo.analise_profissional
                                                                    }
                                                                </p>
                                                            )}
                                                            {evo.conduta_planejada && (
                                                                <p>
                                                                    <strong>
                                                                        Plano:
                                                                    </strong>{' '}
                                                                    {
                                                                        evo.conduta_planejada
                                                                    }
                                                                </p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 self-center">
                                                <Link
                                                    href={`/evolutions/${evo.id}`}
                                                    className="text-xs font-medium text-primary hover:underline"
                                                >
                                                    Detalhes completos →
                                                </Link>
                                                {can(
                                                    'evolutions.manage.edit',
                                                ) && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingEvolution(
                                                                evo,
                                                            );
                                                            setIsEvolutionSheetOpen(
                                                                true,
                                                            );
                                                        }}
                                                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                                                    >
                                                        Editar
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            <EvolutionFormSheet
                isOpen={isEvolutionSheetOpen}
                onOpenChange={setIsEvolutionSheetOpen}
                evolution={editingEvolution}
                patients={[patient]}
                protocols={protocols}
                patientId={patient.id}
            />
        </AppLayout>
    );
}
