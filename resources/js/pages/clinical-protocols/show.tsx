import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Trash2, FileText, ChevronRight } from 'lucide-react';
import { useConfirmModal } from '@/components/confirm-modal';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface ClinicalProtocol {
    id: string;
    name: string;
    description: string | null;
    total_sessions: number | null;
    notes: string | null;
    evolutions?: Array<{
        id: string;
        data_atendimento: string;
        tipo_atendimento: string;
        condutas_realizadas: string | null;
        patient?: { id: string; name: string };
    }>;
}

export default function ClinicalProtocolShow({
    protocol,
}: {
    protocol: ClinicalProtocol;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Protocolos Clínicos', href: '/clinical-protocols' },
        { title: protocol.name, href: `/clinical-protocols/${protocol.id}` },
    ];

    const { can } = usePermissions();
    const { confirm, modal } = useConfirmModal();

    async function handleDelete() {
        const confirmed = await confirm({
            title: 'Excluir Protocolo',
            message: 'Tem certeza que deseja excluir este protocolo clínico?',
            confirmLabel: 'Excluir',
        });
        if (confirmed) router.delete(`/clinical-protocols/${protocol.id}`);
    }

    const tipoLabels: Record<string, string> = {
        sessao: 'Sessão',
        avaliacao: 'Avaliação',
        reavaliacao: 'Reavaliação',
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={protocol.name} />
            <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col gap-6 p-6 md:p-10">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/clinical-protocols"
                            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/50"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                {protocol.name}
                            </h1>
                            {protocol.total_sessions && (
                                <p className="mt-1 text-sm font-medium text-emerald-600">
                                    {protocol.total_sessions} sessões sugeridas
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {can('treatment_plans.manage.edit') && (
                            <Link
                                href={`/clinical-protocols/${protocol.id}/edit`}
                                className="rounded-xl border border-border/50 p-2.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                            >
                                <Edit className="size-4" />
                            </Link>
                        )}
                        {can('treatment_plans.manage.delete') && (
                            <button
                                onClick={handleDelete}
                                className="rounded-xl border border-red-200 p-2.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {protocol.description && (
                        <div className="rounded-2xl border border-border/50 bg-card/60 p-6">
                            <h3 className="mb-2 text-sm font-bold tracking-wide text-muted-foreground uppercase">
                                Descrição / Objetivo Geral
                            </h3>
                            <p className="text-sm whitespace-pre-wrap text-foreground">
                                {protocol.description}
                            </p>
                        </div>
                    )}
                    {protocol.notes && (
                        <div className="rounded-2xl border border-border/50 bg-card/60 p-6">
                            <h3 className="mb-2 text-sm font-bold tracking-wide text-muted-foreground uppercase">
                                Observações Técnicas
                            </h3>
                            <p className="text-sm whitespace-pre-wrap text-foreground">
                                {protocol.notes}
                            </p>
                        </div>
                    )}
                </div>

                {/* Session History */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
                >
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                        <FileText className="size-5 text-emerald-500" />
                        Evoluções que utilizaram este protocolo
                    </h2>

                    {protocol.evolutions && protocol.evolutions.length > 0 ? (
                        <div className="space-y-3">
                            {protocol.evolutions.map((evo) => (
                                <Link
                                    key={evo.id}
                                    href={`/evolutions/${evo.id}`}
                                    className="group flex items-center gap-4 rounded-xl border border-border/30 p-4 transition-colors hover:bg-muted/30"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-foreground">
                                                {evo.patient?.name ||
                                                    'Paciente'}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                •{' '}
                                                {new Date(
                                                    evo.data_atendimento,
                                                ).toLocaleDateString('pt-BR')}
                                            </span>
                                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                {tipoLabels[
                                                    evo.tipo_atendimento
                                                ] || evo.tipo_atendimento}
                                            </span>
                                        </div>
                                        {evo.condutas_realizadas && (
                                            <p className="mt-1 truncate text-xs text-muted-foreground">
                                                {evo.condutas_realizadas}
                                            </p>
                                        )}
                                    </div>
                                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <FileText className="mx-auto mb-3 size-10 text-muted-foreground/20" />
                            <p className="text-sm text-muted-foreground">
                                Nenhuma evolução registrada com este protocolo
                                ainda.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
            {modal}
        </AppLayout>
    );
}
