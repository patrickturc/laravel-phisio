import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    FileText,
    Search,
    UserMinus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export interface PendingEvolution {
    id: string;
    appointment_id: string;
    patient_id: string;
    patient_name: string;
    patient_type: string;
    appointment_date: string;
    start_time: string;
    title: string;
    professional_name: string | null;
}

type SortKey = 'patient' | 'title' | 'date' | 'professional';
type Period = 'all' | 'today' | 'yesterday' | 'week';

const PERIODS: Array<{ value: Period; label: string }> = [
    { value: 'all', label: 'Últimos 14 dias' },
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'week', label: 'Últimos 7 dias' },
];

const controlClass =
    'h-10 rounded-xl border border-border bg-card px-3 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none';

function isoDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return date.toLocaleDateString('en-CA');
}

function sortValue(pending: PendingEvolution, key: SortKey): string {
    switch (key) {
        case 'patient':
            return pending.patient_name.toLocaleLowerCase('pt-BR');
        case 'title':
            return pending.title.toLocaleLowerCase('pt-BR');
        case 'professional':
            return (pending.professional_name ?? '').toLocaleLowerCase('pt-BR');
        default:
            return `${pending.appointment_date} ${pending.start_time}`;
    }
}

function SortableHeader({
    label,
    active,
    dir,
    onSort,
    className = '',
}: {
    label: string;
    active: boolean;
    dir: 'asc' | 'desc';
    onSort: () => void;
    className?: string;
}) {
    const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;

    return (
        <th className={`px-6 py-4 ${className}`}>
            <button
                type="button"
                onClick={onSort}
                className={`inline-flex items-center gap-1.5 uppercase transition-colors hover:text-foreground ${active ? 'text-foreground' : ''}`}
            >
                {label}
                <Icon className="size-3.5" />
            </button>
        </th>
    );
}

/**
 * Classes already given without an evolution, in the system's standard table:
 * search, professional and period filters, sortable columns. A row opens the
 * evolution form for that class.
 */
export function PendingEvolutionsTable({
    pending,
    canCreate,
    busyId,
    onRegister,
    onMarkMissed,
}: {
    pending: PendingEvolution[];
    canCreate: boolean;
    busyId: string | null;
    onRegister: (pending: PendingEvolution) => void;
    onMarkMissed: (pending: PendingEvolution) => void;
}) {
    const [search, setSearch] = useState('');
    const [professional, setProfessional] = useState('');
    const [period, setPeriod] = useState<Period>('all');
    const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
        key: 'date',
        dir: 'desc',
    });

    const professionals = useMemo(
        () =>
            [
                ...new Set(
                    pending
                        .map((item) => item.professional_name)
                        .filter((name): name is string => !!name),
                ),
            ].sort((a, b) => a.localeCompare(b, 'pt-BR')),
        [pending],
    );

    const rows = useMemo(() => {
        const term = search.trim().toLocaleLowerCase('pt-BR');
        const from =
            period === 'today'
                ? isoDaysAgo(0)
                : period === 'yesterday'
                  ? isoDaysAgo(1)
                  : period === 'week'
                    ? isoDaysAgo(6)
                    : null;
        const until = period === 'yesterday' ? isoDaysAgo(1) : null;

        return pending
            .filter(
                (item) =>
                    (!term ||
                        item.patient_name
                            .toLocaleLowerCase('pt-BR')
                            .includes(term)) &&
                    (!professional ||
                        item.professional_name === professional) &&
                    (!from || item.appointment_date >= from) &&
                    (!until || item.appointment_date <= until),
            )
            .sort((a, b) => {
                const result = sortValue(a, sort.key).localeCompare(
                    sortValue(b, sort.key),
                    'pt-BR',
                );

                return sort.dir === 'asc' ? result : -result;
            });
    }, [pending, search, professional, period, sort]);

    function toggleSort(key: SortKey) {
        setSort((current) =>
            current.key === key
                ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: key === 'date' ? 'desc' : 'asc' },
        );
    }

    const hasFilters = search || professional || period !== 'all';

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] flex-1">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar paciente..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={`${controlClass} w-full pr-3 pl-10`}
                    />
                </div>
                <select
                    value={professional}
                    onChange={(e) => setProfessional(e.target.value)}
                    className={controlClass}
                >
                    <option value="">Todos os profissionais</option>
                    {professionals.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as Period)}
                    className={controlClass}
                >
                    {PERIODS.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
                {hasFilters && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearch('');
                            setProfessional('');
                            setPeriod('all');
                        }}
                        className="h-10 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                        Limpar
                    </button>
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] backdrop-blur-xl">
                <div className="max-h-[480px] overflow-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 z-10 border-b border-border/50 bg-muted/60 text-xs font-medium text-muted-foreground uppercase backdrop-blur">
                            <tr>
                                <SortableHeader
                                    label="Paciente"
                                    active={sort.key === 'patient'}
                                    dir={sort.dir}
                                    onSort={() => toggleSort('patient')}
                                />
                                <SortableHeader
                                    label="Aula"
                                    active={sort.key === 'title'}
                                    dir={sort.dir}
                                    onSort={() => toggleSort('title')}
                                    className="hidden md:table-cell"
                                />
                                <SortableHeader
                                    label="Data"
                                    active={sort.key === 'date'}
                                    dir={sort.dir}
                                    onSort={() => toggleSort('date')}
                                />
                                <SortableHeader
                                    label="Profissional"
                                    active={sort.key === 'professional'}
                                    dir={sort.dir}
                                    onSort={() => toggleSort('professional')}
                                    className="hidden lg:table-cell"
                                />
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-6 py-10 text-center text-muted-foreground"
                                    >
                                        Nenhuma evolução pendente com esses
                                        filtros.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() =>
                                            canCreate && onRegister(item)
                                        }
                                        className={`group border-b border-border/30 transition-colors hover:bg-muted/30 ${canCreate ? 'cursor-pointer' : ''}`}
                                    >
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-foreground transition-colors group-hover:text-primary">
                                                {item.patient_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.patient_type === 'pilates'
                                                    ? 'Pilates'
                                                    : 'Fisioterapia'}
                                            </p>
                                        </td>
                                        <td className="hidden px-6 py-4 text-muted-foreground md:table-cell">
                                            {item.title}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(
                                                `${item.appointment_date}T00:00:00`,
                                            ).toLocaleDateString('pt-BR', {
                                                weekday: 'short',
                                                day: '2-digit',
                                                month: '2-digit',
                                            })}{' '}
                                            <span className="text-muted-foreground">
                                                {item.start_time}
                                            </span>
                                        </td>
                                        <td className="hidden px-6 py-4 text-muted-foreground lg:table-cell">
                                            {item.professional_name ?? '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                {canCreate && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                type="button"
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    onRegister(
                                                                        item,
                                                                    );
                                                                }}
                                                                className="rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                                                aria-label="Registrar evolução"
                                                            >
                                                                <FileText className="size-4" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Registrar evolução
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onMarkMissed(
                                                                    item,
                                                                );
                                                            }}
                                                            disabled={
                                                                busyId ===
                                                                `${item.id}_missed`
                                                            }
                                                            className="rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                                                            aria-label="Marcar falta"
                                                        >
                                                            <UserMinus className="size-4" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Marcar falta
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="px-1 text-xs text-muted-foreground">
                {rows.length === pending.length
                    ? `${pending.length} aula(s) sem evolução`
                    : `${rows.length} de ${pending.length} aula(s) sem evolução`}
            </p>
        </div>
    );
}
