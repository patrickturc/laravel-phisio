import { CheckCircle2, Plus, Repeat, XCircle } from 'lucide-react';
import type { GridData, GridStudent } from '@/lib/agenda';
import {
    capacityToneClass,
    isClosedHour,
    matchesSearch,
    parseISODate,
    todayISO,
    WEEKDAY_SHORT,
} from '@/lib/agenda';

interface Props {
    data: GridData;
    search: string;
    canCreate: boolean;
    onStudentClick: (student: GridStudent, date: string) => void;
    onSlotClick: (date: string, time: string) => void;
}

const STATUS_CARD: Record<GridStudent['status'], string> = {
    scheduled: 'bg-card',
    attended: 'bg-emerald-50 dark:bg-emerald-950/30',
    missed: 'bg-amber-50 dark:bg-amber-950/30',
    cancelled: 'bg-card opacity-50',
};

function StudentCard({
    student,
    hour,
    onClick,
}: {
    student: GridStudent;
    hour: string;
    onClick: () => void;
}) {
    const struck =
        student.status === 'missed' || student.status === 'cancelled';

    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-lg border border-l-4 border-border/60 px-2 py-1.5 text-left shadow-xs transition-colors hover:border-border hover:bg-muted/40 ${STATUS_CARD[student.status]}`}
            style={{ borderLeftColor: student.color }}
            title={`${student.patient_name} — ${student.professional_name ?? ''}`}
        >
            <div className="flex items-center gap-1">
                <span
                    className={`truncate text-xs font-semibold ${struck ? 'line-through' : ''}`}
                >
                    {student.patient_name}
                </span>
                {student.status === 'attended' && (
                    <CheckCircle2 className="size-3 shrink-0 text-emerald-600" />
                )}
                {student.status === 'missed' && (
                    <XCircle className="size-3 shrink-0 text-amber-600" />
                )}
                {student.recurring && (
                    <Repeat className="ml-auto size-3 shrink-0 text-muted-foreground/60" />
                )}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
                {student.professional_name}
                {student.time !== hour && ` · ${student.time}`}
            </div>
            {student.group_class && (
                <div className="truncate text-[10px] font-medium text-primary">
                    {student.group_class}
                </div>
            )}
        </button>
    );
}

/**
 * Day / week agenda: hours down the side, days across, one card per student
 * coloured by professional, and the "x/6" occupancy of each time slot.
 */
export function AgendaGrid({
    data,
    search,
    canCreate,
    onStudentClick,
    onSlotClick,
}: Props) {
    const today = todayISO();
    const isWeek = data.days.length > 1;

    return (
        <div className="max-h-[calc(100vh-260px)] min-h-[420px] overflow-auto rounded-2xl border border-border/50 bg-card/60 shadow-sm backdrop-blur-xl">
            <div
                className={`grid ${isWeek ? 'min-w-[960px]' : ''}`}
                style={{
                    gridTemplateColumns: `64px repeat(${data.days.length}, minmax(0, 1fr))`,
                }}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 border-b border-border/50 bg-card" />
                {data.days.map((day) => {
                    const isToday = day.date === today;

                    return (
                        <div
                            key={day.date}
                            className={`sticky top-0 z-10 flex flex-col items-center gap-0.5 border-b border-l border-border/50 bg-card py-3 ${day.closed ? 'text-muted-foreground/60' : ''}`}
                        >
                            <span className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">
                                {WEEKDAY_SHORT[day.weekday]}
                            </span>
                            <span
                                className={`text-xl font-bold tabular-nums ${isToday ? 'text-primary' : ''}`}
                            >
                                {parseISODate(day.date).getDate()}
                            </span>
                            {isToday && (
                                <span className="size-1.5 rounded-full bg-primary" />
                            )}
                            {day.closed && (
                                <span className="text-[11px] text-muted-foreground">
                                    fechado
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* Rows */}
                {data.rows.map((hour) => (
                    <div key={hour} className="contents">
                        <div className="border-t border-border/50 px-2 pt-3 text-xs font-medium text-muted-foreground tabular-nums">
                            {hour}
                        </div>
                        {data.days.map((day) => {
                            const cell = data.cells[`${day.date}|${hour}`];
                            const students = (cell?.students ?? []).filter(
                                (student) => matchesSearch(student, search),
                            );
                            const count = cell?.count ?? 0;
                            const closed = isClosedHour(day, hour, data.breaks);
                            const hasRoom = count < data.capacity;

                            if (closed && students.length === 0) {
                                return (
                                    <div
                                        key={day.date}
                                        className="flex min-h-24 items-center justify-center border-t border-l border-border/50 bg-muted/20"
                                    >
                                        <span className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground/40">
                                            FECHADO
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={day.date}
                                    className="group relative flex min-h-24 flex-col gap-1.5 border-t border-l border-border/50 p-1.5"
                                >
                                    {students.map((student) => (
                                        <StudentCard
                                            key={`${student.appointment_id}-${student.patient_id}`}
                                            student={student}
                                            hour={hour}
                                            onClick={() =>
                                                onStudentClick(
                                                    student,
                                                    day.date,
                                                )
                                            }
                                        />
                                    ))}

                                    {students.length === 0 &&
                                        canCreate &&
                                        !closed && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onSlotClick(day.date, hour)
                                                }
                                                className="flex flex-1 items-center justify-center rounded-lg text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted/40 focus-visible:opacity-100"
                                            >
                                                Agendar neste horário
                                            </button>
                                        )}

                                    {count > 0 && (
                                        <div className="mt-auto flex items-center justify-between pt-1">
                                            <span
                                                className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${capacityToneClass(count, data.capacity)}`}
                                            >
                                                {count}/{data.capacity}
                                            </span>
                                            {canCreate && hasRoom && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onSlotClick(
                                                            day.date,
                                                            hour,
                                                        )
                                                    }
                                                    className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
                                                    title="Agendar neste horário"
                                                >
                                                    <Plus className="size-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
