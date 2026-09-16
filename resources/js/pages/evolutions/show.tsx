import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Trash2, Download } from 'lucide-react';
import { useState } from 'react';
import { useConfirmModal } from '@/components/confirm-modal';
import EvolutionFormSheet from '@/components/EvolutionFormSheet';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface Evolution {
    id: string;
    paciente_id: string;
    clinical_protocol_id: string | null;
    data_atendimento: string;
    tipo_atendimento: string;
    queixa_principal: string | null;
    relato_paciente: string | null;
    dor_eva: number | null;
    localizacao_dor: string | null;
    tipo_dor: string | null;
    pressao_arterial: string | null;
    frequencia_cardiaca: string | null;
    saturacao: string | null;
    condutas_realizadas: string | null;
    analise_profissional: string | null;
    resposta_tratamento: string | null;
    conduta_planejada: string | null;
    orientacoes_domiciliares: string | null;
    observacoes: string | null;
    patient: { id: string; name: string; type: string };
    professional?: { id: string; name: string } | null;
}

// Hoisted out of EvolutionShow: defined inside the component, these would get
// a new function identity every render, so React would treat every update as
// an unmount+remount (replaying Section's enter animation on every keystroke
// elsewhere on the page instead of just reconciling its props).
function Section({
    title,
    color,
    children,
}: {
    title: string;
    color: string;
    children: React.ReactNode;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
        >
            <h2 className="text-lg font-bold">
                <span className={`${color} mr-1`}>{title.charAt(0)}</span> —{' '}
                {title}
            </h2>
            {children}
        </motion.div>
    );
}

function Field({
    label,
    value,
}: {
    label: string;
    value: string | number | null | undefined;
}) {
    return value ? (
        <div>
            <p className="mb-0.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {label}
            </p>
            <p className="text-sm whitespace-pre-wrap">{value}</p>
        </div>
    ) : null;
}

export default function EvolutionShow({
    evolution,
    protocols = [],
}: {
    evolution: Evolution;
    protocols?: Array<{ id: string; name: string }>;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Evoluções', href: '/evolutions' },
        {
            title: new Date(evolution.data_atendimento).toLocaleDateString(
                'pt-BR',
            ),
            href: `/evolutions/${evolution.id}`,
        },
    ];

    const { can } = usePermissions();
    const [isEvolutionSheetOpen, setIsEvolutionSheetOpen] = useState(false);
    const { confirm, modal } = useConfirmModal();

    async function handleDelete() {
        const confirmed = await confirm({
            title: 'Excluir Evolução',
            message: 'Tem certeza que deseja excluir esta evolução?',
            confirmLabel: 'Excluir',
        });
        if (confirmed) router.delete(`/evolutions/${evolution.id}`);
    }

    const tipoLabel: Record<string, string> = {
        avaliacao: 'Avaliação',
        reavaliacao: 'Reavaliação',
        sessao: 'Sessão',
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evolução" />
            <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col gap-6 p-6 md:p-10">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/evolutions"
                            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Evolução - {evolution.patient.name}
                            </h1>
                            <div className="mt-1 flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    {new Date(
                                        evolution.data_atendimento,
                                    ).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                                    {tipoLabel[evolution.tipo_atendimento] ||
                                        evolution.tipo_atendimento}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={`/evolutions/${evolution.id}/pdf`}
                            target="_blank"
                            className="rounded-xl border border-border/50 p-2.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                            title="Exportar PDF"
                        >
                            <Download className="size-4" />
                        </a>
                        {can('evolutions.manage.edit') && (
                            <button
                                onClick={() => setIsEvolutionSheetOpen(true)}
                                className="rounded-xl border border-border/50 p-2.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                            >
                                <Edit className="size-4" />
                            </button>
                        )}
                        {can('evolutions.manage.delete') && (
                            <button
                                onClick={handleDelete}
                                className="rounded-xl border border-red-200 p-2.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        )}
                    </div>
                </div>

                {evolution.observacoes ? (
                    <Section
                        title="Observações da Aula"
                        color="text-indigo-600"
                    >
                        <Field
                            label="Anotações"
                            value={evolution.observacoes}
                        />
                    </Section>
                ) : (
                    <>
                        <Section title="Subjetivo" color="text-primary">
                            <Field
                                label="Queixa Principal"
                                value={evolution.queixa_principal}
                            />
                            <Field
                                label="Relato do Paciente"
                                value={evolution.relato_paciente}
                            />
                            {evolution.dor_eva != null && (
                                <Field
                                    label="EVA da Dor"
                                    value={`${evolution.dor_eva}/10`}
                                />
                            )}
                            <Field
                                label="Localização"
                                value={evolution.localizacao_dor}
                            />
                            <Field
                                label="Tipo de Dor"
                                value={evolution.tipo_dor}
                            />
                        </Section>

                        <Section title="Objetivo" color="text-emerald-600">
                            <div className="flex flex-wrap gap-4">
                                {evolution.pressao_arterial && (
                                    <div className="rounded-xl border border-border/20 bg-muted/30 px-4 py-2">
                                        <p className="text-xs text-muted-foreground">
                                            PA
                                        </p>
                                        <p className="text-sm font-semibold">
                                            {evolution.pressao_arterial}
                                        </p>
                                    </div>
                                )}
                                {evolution.frequencia_cardiaca && (
                                    <div className="rounded-xl border border-border/20 bg-muted/30 px-4 py-2">
                                        <p className="text-xs text-muted-foreground">
                                            FC
                                        </p>
                                        <p className="text-sm font-semibold">
                                            {evolution.frequencia_cardiaca}
                                        </p>
                                    </div>
                                )}
                                {evolution.saturacao && (
                                    <div className="rounded-xl border border-border/20 bg-muted/30 px-4 py-2">
                                        <p className="text-xs text-muted-foreground">
                                            SpO2
                                        </p>
                                        <p className="text-sm font-semibold">
                                            {evolution.saturacao}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <Field
                                label="Condutas Realizadas"
                                value={evolution.condutas_realizadas}
                            />
                        </Section>

                        <Section title="Avaliação" color="text-amber-600">
                            <Field
                                label="Análise Profissional"
                                value={evolution.analise_profissional}
                            />
                            <Field
                                label="Resposta ao Tratamento"
                                value={evolution.resposta_tratamento}
                            />
                        </Section>

                        <Section title="Plano" color="text-indigo-600">
                            <Field
                                label="Conduta Planejada"
                                value={evolution.conduta_planejada}
                            />
                            <Field
                                label="Orientações Domiciliares"
                                value={evolution.orientacoes_domiciliares}
                            />
                        </Section>
                    </>
                )}
            </div>
            {modal}
            <EvolutionFormSheet
                isOpen={isEvolutionSheetOpen}
                onOpenChange={setIsEvolutionSheetOpen}
                patientId={evolution.paciente_id}
                protocols={protocols}
                evolution={evolution}
            />
        </AppLayout>
    );
}
