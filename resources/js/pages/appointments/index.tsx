import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { CalendarPlus, Search, Clock, Calendar as CalendarIcon, User, Users, List, CalendarDays, LayoutGrid } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pagination } from '@/components/pagination';
import CalendarView from '@/components/calendar-view';
import SlotsView from '@/components/slots-view';
import { AppointmentFormSheet } from './appointment-form-sheet';
import { GroupClassFormSheet } from '../group-classes/group-class-form-sheet';
import { usePermissions } from '@/hooks/use-permissions';
import axios from 'axios';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Agenda', href: '/appointments' },
];

interface PaginatedAppointments {
    data: any[];
    links: any[];
    from: number | null;
    to: number | null;
    total: number;
}

export default function AppointmentsIndex({ appointments, filters = {}, patients = [], groupClasses = [], users = [] }: { appointments: PaginatedAppointments; filters?: any; patients?: any[]; groupClasses?: any[]; users?: any[] }) {
    const { can } = usePermissions();
    const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'slots'>('calendar');
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [professionalFilter, setProfessionalFilter] = useState(filters.user_id || '');

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<any>(null);
    const [initialDate, setInitialDate] = useState('');
    const [initialTime, setInitialTime] = useState('');
    const [initialDuration, setInitialDuration] = useState<number | undefined>(undefined);

    const [groupClassSheetOpen, setGroupClassSheetOpen] = useState(false);
    const [isGroupClassSheetOpen, setIsGroupClassSheetOpen] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('create') === 'true') {
            setEditingAppointment(null);
            setInitialDate(new Date().toISOString().split('T')[0]);
            setInitialTime('08:00');
            setInitialDuration(undefined);
            setSheetOpen(true);
            
            const url = new URL(window.location.href);
            url.searchParams.delete('create');
            window.history.replaceState({}, '', url);
        }
    }, []);

    // Reschedule Prompt State
    const [reschedulePrompt, setReschedulePrompt] = useState<{
        open: boolean;
        eventId: string | null;
        newDate: string | null;
        newTime: string | null;
    }>({ open: false, eventId: null, newDate: null, newTime: null });

    const performReschedule = (mode: 'single' | 'future') => {
        if (!reschedulePrompt.eventId) return;
        
        axios.post(`/appointments/${reschedulePrompt.eventId}/reschedule`, {
            appointment_date: reschedulePrompt.newDate,
            start_time: reschedulePrompt.newTime,
            update_mode: mode
        }).then(() => {
            setReschedulePrompt({ open: false, eventId: null, newDate: null, newTime: null });
            router.reload({ only: ['appointments'] });
        }).catch((err) => {
            console.error('Failed to reschedule', err);
            setReschedulePrompt({ open: false, eventId: null, newDate: null, newTime: null });
            router.reload({ only: ['appointments'] });
        });
    };

    function applyFilters(overrides?: any) {
        const params: any = { ...overrides };
        const s = overrides?.search ?? search;
        const st = overrides?.status ?? statusFilter;
        const df = overrides?.date_from ?? dateFrom;
        const dt = overrides?.date_to ?? dateTo;
        const up = overrides?.user_id ?? professionalFilter;

        if (s) params.search = s;
        if (st) params.status = st;
        if (df) params.date_from = df;
        if (dt) params.date_to = dt;
        if (up) params.user_id = up;

        router.get('/appointments', params, { preserveState: true, replace: true });
    }

    function handleProfessionalChange(val: string) {
        setProfessionalFilter(val);
        // List view is server-paginated, so reload it; calendar/slots refetch
        // client-side via the userId prop.
        if (viewMode === 'list') applyFilters({ user_id: val });
    }

    function handleSearchKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') applyFilters();
    }

    function clearFilters() {
        setSearch('');
        setStatusFilter('');
        setDateFrom('');
        setDateTo('');
        setProfessionalFilter('');
        router.get('/appointments', {}, { preserveState: true, replace: true });
    }

    const hasFilters = filters.search || filters.status || filters.date_from || filters.date_to;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Agenda - Phisio" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6 w-full mx-auto">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-600">Agenda</h1>
                        <p className="text-muted-foreground mt-1">Gerencie suas consultas e sessões diárias.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={professionalFilter}
                            onChange={e => handleProfessionalChange(e.target.value)}
                            className="h-10 px-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                            title="Filtrar por profissional"
                        >
                            <option value="">Todos os profissionais</option>
                            {users.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                        <div className="relative w-full md:w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar paciente..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className="w-full h-10 pl-9 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                            />
                        </div>
                        <Link
                            href="/settings/profile"
                            className="flex items-center gap-2 h-10 px-3 bg-muted/50 border border-border/50 text-muted-foreground font-medium rounded-xl hover:bg-muted hover:text-foreground transition-colors shadow-sm"
                            title="Sincronizar Agenda Externa"
                        >
                            <CalendarDays className="size-4" />
                            <span className="hidden sm:inline">Sincronizar</span>
                        </Link>
                        {can('appointments.manage.create') && (
                        <button
                            onClick={() => {
                                setEditingAppointment(null);
                                setInitialDate(new Date().toISOString().split('T')[0]);
                                setInitialTime('08:00');
                                setInitialDuration(undefined);
                                setSheetOpen(true);
                            }}
                            className="flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                        >
                            <CalendarPlus className="size-4" />
                            <span className="hidden sm:inline">Novo Agendamento</span>
                        </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); applyFilters({ status: e.target.value || undefined }); }}
                            className="h-10 px-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                        >
                            <option value="">Todos os status</option>
                            <option value="scheduled">Agendado</option>
                            <option value="completed">Realizado</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
                        
                        {viewMode === 'list' && (
                            <>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={e => { setDateFrom(e.target.value); applyFilters({ date_from: e.target.value || undefined }); }}
                                    className="h-10 px-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                                    placeholder="De"
                                />
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={e => { setDateTo(e.target.value); applyFilters({ date_to: e.target.value || undefined }); }}
                                    className="h-10 px-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                                    placeholder="Até"
                                />
                            </>
                        )}
                        
                        {hasFilters && (
                            <button onClick={clearFilters} className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors border border-border">
                                Limpar
                            </button>
                        )}
                    </div>

                    <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                viewMode === 'calendar' 
                                    ? 'bg-background shadow-sm text-primary border border-border/50' 
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                        >
                            <CalendarDays className="size-4" />
                            Grade
                        </button>
                        <button
                            onClick={() => setViewMode('slots')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                viewMode === 'slots' 
                                    ? 'bg-background shadow-sm text-primary border border-border/50' 
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                        >
                            <LayoutGrid className="size-4" />
                            Vagas
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                viewMode === 'list' 
                                    ? 'bg-background shadow-sm text-primary border border-border/50' 
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                        >
                            <List className="size-4" />
                            Lista
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {viewMode === 'calendar' ? (
                        <motion.div
                            key="calendar"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 w-full"
                        >
                            <CalendarView
                                refreshTrigger={appointments}
                                userId={professionalFilter}
                                onEventClick={(eventId) => {
                                    axios.get(`/api/appointments/${eventId}`)
                                        .then(res => {
                                            setEditingAppointment(res.data);
                                            setSheetOpen(true);
                                        });
                                }}
                                onDateSelect={(date, time, durationMinutes) => {
                                    setEditingAppointment(null);
                                    setInitialDate(date);
                                    setInitialTime(time);
                                    setInitialDuration(durationMinutes);
                                    setSheetOpen(true);
                                }}
                                onEventDrop={can('appointments.manage.edit') ? (eventId, newDate, newTime, isGroup) => {
                                    if (isGroup) {
                                        setReschedulePrompt({
                                            open: true,
                                            eventId,
                                            newDate,
                                            newTime
                                        });
                                    } else {
                                        axios.post(`/appointments/${eventId}/reschedule`, {
                                            appointment_date: newDate,
                                            start_time: newTime,
                                            update_mode: 'single'
                                        }).then(() => {
                                            router.reload({ only: ['appointments'] });
                                        }).catch((err) => {
                                            console.error('Failed to reschedule', err);
                                            router.reload({ only: ['appointments'] });
                                        });
                                    }
                                } : undefined}
                            />
                        </motion.div>
                    ) : viewMode === 'slots' ? (
                        <motion.div
                            key="slots"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 w-full"
                        >
                            <SlotsView
                                refreshTrigger={appointments}
                                userId={professionalFilter}
                                onEventClick={(eventId) => {
                                    axios.get(`/api/appointments/${eventId}`)
                                        .then(res => {
                                            setEditingAppointment(res.data);
                                            setSheetOpen(true);
                                        });
                                }}
                                onDateSelect={(date, time, durationMinutes) => {
                                    setEditingAppointment(null);
                                    setInitialDate(date);
                                    setInitialTime(time);
                                    setInitialDuration(durationMinutes);
                                    setSheetOpen(true);
                                }}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {appointments.data.length > 0 ? (
                                    appointments.data.map((app: any, index: number) => (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                            key={app.id}
                                            className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 hover:shadow-lg transition-all group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary to-emerald-500 rounded-l-2xl"></div>

                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                                                    <CalendarIcon className="size-4" />
                                                    {new Date(app.appointment_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-sm font-bold text-foreground/80 bg-muted/60 px-3 py-1.5 rounded-lg border border-border/50">
                                                    <Clock className="size-4 text-primary" />
                                                    {app.start_time?.substring(0,5)}
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                                                <div className="bg-primary/10 p-1.5 rounded-lg">
                                                    {app.type === 'group' ? <Users className="size-5 text-primary" /> : <User className="size-5 text-primary" />}
                                                </div>
                                                <span className="truncate">
                                                    {app.type === 'group' 
                                                        ? (app.title || 'Turma') 
                                                        : (app.patients?.[0]?.name || 'Não encontrado')}
                                                </span>
                                            </h3>
                                            
                                            {app.type === 'group' && (
                                                <p className="text-xs text-muted-foreground font-medium mb-2">
                                                    {app.patients?.length || 0} / {app.max_participants} participantes
                                                </p>
                                            )}

                                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2 min-h-[40px]">
                                                {app.notes || 'Sem observações.'}
                                            </p>

                                            <div className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                                    app.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    app.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                    {app.status === 'completed' ? 'Concluído' : app.status === 'cancelled' ? 'Cancelado' : 'Agendado'}
                                                </span>

                                                <button 
                                                    onClick={() => {
                                                        axios.get(`/api/appointments/${app.id}`)
                                                            .then(res => {
                                                                setEditingAppointment(res.data);
                                                                setSheetOpen(true);
                                                            });
                                                    }}
                                                    className="text-sm font-semibold text-primary hover:text-emerald-500 transition-colors flex items-center gap-1"
                                                >
                                                    Editar <span aria-hidden="true">&rarr;</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-card/30 rounded-3xl border border-dashed border-border">
                                        <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-6 shadow-sm">
                                            <CalendarIcon className="size-8 text-muted-foreground/50" />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-2 text-foreground">Sem agendamentos</h3>
                                        <p className="text-muted-foreground max-w-sm">Nenhuma consulta encontrada para a sua busca ou agenda vazia.</p>
                                    </div>
                                )}
                            </div>

                            {appointments.total > 0 && (
                                <Pagination links={appointments.links} from={appointments.from} to={appointments.to} total={appointments.total} />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AppointmentFormSheet
                isOpen={sheetOpen} 
                setIsOpen={setSheetOpen} 
                patients={patients || []} 
                users={users || []}
                groupClasses={groupClasses}
                editingAppointment={editingAppointment} 
                initialDate={initialDate} 
                initialTime={initialTime} 
                initialDuration={initialDuration} 
                onNewGroupClass={() => {
                    setSheetOpen(false);
                    setTimeout(() => setGroupClassSheetOpen(true), 300);
                }}
            />

            <GroupClassFormSheet
                isOpen={groupClassSheetOpen}
                setIsOpen={(open) => {
                    setGroupClassSheetOpen(open);
                    if (!open) {
                        // Refresh data when closing the group class sheet to get the newly created Turma
                        router.reload({ only: ['groupClasses'] });
                    }
                }}
                patients={patients || []}
            />

            {reschedulePrompt.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => {
                            // Cancel: revert the optimistic calendar move.
                            setReschedulePrompt({ open: false, eventId: null, newDate: null, newTime: null });
                            router.reload({ only: ['appointments'] });
                        }}
                    />
                    <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-foreground mb-1">Reagendar aula da turma</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                            Esta aula faz parte de uma turma recorrente. Deseja mover apenas esta ocorrência ou também as próximas aulas da turma?
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => performReschedule('single')}
                                className="w-full h-11 px-4 rounded-xl bg-primary text-white font-semibold shadow-sm hover:bg-primary/90 transition-colors"
                            >
                                Somente esta aula
                            </button>
                            <button
                                onClick={() => performReschedule('future')}
                                className="w-full h-11 px-4 rounded-xl bg-card border border-border text-foreground font-medium hover:bg-muted transition-colors"
                            >
                                Esta e as futuras
                            </button>
                            <button
                                onClick={() => {
                                    setReschedulePrompt({ open: false, eventId: null, newDate: null, newTime: null });
                                    router.reload({ only: ['appointments'] });
                                }}
                                className="w-full h-10 px-4 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
