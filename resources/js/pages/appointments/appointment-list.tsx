import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Calendar as CalendarIcon,
    Clock,
    Search,
    User,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { Pagination } from '@/components/pagination';

interface PaginatedAppointments {
    data: any[];
    links: any[];
    from: number | null;
    to: number | null;
    total: number;
}

interface Props {
    appointments: PaginatedAppointments;
    filters: Record<string, string | undefined>;
    onOpen: (appointmentId: string) => void;
}

/**
 * Server-paginated list of appointments with search, status and date
 * filters — the agenda's "Lista" view.
 */
export function AppointmentList({ appointments, filters, onOpen }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    function applyFilters(overrides: Record<string, string | undefined> = {}) {
        const values = {
            search,
            status: statusFilter,
            date_from: dateFrom,
            date_to: dateTo,
            user_id: filters.user_id,
            ...overrides,
        };

        router.get(
            '/appointments',
            Object.fromEntries(
                Object.entries(values).filter(([, value]) => value),
            ),
            { preserveState: true, replace: true },
        );
    }

    function clearFilters() {
        setSearch('');
        setStatusFilter('');
        setDateFrom('');
        setDateTo('');
        router.get('/appointments', {}, { preserveState: true, replace: true });
    }

    const hasFilters =
        filters.search ||
        filters.status ||
        filters.date_from ||
        filters.date_to;

    const fieldClass =
        'h-10 rounded-xl border border-border bg-card px-3 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none';

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full md:w-56">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar paciente..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                        className={`${fieldClass} w-full pl-9`}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value);
                        applyFilters({ status: e.target.value || undefined });
                    }}
                    className={fieldClass}
                >
                    <option value="">Todos os status</option>
                    <option value="scheduled">Agendado</option>
                    <option value="completed">Realizado</option>
                    <option value="cancelled">Cancelado</option>
                </select>
                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                        setDateFrom(e.target.value);
                        applyFilters({
                            date_from: e.target.value || undefined,
                        });
                    }}
                    className={fieldClass}
                    aria-label="De"
                />
                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                        setDateTo(e.target.value);
                        applyFilters({ date_to: e.target.value || undefined });
                    }}
                    className={fieldClass}
                    aria-label="Até"
                />
                {hasFilters && (
                    <button
                        onClick={clearFilters}
                        className="h-10 rounded-xl border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                        Limpar
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {appointments.data.length > 0 ? (
                    appointments.data.map((app: any, index: number) => (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            key={app.id}
                            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] backdrop-blur-xl transition-all hover:shadow-lg"
                        >
                            <div className="absolute top-0 left-0 h-full w-1.5 rounded-l-2xl bg-gradient-to-b from-primary to-emerald-500"></div>

                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                                    <CalendarIcon className="size-4" />
                                    {new Date(
                                        app.appointment_date,
                                    ).toLocaleDateString('pt-BR', {
                                        timeZone: 'UTC',
                                    })}
                                </div>
                                <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/60 px-3 py-1.5 text-sm font-bold text-foreground/80">
                                    <Clock className="size-4 text-primary" />
                                    {app.start_time?.substring(0, 5)}
                                </div>
                            </div>

                            <h3 className="mb-1 flex items-center gap-2 text-xl font-bold text-foreground">
                                <div className="rounded-lg bg-primary/10 p-1.5">
                                    {app.type === 'group' ? (
                                        <Users className="size-5 text-primary" />
                                    ) : (
                                        <User className="size-5 text-primary" />
                                    )}
                                </div>
                                <span className="truncate">
                                    {app.type === 'group'
                                        ? app.title || 'Turma'
                                        : app.patients?.[0]?.name ||
                                          'Não encontrado'}
                                </span>
                            </h3>

                            {app.type === 'group' && (
                                <p className="mb-2 text-xs font-medium text-muted-foreground">
                                    {app.patients?.length || 0} /{' '}
                                    {app.max_participants} participantes
                                </p>
                            )}

                            <p className="mt-2 line-clamp-2 min-h-[40px] text-sm text-muted-foreground">
                                {app.notes || 'Sem observações.'}
                            </p>

                            <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                                <span
                                    className={`rounded-md px-2.5 py-1 text-xs font-bold tracking-wider uppercase ${
                                        app.status === 'completed'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : app.status === 'cancelled'
                                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}
                                >
                                    {app.status === 'completed'
                                        ? 'Concluído'
                                        : app.status === 'cancelled'
                                          ? 'Cancelado'
                                          : 'Agendado'}
                                </span>

                                <button
                                    onClick={() => onOpen(app.id)}
                                    className="flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-emerald-500"
                                >
                                    Editar{' '}
                                    <span aria-hidden="true">&rarr;</span>
                                </button>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/30 py-24 text-center">
                        <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-muted shadow-sm">
                            <CalendarIcon className="size-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="mb-2 text-2xl font-bold text-foreground">
                            Sem agendamentos
                        </h3>
                        <p className="max-w-sm text-muted-foreground">
                            Nenhuma consulta encontrada para a sua busca ou
                            agenda vazia.
                        </p>
                    </div>
                )}
            </div>

            {appointments.total > 0 && (
                <Pagination
                    links={appointments.links}
                    from={appointments.from}
                    to={appointments.to}
                    total={appointments.total}
                />
            )}
        </div>
    );
}
