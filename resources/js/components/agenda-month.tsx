import type { GridData, GridStudent } from '@/lib/agenda';
import {
    matchesSearch,
    parseISODate,
    todayISO,
    WEEK_ORDER,
    WEEKDAY_SHORT,
} from '@/lib/agenda';

interface Props {
    data: GridData;
    /** Any date inside the month shown. */
    anchor: string;
    search: string;
    onStudentClick: (student: GridStudent, date: string) => void;
    onDayClick: (date: string) => void;
}

const VISIBLE_PER_DAY = 3;

/**
 * Month agenda: each day lists its first students in time order and a
 * "+N mais" link that opens the day.
 */
export function AgendaMonth({
    data,
    anchor,
    search,
    onStudentClick,
    onDayClick,
}: Props) {
    const today = todayISO();
    const month = parseISODate(anchor).getMonth();

    // Cells are keyed "date|hour" and already in time order within a day.
    const byDay: Record<string, GridStudent[]> = {};
    for (const [key, cell] of Object.entries(data.cells).sort(([a], [b]) =>
        a.localeCompare(b),
    )) {
        const date = key.slice(0, 10);
        byDay[date] = [
            ...(byDay[date] ?? []),
            ...cell.students.filter(
                (student) =>
                    student.status !== 'cancelled' &&
                    matchesSearch(student, search),
            ),
        ];
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-border/50 bg-card/60 shadow-sm backdrop-blur-xl">
            <div className="grid min-w-[760px] grid-cols-7">
                {WEEK_ORDER.map((weekday) => (
                    <div
                        key={weekday}
                        className="border-b border-border/50 py-2 text-center text-[11px] font-semibold tracking-[0.2em] text-muted-foreground"
                    >
                        {WEEKDAY_SHORT[weekday]}
                    </div>
                ))}

                {data.days.map((day) => {
                    const students = byDay[day.date] ?? [];
                    const hidden = students.length - VISIBLE_PER_DAY;
                    const outside = parseISODate(day.date).getMonth() !== month;

                    return (
                        <div
                            key={day.date}
                            className={`flex min-h-28 flex-col gap-1 border-b border-l border-border/50 p-1.5 [&:nth-child(7n+1)]:border-l-0 ${outside ? 'bg-muted/20 text-muted-foreground/60' : ''} ${day.closed && !outside ? 'bg-muted/10' : ''}`}
                        >
                            <button
                                type="button"
                                onClick={() => onDayClick(day.date)}
                                className={`w-fit rounded-md px-1.5 text-sm font-semibold tabular-nums hover:bg-muted ${day.date === today ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                            >
                                {parseISODate(day.date).getDate()}
                            </button>

                            {students
                                .slice(0, VISIBLE_PER_DAY)
                                .map((student) => (
                                    <button
                                        key={`${student.appointment_id}-${student.patient_id}`}
                                        type="button"
                                        onClick={() =>
                                            onStudentClick(student, day.date)
                                        }
                                        className="flex items-center gap-1.5 truncate rounded px-1 text-left text-[11px] hover:bg-muted/50"
                                    >
                                        <span
                                            className="size-2 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: student.color,
                                            }}
                                        />
                                        <span className="text-muted-foreground tabular-nums">
                                            {student.time}
                                        </span>
                                        <span className="truncate">
                                            {student.patient_name}
                                        </span>
                                    </button>
                                ))}

                            {hidden > 0 && (
                                <button
                                    type="button"
                                    onClick={() => onDayClick(day.date)}
                                    className="w-fit rounded px-1 text-[11px] font-medium text-primary hover:underline"
                                >
                                    +{hidden} mais
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
