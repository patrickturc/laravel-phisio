import { Link, router } from '@inertiajs/react';
import axios from 'axios';
import { Eye, History, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useConfirmModal } from '@/components/confirm-modal';
import { usePermissions } from '@/hooks/use-permissions';
import { EVOLUTION_TYPE_LABELS, pilatesSummary } from '@/lib/pilates-scales';

interface RecentEvolution {
    id: string;
    data_atendimento: string;
    evolution_type: string;
    estabilidade: string | null;
    mobilidade: string | null;
    forca: string | null;
    coordenacao: string | null;
    observacoes: string | null;
    queixa_principal: string | null;
    professional: { id: number; name: string } | null;
}

function summaryOf(evolution: RecentEvolution): string {
    if (evolution.evolution_type === 'pilates') {
        return pilatesSummary(evolution);
    }

    return evolution.observacoes || evolution.queixa_principal || '';
}

/**
 * Latest evolutions of a patient, shown beside the evolution form so the
 * professional can compare with the previous sessions.
 */
export default function RecentEvolutions({
    patientId,
    excludeId,
}: {
    patientId: string;
    excludeId?: string;
}) {
    const { can } = usePermissions();
    const { confirm, modal } = useConfirmModal();
    // Keyed by patient so switching patients shows the spinner again.
    const [result, setResult] = useState<{
        patientId: string;
        items: RecentEvolution[];
    } | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;

        axios
            .get<RecentEvolution[]>(
                `/api/patients/${patientId}/recent-evolutions`,
            )
            .then((res) => {
                if (!cancelled) setResult({ patientId, items: res.data });
            })
            .catch(() => {
                if (!cancelled) setResult({ patientId, items: [] });
            });

        return () => {
            cancelled = true;
        };
    }, [patientId, reloadKey]);

    const loading = result?.patientId !== patientId;
    const evolutions = loading ? [] : (result?.items ?? []);

    async function handleDelete(evolution: RecentEvolution) {
        const confirmed = await confirm({
            title: 'Excluir evolução',
            message: 'Tem certeza que deseja excluir este registro?',
            confirmLabel: 'Excluir',
        });

        if (!confirmed) return;

        await axios.delete(`/evolutions/${evolution.id}`);
        setReloadKey((key) => key + 1);
        router.reload();
    }

    const visible = evolutions.filter((e) => e.id !== excludeId);

    return (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <History className="size-4 text-muted-foreground" />
                Histórico recente
            </h3>

            {loading ? (
                <div className="flex justify-center py-3">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
            ) : visible.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                    Nenhum registro anterior.
                </p>
            ) : (
                <ul className="space-y-3 border-l border-border pl-3">
                    {visible.map((evolution) => (
                        <li
                            key={evolution.id}
                            className="flex items-start justify-between gap-3"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-foreground">
                                        {new Date(
                                            evolution.data_atendimento,
                                        ).toLocaleDateString('pt-BR', {
                                            timeZone: 'UTC',
                                        })}
                                    </span>
                                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                        {EVOLUTION_TYPE_LABELS[
                                            evolution.evolution_type
                                        ] ?? evolution.evolution_type}
                                    </span>
                                </div>
                                {evolution.professional && (
                                    <p className="text-xs text-muted-foreground">
                                        {evolution.professional.name}
                                    </p>
                                )}
                                {summaryOf(evolution) && (
                                    <p className="mt-0.5 line-clamp-2 text-xs text-foreground/80">
                                        {summaryOf(evolution)}
                                    </p>
                                )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <Link
                                    href={`/evolutions/${evolution.id}`}
                                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    title="Ver registro"
                                >
                                    <Eye className="size-4" />
                                </Link>
                                {can('evolutions.manage.delete') && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(evolution)}
                                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                                        title="Excluir registro"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {modal}
        </div>
    );
}
