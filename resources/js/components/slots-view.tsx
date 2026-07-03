import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Users, User, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface SlotPatient {
    slot: number;
    name: string;
    id: string;
    status: string;
}

interface SlotEntry {
    time: string;
    appointment_id: string | null;
    type: 'individual' | 'group';
    title: string | null;
    max_participants: number;
    group_class_name: string | null;
    group_class_id?: string;
    color: string;
    patients: SlotPatient[];
    duration_minutes: number;
}

interface SlotsData {
    slots: Record<string, SlotEntry[]>;
    week_start: string;
    week_end: string;
}

interface SlotsViewProps {
    onEventClick?: (eventId: string) => void;
    onDateSelect?: (date: string, time: string, durationMinutes?: number) => void;
    refreshTrigger?: any;
    userId?: string;
}

const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

function formatDateShort(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

export default function SlotsView({ onEventClick, onDateSelect, refreshTrigger, userId }: SlotsViewProps) {
    const [weekStart, setWeekStart] = useState<string>(() => {
        const monday = getMonday(new Date());
        return monday.toISOString().split('T')[0];
    });
    const [data, setData] = useState<SlotsData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback((startDate: string) => {
        setLoading(true);
        axios.get('/api/appointments/slots-view', { params: { start_date: startDate, user_id: userId || undefined } })
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [userId]);

    useEffect(() => {
        fetchData(weekStart);
    }, [weekStart, fetchData]);

    useEffect(() => {
        if (refreshTrigger !== undefined) {
            fetchData(weekStart);
        }
    }, [refreshTrigger]);

    function prevWeek() {
        setWeekStart(prev => addDays(prev, -7));
    }

    function nextWeek() {
        setWeekStart(prev => addDays(prev, 7));
    }

    function goToday() {
        const monday = getMonday(new Date());
        setWeekStart(monday.toISOString().split('T')[0]);
    }

    // Build the 6 day columns (Mon-Sat)
    const dayDates = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

    // Collect all unique times across the week
    const allTimes = new Set<string>();
    if (data?.slots) {
        Object.values(data.slots).forEach(daySlots => {
            daySlots.forEach(slot => allTimes.add(slot.time));
        });
    }
    const sortedTimes = Array.from(allTimes).sort();

    // Build a lookup: date -> time -> SlotEntry[]
    const lookup: Record<string, Record<string, SlotEntry[]>> = {};
    if (data?.slots) {
        for (const [date, entries] of Object.entries(data.slots)) {
            if (!lookup[date]) lookup[date] = {};
            for (const entry of entries) {
                if (!lookup[date][entry.time]) lookup[date][entry.time] = [];
                lookup[date][entry.time].push(entry);
            }
        }
    }

    // For each time slot, find the max number of sub-rows needed across all days
    function getMaxSlotsForTime(time: string): number {
        let max = 0;
        for (const date of dayDates) {
            const entries = lookup[date]?.[time] || [];
            for (const entry of entries) {
                if (entry.max_participants > max) max = entry.max_participants;
            }
        }
        return Math.max(max, 1);
    }

    const isToday = (dateStr: string) => {
        const today = new Date();
        const d = new Date(dateStr + 'T12:00:00');
        return today.getFullYear() === d.getFullYear() && today.getMonth() === d.getMonth() && today.getDate() === d.getDate();
    };

    // Format week range for display
    const weekEndDisplay = addDays(weekStart, 5);
    const startParts = weekStart.split('-');
    const endParts = weekEndDisplay.split('-');
    const weekLabel = `${startParts[2]}/${startParts[1]} — ${endParts[2]}/${endParts[1]}/${endParts[0]}`;

    return (
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl shadow-sm overflow-hidden">
            {/* Week Navigation */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/50 bg-card/80">
                <div className="flex items-center gap-2">
                    <button
                        onClick={prevWeek}
                        className="p-2 rounded-xl hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground"
                        title="Semana anterior"
                    >
                        <ChevronLeft className="size-5" />
                    </button>
                    <button
                        onClick={nextWeek}
                        className="p-2 rounded-xl hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground"
                        title="Próxima semana"
                    >
                        <ChevronRight className="size-5" />
                    </button>
                    <button
                        onClick={goToday}
                        className="px-3 py-1.5 text-sm font-medium rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                        Hoje
                    </button>
                </div>

                <h2 className="text-lg font-semibold text-foreground tracking-tight">
                    {weekLabel}
                </h2>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <Users className="size-3.5" /> Turma
                    </span>
                    <span className="flex items-center gap-1.5">
                        <User className="size-3.5" /> Individual
                    </span>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="size-8 text-primary animate-spin" />
                </div>
            ) : sortedTimes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Users className="size-7 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-bold mb-1 text-foreground">Nenhuma turma ativa</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">Não há turmas com horários definidos para exibir.</p>
                </div>
            ) : (
                <div className="overflow-auto max-h-[calc(100vh-280px)]">
                    <table className="w-full border-collapse min-w-[800px]">
                        <thead className="sticky top-0 z-20">
                            <tr>
                                <th className="sticky left-0 z-30 bg-muted/95 backdrop-blur-md border-b border-r border-border/50 px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px] min-w-[80px]">
                                    Horário
                                </th>
                                {dayDates.map((date, i) => (
                                    <th
                                        key={date}
                                        className={`border-b border-r border-border/50 px-2 py-3 text-center last:border-r-0 transition-colors ${
                                            isToday(date) 
                                                ? 'bg-primary/5 backdrop-blur-md' 
                                                : 'bg-muted/95 backdrop-blur-md'
                                        }`}
                                    >
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className={`text-[11px] font-medium uppercase tracking-wider ${
                                                isToday(date) ? 'text-primary' : 'text-muted-foreground'
                                            }`}>
                                                {DAY_NAMES[i]}
                                            </span>
                                            <span className={`text-sm font-bold ${
                                                isToday(date) 
                                                    ? 'bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center' 
                                                    : 'text-foreground/80'
                                            }`}>
                                                {formatDateShort(date).split('/')[0]}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTimes.map((time, timeIdx) => {
                                const maxSlots = getMaxSlotsForTime(time);

                                return Array.from({ length: maxSlots }, (_, slotIdx) => (
                                    <tr
                                        key={`${time}-${slotIdx}`}
                                        className={`transition-colors ${
                                            slotIdx === 0 ? 'border-t border-border/60' : ''
                                        } hover:bg-muted/20`}
                                    >
                                        {/* Time + slot number */}
                                        <td className={`sticky left-0 z-10 backdrop-blur-sm border-r border-border/50 px-2 py-0 text-right whitespace-nowrap ${
                                            slotIdx === 0 ? 'border-t border-border/60' : ''
                                        } bg-card/90`}>
                                            <div className="flex items-center gap-1.5 justify-end">
                                                {slotIdx === 0 && (
                                                    <span className="text-sm font-bold text-foreground/90 tabular-nums">
                                                        {time}
                                                    </span>
                                                )}
                                                <span className="text-[11px] font-semibold text-muted-foreground/60 w-4 text-center tabular-nums">
                                                    {slotIdx + 1}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Day cells */}
                                        {dayDates.map((date) => {
                                            const entries = lookup[date]?.[time] || [];
                                            // Find the entry that has this slot
                                            let patientForSlot: SlotPatient | null = null;
                                            let entryForSlot: SlotEntry | null = null;

                                            for (const entry of entries) {
                                                if (slotIdx < entry.max_participants) {
                                                    entryForSlot = entry;
                                                    const patient = entry.patients.find(p => p.slot === slotIdx + 1);
                                                    if (patient) {
                                                        patientForSlot = patient;
                                                    }
                                                    break;
                                                }
                                            }

                                            const hasEntry = entryForSlot !== null;
                                            const isOccupied = patientForSlot !== null;
                                            const todayCol = isToday(date);

                                            return (
                                                <td
                                                    key={date}
                                                    className={`border-r border-border/30 last:border-r-0 px-1 py-0 h-[32px] ${
                                                        slotIdx === 0 ? 'border-t border-border/60' : 'border-t border-border/10'
                                                    } ${todayCol ? 'bg-primary/[0.02]' : ''} ${
                                                        hasEntry && !isOccupied ? 'cursor-pointer' : ''
                                                    }`}
                                                    onClick={() => {
                                                        if (entryForSlot?.appointment_id && onEventClick) {
                                                            onEventClick(entryForSlot.appointment_id);
                                                        } else if (onDateSelect) {
                                                            onDateSelect(date, time, entryForSlot?.duration_minutes || 50);
                                                        }
                                                    }}
                                                >
                                                    {isOccupied && patientForSlot ? (
                                                        <motion.div
                                                            initial={{ opacity: 0, x: -4 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: timeIdx * 0.02 + slotIdx * 0.01 }}
                                                            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md group cursor-pointer hover:bg-muted/40 transition-colors h-full"
                                                            title={`${patientForSlot.name} • ${entryForSlot?.group_class_name || entryForSlot?.title || 'Agendamento'}`}
                                                        >
                                                            <div
                                                                className="w-[3px] h-4 rounded-full shrink-0"
                                                                style={{ backgroundColor: entryForSlot?.color || '#3b82f6' }}
                                                            />
                                                            <span className={`text-xs font-medium truncate leading-tight ${
                                                                patientForSlot.status === 'attended' 
                                                                    ? 'text-emerald-700 dark:text-emerald-400' 
                                                                    : patientForSlot.status === 'missed'
                                                                    ? 'text-amber-700 dark:text-amber-400 line-through'
                                                                    : patientForSlot.status === 'cancelled'
                                                                    ? 'text-red-500 dark:text-red-400 line-through opacity-60'
                                                                    : 'text-foreground/90'
                                                            }`}>
                                                                {patientForSlot.name}
                                                            </span>
                                                        </motion.div>
                                                    ) : hasEntry ? (
                                                        <div
                                                            className="flex items-center h-full px-1.5 cursor-pointer group"
                                                            title={`Vaga disponível • ${entryForSlot?.group_class_name || entryForSlot?.title || ''}`}
                                                        >
                                                            <div
                                                                className="w-[3px] h-4 rounded-full shrink-0 opacity-20 group-hover:opacity-50 transition-opacity"
                                                                style={{ backgroundColor: entryForSlot?.color || '#3b82f6' }}
                                                            />
                                                        </div>
                                                    ) : null}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ));
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer summary */}
            {data && sortedTimes.length > 0 && (
                <div className="px-4 sm:px-6 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                        {sortedTimes.length} horário{sortedTimes.length !== 1 ? 's' : ''} • {
                            Object.values(data.slots).flat().reduce((sum, e) => sum + e.patients.length, 0)
                        } paciente{Object.values(data.slots).flat().reduce((sum, e) => sum + e.patients.length, 0) !== 1 ? 's' : ''} agendados
                    </span>
                    <span>
                        {Object.values(data.slots).flat().reduce((sum, e) => {
                            const occupied = e.patients.length;
                            const total = e.max_participants;
                            return sum + (total - occupied);
                        }, 0)} vagas disponíveis
                    </span>
                </div>
            )}
        </div>
    );
}
