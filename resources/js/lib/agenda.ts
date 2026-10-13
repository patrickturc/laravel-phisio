/**
 * Shared types and helpers of the agenda (grid, month view, booking form and
 * settings). Dates travel as local "YYYY-MM-DD" strings, never through
 * toISOString(), which would shift them a day in Brazil late in the evening.
 */

export type AgendaView = 'day' | 'week' | 'month' | 'list';

export type StudentStatus = 'scheduled' | 'attended' | 'missed' | 'cancelled';

export interface GridStudent {
    appointment_id: string;
    patient_id: string;
    patient_name: string;
    nickname: string | null;
    phone: string | null;
    professional_id: number;
    professional_name: string | null;
    color: string;
    status: StudentStatus;
    missed_justified: boolean;
    time: string;
    duration_minutes: number;
    type: 'individual' | 'group';
    group_class: string | null;
    room: string | null;
    recurring: boolean;
    /** WhatsApp reminder sent. */
    reminded: boolean;
    /** The patient confirmed they are coming. */
    confirmed: boolean;
}

export interface GridCell {
    count: number;
    students: GridStudent[];
}

export interface GridDay {
    date: string;
    weekday: number;
    closed: boolean;
    start: string;
    end: string;
}

export interface TimeRange {
    start: string;
    end: string;
}

export interface GridData {
    view: 'day' | 'week' | 'month';
    start: string;
    end: string;
    capacity: number;
    days: GridDay[];
    rows: string[];
    breaks: TimeRange[];
    cells: Record<string, GridCell>;
    stats: { classes: number; checkins: number; occupancy: number };
}

export interface BusinessHours {
    open: boolean;
    start: string;
    end: string;
}

export interface ScheduleSettings {
    business_hours: BusinessHours[];
    breaks: TimeRange[];
    slot_capacity: number;
    default_duration: number;
    rooms: string[];
}

/** Hours the professional takes bookings, per weekday (0 = Sunday). */
export type Availability = Record<string, number[]>;

export interface Professional {
    id: number;
    name: string;
    color: string;
    /** Null: takes bookings at any time. */
    availability?: Availability | null;
}

/** Whether the professional takes bookings on that weekday and time. */
export function isAvailable(
    professional: Professional,
    weekday: number,
    time: string,
): boolean {
    if (!professional.availability) return true;

    const hour = Number(time.slice(0, 2));

    return (professional.availability[String(weekday)] ?? []).includes(hour);
}

/** A student card together with the day it sits on. */
export type SelectedStudent = GridStudent & { date: string };

/** Index = JavaScript weekday (0 = Sunday). */
export const WEEKDAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
export const WEEKDAY_LONG = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
];
/** Brazilian week order, Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function toISODate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

export function parseISODate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
}

export function todayISO(): string {
    return toISODate(new Date());
}

export function addDays(value: string, days: number): string {
    const date = parseISODate(value);
    date.setDate(date.getDate() + days);

    return toISODate(date);
}

export function addMonths(value: string, months: number): string {
    const date = parseISODate(value);
    date.setDate(1);
    date.setMonth(date.getMonth() + months);

    return toISODate(date);
}

export function weekdayOf(value: string): number {
    return parseISODate(value).getDay();
}

/** "13/10" */
export function shortDate(value: string): string {
    const [, month, day] = value.split('-');

    return `${day}/${month}`;
}

/** Header label of the period shown, e.g. "12 – 18 de out. de 2026". */
export function periodLabel(
    data: Pick<GridData, 'view' | 'start' | 'end'>,
    anchor: string,
): string {
    const format = (value: string, options: Intl.DateTimeFormatOptions) =>
        parseISODate(value).toLocaleDateString('pt-BR', options);

    if (data.view === 'day') {
        return format(data.start, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }

    if (data.view === 'month') {
        return format(anchor, { month: 'long', year: 'numeric' });
    }

    const start = parseISODate(data.start);
    const end = parseISODate(data.end);
    const endLabel = format(data.end, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return start.getMonth() === end.getMonth()
        ? `${start.getDate()} – ${endLabel}`
        : `${format(data.start, { day: 'numeric', month: 'short' })} – ${endLabel}`;
}

function minutes(time: string): number {
    const [hours, mins] = time.split(':').map(Number);

    return hours * 60 + mins;
}

/** Whether the hour row starting at `hour` ("08:00") is outside opening hours. */
export function isClosedHour(
    day: GridDay,
    hour: string,
    breaks: TimeRange[],
): boolean {
    if (day.closed) return true;

    const at = minutes(hour);

    if (at < minutes(day.start) || at >= minutes(day.end)) return true;

    return breaks.some(
        (range) => at >= minutes(range.start) && at < minutes(range.end),
    );
}

/** Badge classes for "x/6": calm, getting full, full. */
export function capacityToneClass(count: number, capacity: number): string {
    if (count >= capacity) {
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    }

    if (count >= capacity - 1 && count > 0) {
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    }

    return 'bg-muted text-muted-foreground';
}

export const STATUS_LABELS: Record<StudentStatus, string> = {
    scheduled: 'Agendado',
    attended: 'Presente',
    missed: 'Faltou',
    cancelled: 'Cancelado',
};

function normalize(text: string): string {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Search by patient or professional name, accent-insensitive. */
export function matchesSearch(student: GridStudent, search: string): boolean {
    if (!search.trim()) return true;

    const term = normalize(search.trim());

    return (
        normalize(student.patient_name).includes(term) ||
        normalize(student.professional_name ?? '').includes(term)
    );
}

/** Weekday name used in messages, e.g. "terça-feira". */
const WEEKDAY_SPOKEN = [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado',
];

/**
 * Fill the clinic's reminder template for one class. Placeholders: {nome},
 * {primeiro_nome}, {data}, {horario}, {profissional}, {sala}, {clinica}.
 */
export function renderReminder(
    template: string,
    values: {
        name: string;
        nickname?: string | null;
        date: string;
        time: string;
        professional?: string | null;
        room?: string | null;
        clinic: string;
    },
): string {
    const filled: Record<string, string> = {
        nome: values.name,
        primeiro_nome: (values.nickname || values.name).trim().split(/\s+/)[0],
        data: `${WEEKDAY_SPOKEN[weekdayOf(values.date)]}, ${shortDate(values.date)}`,
        horario: values.time,
        profissional: values.professional ?? '',
        sala: values.room ?? '',
        clinica: values.clinic,
    };

    return template.replace(
        /\{(\w+)\}/g,
        (match, key: string) => filled[key] ?? match,
    );
}
