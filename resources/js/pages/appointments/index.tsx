import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
    CalendarDays,
    CalendarPlus,
    ChevronLeft,
    ChevronRight,
    List,
    Loader2,
    MessageCircle,
    Search,
    Settings,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AgendaBookingSheet } from '@/components/agenda-booking-sheet';
import { AgendaGrid } from '@/components/agenda-grid';
import { AgendaMonth } from '@/components/agenda-month';
import { AgendaRemindersSheet } from '@/components/agenda-reminders-sheet';
import { AgendaSettingsDialog } from '@/components/agenda-settings-dialog';
import { AgendaStudentDialog } from '@/components/agenda-student-dialog';
import { MissedAttendanceModal } from '@/components/missed-attendance-modal';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import type {
    AgendaView,
    GridData,
    Professional,
    ScheduleSettings,
    SelectedStudent,
} from '@/lib/agenda';
import { addDays, addMonths, periodLabel, todayISO } from '@/lib/agenda';
import type { BreadcrumbItem } from '@/types';
import { GroupClassFormSheet } from '../group-classes/group-class-form-sheet';
import { AppointmentFormSheet } from './appointment-form-sheet';
import { AppointmentList } from './appointment-list';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Agenda', href: '/appointments' },
];

const VIEWS: Array<{ key: AgendaView; label: string }> = [
    { key: 'day', label: 'Dia' },
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Mês' },
];

interface BookingState {
    key: number;
    preset: { date: string; time: string; patientId?: string };
}

/**
 * "?create=true&patient_id=…" (used by links elsewhere in the app) opens
 * the booking form straight away.
 */
function bookingFromUrl(): BookingState | null {
    if (typeof window === 'undefined') return null;

    const params = new URLSearchParams(window.location.search);

    if (params.get('create') !== 'true') return null;

    return {
        key: Date.now(),
        preset: {
            date: todayISO(),
            time: '08:00',
            patientId: params.get('patient_id') ?? undefined,
        },
    };
}

export default function AppointmentsIndex({
    appointments,
    filters = {},
    patients = [],
    groupClasses = [],
    users = [],
    scheduleSettings,
    reminderTemplate,
    clinicName,
}: {
    appointments: any;
    filters?: Record<string, string | undefined>;
    patients?: Array<{ id: string; name: string }>;
    groupClasses?: any[];
    users?: Professional[];
    scheduleSettings: ScheduleSettings;
    reminderTemplate: string;
    clinicName: string;
}) {
    const { can } = usePermissions();

    const [view, setView] = useState<AgendaView>(() =>
        typeof window !== 'undefined' && window.innerWidth < 768
            ? 'day'
            : 'week',
    );
    const [date, setDate] = useState(todayISO);
    const [professionalId, setProfessionalId] = useState(filters.user_id ?? '');
    const [search, setSearch] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const refresh = () => setRefreshKey((key) => key + 1);

    const [booking, setBooking] = useState<BookingState | null>(bookingFromUrl);
    const [settingsKey, setSettingsKey] = useState<number | null>(null);
    const [remindersOpen, setRemindersOpen] = useState(false);
    const [selected, setSelected] = useState<SelectedStudent | null>(null);
    const [missed, setMissed] = useState<SelectedStudent | null>(null);

    // Legacy edit sheet (individual appointments and classes).
    const [editing, setEditing] = useState<any>(null);
    const [editSheetOpen, setEditSheetOpen] = useState(false);
    const [groupClassSheetOpen, setGroupClassSheetOpen] = useState(false);

    // Drop "?create=true" so a reload doesn't open the form again.
    useEffect(() => {
        const url = new URL(window.location.href);

        if (url.searchParams.has('create')) {
            url.searchParams.delete('create');
            url.searchParams.delete('patient_id');
            window.history.replaceState({}, '', url);
        }
    }, []);

    const gridKey =
        view === 'list'
            ? null
            : `${view}|${date}|${professionalId}|${refreshKey}`;
    const [grid, setGrid] = useState<{ key: string; data: GridData } | null>(
        null,
    );

    useEffect(() => {
        if (!gridKey) return;

        let cancelled = false;
        const [gridView, gridDate, userId] = gridKey.split('|');

        axios
            .get<GridData>('/api/appointments/grid', {
                params: {
                    view: gridView,
                    date: gridDate,
                    user_id: userId || undefined,
                },
            })
            .then((response) => {
                if (!cancelled) setGrid({ key: gridKey, data: response.data });
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [gridKey]);

    const loading = gridKey !== null && grid?.key !== gridKey;
    // Keep showing the previous data of the same view while the next loads.
    const data = grid && grid.data.view === view ? grid.data : null;

    function shift(direction: 1 | -1) {
        setDate((current) =>
            view === 'month'
                ? addMonths(current, direction)
                : addDays(current, direction * (view === 'day' ? 1 : 7)),
        );
    }

    function openBooking(bookingDate?: string, time?: string) {
        setBooking({
            key: Date.now(),
            preset: { date: bookingDate ?? date, time: time ?? '08:00' },
        });
    }

    function openEdit(appointmentId: string) {
        setSelected(null);
        axios.get(`/api/appointments/${appointmentId}`).then((response) => {
            setEditing(response.data);
            setEditSheetOpen(true);
        });
    }

    function confirmMissed(justified: boolean, reason: string) {
        if (!missed) return;

        router.post(
            `/appointments/${missed.appointment_id}/patients/${missed.patient_id}/status`,
            { status: 'missed', justified, reason },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setMissed(null);
                    refresh();
                },
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Agenda - Phisio" />

            <div className="mx-auto flex h-full w-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                        <h1 className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                            Agenda
                        </h1>
                        <p className="mt-1 text-muted-foreground first-letter:uppercase">
                            {view === 'list'
                                ? 'Todos os agendamentos'
                                : data
                                  ? periodLabel(data, date)
                                  : ' '}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setRemindersOpen(true)}
                            className="rounded-xl"
                        >
                            <MessageCircle className="size-4" />
                            Lembretes
                        </Button>
                        {can('appointments.settings.manage') && (
                            <Button
                                variant="outline"
                                onClick={() => setSettingsKey(Date.now())}
                                className="rounded-xl"
                            >
                                <Settings className="size-4" />
                                Configurações
                            </Button>
                        )}
                        {can('appointments.manage.create') && (
                            <Button
                                onClick={() => openBooking()}
                                className="rounded-xl"
                            >
                                <CalendarPlus className="size-4" />
                                Agendar horário
                            </Button>
                        )}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/50 bg-card/60 p-3 shadow-sm backdrop-blur-xl">
                    <div className="flex rounded-xl border border-border/50 bg-muted/50 p-1">
                        {VIEWS.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setView(item.key)}
                                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                                    view === item.key
                                        ? 'border border-border/50 bg-background text-primary shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setView('list')}
                            title="Lista de agendamentos"
                            className={`rounded-lg px-2.5 py-1.5 transition-all ${
                                view === 'list'
                                    ? 'border border-border/50 bg-background text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <List className="size-4" />
                        </button>
                    </div>

                    {view !== 'list' && (
                        <>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => shift(-1)}
                                    title="Anterior"
                                >
                                    <ChevronLeft className="size-4" />
                                </Button>
                                <div className="relative">
                                    <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) =>
                                            e.target.value &&
                                            setDate(e.target.value)
                                        }
                                        className="h-9 rounded-lg border border-border bg-background pr-2 pl-9 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                                        aria-label="Data"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => shift(1)}
                                    title="Próximo"
                                >
                                    <ChevronRight className="size-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDate(todayISO())}
                                    className="ml-1 text-xs font-semibold tracking-wider uppercase"
                                >
                                    Hoje
                                </Button>
                            </div>

                            <div className="relative min-w-[200px] flex-1">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar paciente ou profissional..."
                                    className="h-9 w-full rounded-lg border border-border bg-background pl-9 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                                />
                            </div>

                            {users.length > 1 && (
                                <select
                                    value={professionalId}
                                    onChange={(e) =>
                                        setProfessionalId(e.target.value)
                                    }
                                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                                    title="Filtrar por profissional"
                                >
                                    <option value="">
                                        Todos os profissionais
                                    </option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            )}

                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                {loading && (
                                    <Loader2 className="size-4 animate-spin" />
                                )}
                                {data && (
                                    <>
                                        <span>
                                            <strong className="text-foreground tabular-nums">
                                                {data.stats.classes}
                                            </strong>{' '}
                                            aulas
                                        </span>
                                        <span className="h-4 w-px bg-border" />
                                        <span>
                                            <strong className="text-foreground tabular-nums">
                                                {data.stats.occupancy}%
                                            </strong>{' '}
                                            ocupação
                                        </span>
                                        <span className="h-4 w-px bg-border" />
                                        <span>
                                            <strong className="text-foreground tabular-nums">
                                                {data.stats.checkins}
                                            </strong>{' '}
                                            check-ins
                                        </span>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Body */}
                {view === 'list' ? (
                    <AppointmentList
                        appointments={appointments}
                        filters={filters}
                        onOpen={openEdit}
                    />
                ) : !data ? (
                    <div className="flex flex-1 items-center justify-center rounded-2xl border border-border/50 bg-card/60 py-24">
                        <Loader2 className="size-8 animate-spin text-primary" />
                    </div>
                ) : view === 'month' ? (
                    <AgendaMonth
                        data={data}
                        anchor={date}
                        search={search}
                        onStudentClick={(student, day) =>
                            setSelected({ ...student, date: day })
                        }
                        onDayClick={(day) => {
                            setDate(day);
                            setView('day');
                        }}
                    />
                ) : (
                    <AgendaGrid
                        data={data}
                        search={search}
                        canCreate={can('appointments.manage.create')}
                        onStudentClick={(student, day) =>
                            setSelected({ ...student, date: day })
                        }
                        onSlotClick={openBooking}
                    />
                )}
            </div>

            {booking && (
                <AgendaBookingSheet
                    key={booking.key}
                    open
                    onOpenChange={(open) => !open && setBooking(null)}
                    patients={patients}
                    professionals={users}
                    defaultDuration={scheduleSettings.default_duration}
                    rooms={scheduleSettings.rooms ?? []}
                    preset={booking.preset}
                    onBooked={refresh}
                />
            )}

            {settingsKey !== null && (
                <AgendaSettingsDialog
                    key={settingsKey}
                    open
                    onOpenChange={(open) => !open && setSettingsKey(null)}
                    settings={scheduleSettings}
                    professionals={users}
                    onSaved={refresh}
                />
            )}

            {selected && (
                <AgendaStudentDialog
                    key={`${selected.appointment_id}-${selected.patient_id}`}
                    student={selected}
                    onClose={() => setSelected(null)}
                    onChanged={refresh}
                    onMarkMissed={(student) => {
                        setSelected(null);
                        setMissed(student);
                    }}
                    onEdit={openEdit}
                    reminderTemplate={reminderTemplate}
                    clinicName={clinicName}
                />
            )}

            {remindersOpen && (
                <AgendaRemindersSheet
                    open
                    onOpenChange={setRemindersOpen}
                    onChanged={refresh}
                />
            )}

            <MissedAttendanceModal
                open={missed !== null}
                patientName={missed?.patient_name}
                onConfirm={confirmMissed}
                onCancel={() => setMissed(null)}
            />

            <AppointmentFormSheet
                isOpen={editSheetOpen}
                setIsOpen={setEditSheetOpen}
                patients={patients}
                users={users}
                groupClasses={groupClasses}
                editingAppointment={editing}
                initialDate={date}
                initialTime="08:00"
                initialDuration={scheduleSettings.default_duration}
                onNewGroupClass={() => {
                    setEditSheetOpen(false);
                    setTimeout(() => setGroupClassSheetOpen(true), 300);
                }}
            />

            <GroupClassFormSheet
                isOpen={groupClassSheetOpen}
                setIsOpen={(open) => {
                    setGroupClassSheetOpen(open);
                    if (!open) {
                        router.reload({ only: ['groupClasses'] });
                    }
                }}
                patients={patients}
            />
        </AppLayout>
    );
}
