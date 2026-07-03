import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { router } from '@inertiajs/react';
import { useRef, useEffect } from 'react';

interface CalendarViewProps {
    onEventClick?: (eventId: string) => void;
    onDateSelect?: (startDate: string, startTime: string, durationMinutes?: number) => void;
    onEventDrop?: (eventId: string, newDate: string, newTime: string, isGroup?: boolean) => void;
    refreshTrigger?: any;
    userId?: string;
}

let isCalendarRestoring = false;

export default function CalendarView({ onEventClick, onDateSelect, onEventDrop, refreshTrigger, userId }: CalendarViewProps) {
    const calendarRef = useRef<FullCalendar>(null);

    useEffect(() => {
        // Tailwind styling adjustments dynamically applied if necessary
        // Mostly handled via CSS overrides in global CSS, but here's an anchor
    }, []);

    useEffect(() => {
        if (calendarRef.current && refreshTrigger !== undefined) {
            calendarRef.current.getApi().refetchEvents();
        }
    }, [refreshTrigger]);

    // Refetch when the professional filter changes (extraParams sends user_id).
    useEffect(() => {
        calendarRef.current?.getApi().refetchEvents();
    }, [userId]);

    const handleEventClick = (clickInfo: any) => {
        const eventId = clickInfo.event.id;
        if (onEventClick) {
            onEventClick(eventId);
        } else {
            router.visit(`/appointments/${eventId}`);
        }
    };

    const handleDateSelect = (selectInfo: any) => {
        // Prepare the dates
        const startDate = selectInfo.startStr.split('T')[0];
        const startTime = selectInfo.startStr.split('T')[1]?.substring(0, 5) || '08:00';
        
        // Calculate duration if the user dragged multiple slots
        let durationMinutes = 60; // Default
        if (selectInfo.start && selectInfo.end) {
            durationMinutes = Math.round((selectInfo.end.getTime() - selectInfo.start.getTime()) / 60000);
        }
        
        if (onDateSelect) {
            onDateSelect(startDate, startTime, durationMinutes);
        } else {
            const params = new URLSearchParams({
                date: startDate,
                time: startTime
            });
            router.visit(`/appointments/create?${params.toString()}`);
        }
    };

    return (
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-3 sm:p-6 shadow-sm calendar-container w-full h-[calc(100vh-200px)] min-h-[500px] flex flex-col">
            <style>{`
                /* Google Calendar Style Overrides for FullCalendar */
                .calendar-container .fc {
                    --fc-border-color: #dadce0;
                    --fc-button-text-color: #3c4043;
                    --fc-button-bg-color: transparent;
                    --fc-button-border-color: #dadce0;
                    --fc-button-hover-bg-color: #f1f3f4;
                    --fc-button-hover-border-color: #dadce0;
                    --fc-button-active-bg-color: #e8eaed;
                    --fc-button-active-border-color: #dadce0;
                    --fc-button-active-text-color: #202124;
                    --fc-event-bg-color: #3f51b5; /* Google default blue */
                    --fc-event-border-color: transparent;
                    --fc-event-text-color: #ffffff;
                    --fc-today-bg-color: transparent; /* Google uses no background, just the blue circle in header */
                    --fc-page-bg-color: transparent;
                    --fc-neutral-bg-color: #f1f3f4;
                    --fc-neutral-text-color: #70757a;
                    --fc-list-event-hover-bg-color: #f1f3f4;
                    --fc-now-indicator-color: #ea4335; /* Google Red */
                    color: #3c4043;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                
                /* Toolbar buttons */
                .calendar-container .fc-header-toolbar {
                    margin-bottom: 1rem !important;
                }
                
                .calendar-container .fc-button {
                    border-radius: 0.25rem;
                    padding: 0.35rem 0.75rem;
                    font-weight: 500;
                    text-transform: capitalize;
                    transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;
                    box-shadow: none !important;
                }
                
                .calendar-container .fc-button-primary {
                    border-color: var(--fc-button-border-color) !important;
                    background-color: var(--fc-button-bg-color) !important;
                    color: var(--fc-button-text-color) !important;
                }
                
                .calendar-container .fc-button-primary:hover {
                    background-color: var(--fc-button-hover-bg-color) !important;
                }
                
                .calendar-container .fc-button-primary:not(:disabled):active,
                .calendar-container .fc-button-primary:not(:disabled).fc-button-active {
                    background-color: var(--fc-button-active-bg-color) !important;
                    color: var(--fc-button-active-text-color) !important;
                }
                
                .calendar-container .fc-today-button {
                    margin-left: 1rem !important;
                }

                .calendar-container .fc-button-primary:focus {
                    box-shadow: none !important;
                }

                .calendar-container .fc-toolbar-title {
                    font-size: 1.375rem !important;
                    font-weight: 400 !important;
                    color: #3c4043;
                    margin-left: 0.5rem;
                }

                /* Header cells (DOM., SEG., etc) */
                .calendar-container .fc-theme-standard th {
                    border: none;
                    border-bottom: 1px solid var(--fc-border-color);
                    border-left: 1px solid var(--fc-border-color);
                    padding: 0;
                    background: transparent;
                    font-weight: 500;
                }
                .calendar-container .fc-theme-standard th:first-child {
                    border-left: none; /* Time axis header */
                }

                .calendar-container .fc-col-header-cell-cushion {
                    padding: 0 !important;
                    width: 100%;
                }

                /* Grid Lines */
                .calendar-container .fc-theme-standard td {
                    border-color: var(--fc-border-color);
                }
                .calendar-container .fc-timegrid-slot-minor {
                    border-top-style: none !important; /* Hide the minor slot line, or make it very light */
                }
                .calendar-container .fc-timegrid-slot-label-cushion {
                    font-size: 0.625rem;
                    color: #70757a;
                    padding-right: 0.5rem;
                    font-weight: 500;
                }
                .calendar-container .fc-timegrid-axis-cushion {
                    font-size: 0.625rem;
                    color: #70757a;
                }
                .calendar-container .fc-timegrid-divider {
                    display: none;
                }
                .calendar-container .fc-timegrid-slot {
                    height: 24px !important; /* Make each 30min block 24px, so 1h = 48px */
                }
                
                /* Remove border from the time axis column to match Google */
                .calendar-container .fc-theme-standard .fc-timegrid-axis {
                    border-left: none;
                    border-bottom: none;
                    border-top: none;
                }

                /* Events */
                .calendar-container .fc-event {
                    border-radius: 0.25rem;
                    padding: 0.1rem 0.25rem;
                    font-size: 0.75rem;
                    font-weight: 500;
                    box-shadow: none;
                    cursor: pointer;
                    overflow: hidden;
                    transition: opacity 0.2s, filter 0.2s;
                }
                
                .calendar-container .fc-event:hover {
                    filter: brightness(0.9);
                }

                .calendar-container .fc-timegrid-slot {
                    height: 0.25rem; /* Ultra ultra compact: 4px per 15min slot = 16px per hour */
                }
                
                /* Now Indicator */
                .calendar-container .fc-timegrid-now-indicator-line {
                    border-width: 2px 0 0;
                }
                .calendar-container .fc-timegrid-now-indicator-arrow {
                    border: none;
                    background-color: var(--fc-now-indicator-color);
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    margin-top: -6px;
                    margin-left: -6px;
                }

            `}</style>
            
            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={typeof window !== 'undefined' && window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek'}
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                locale={ptBrLocale}
                events={{
                    url: '/api/appointments/events',
                    extraParams: () => (userId ? { user_id: userId } : {}),
                }}
                selectable={true}
                editable={!!onEventDrop}
                eventDrop={(info) => {
                    if (onEventDrop) {
                        const newDate = info.event.startStr.split('T')[0];
                        const newTime = info.event.startStr.split('T')[1]?.substring(0, 5) || '08:00';
                        const isGroup = info.event.extendedProps.type === 'group';
                        onEventDrop(info.event.id, newDate, newTime, isGroup);
                    }
                }}
                selectMirror={true}
                dayMaxEvents={true}
                allDaySlot={false}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                expandRows={true}
                height="100%"
                stickyHeaderDates={true}
                eventClick={handleEventClick}
                eventDidMount={(info) => {
                    // Hover tooltip listing the patients of a group class.
                    if (info.event.extendedProps.type !== 'group') return;
                    const names = (info.event.extendedProps.patient_names as string[] | undefined) ?? [];
                    if (names.length === 0) {
                        info.el.setAttribute('title', `${info.event.title}\nSem alunos na turma`);
                        return;
                    }
                    info.el.setAttribute(
                        'title',
                        `${info.event.title} — ${names.length} aluno(s):\n• ${names.join('\n• ')}`,
                    );
                }}
                select={handleDateSelect}
                windowResize={(arg) => {
                    const api = arg.view.calendar;
                    if (window.innerWidth < 768) {
                        api.changeView('timeGridDay');
                    } else {
                        api.changeView('timeGridWeek');
                    }
                }}
                datesSet={(arg) => {
                    isCalendarRestoring = true;
                    setTimeout(() => {
                        const timegridBody = document.querySelector('.fc-timegrid-body');
                        if (timegridBody) {
                            const scroller = timegridBody.closest('.fc-scroller') as HTMLElement;
                            if (scroller) {
                                const savedScroll = localStorage.getItem('calendarScrollTop');
                                if (savedScroll !== null) {
                                    scroller.scrollTop = parseInt(savedScroll, 10);
                                }
                                
                                if (!scroller.hasAttribute('data-scroll-listener')) {
                                    scroller.setAttribute('data-scroll-listener', 'true');
                                    scroller.addEventListener('scroll', (e) => {
                                        if (isCalendarRestoring) return;
                                        const target = e.target as HTMLElement;
                                        localStorage.setItem('calendarScrollTop', target.scrollTop.toString());
                                    }, { passive: true });
                                }
                            }
                        }
                        
                        setTimeout(() => {
                            isCalendarRestoring = false;
                        }, 100);
                        
                    }, 50);
                }}
                nowIndicator={true}
                slotDuration="00:30:00"
                slotLabelInterval="01:00"
                dayHeaderContent={(args) => {
                    if (args.view.type === 'dayGridMonth') {
                        return (
                            <div className="py-2 text-sm font-medium text-gray-500 uppercase tracking-wider">
                                {args.date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                            </div>
                        );
                    }
                    // Custom Google-like header
                    const dayName = args.date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
                    const dayNumber = args.date.getDate();
                    const isToday = args.isToday;
                    
                    return (
                        <div className="flex flex-col items-center py-1">
                            <span className={`text-[11px] font-medium mb-1 tracking-wider ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                                {dayName}
                            </span>
                            <span className={`text-2xl font-normal w-[46px] h-[46px] flex items-center justify-center rounded-full transition-colors ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                                {dayNumber}
                            </span>
                        </div>
                    );
                }}
                eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    meridiem: false
                }}
                eventContent={(eventInfo) => {
                    const isGroup = eventInfo.event.extendedProps.type === 'group';
                    return (
                        <div className="px-1 w-full flex flex-col leading-none justify-center h-full">
                            <div className="flex items-start justify-between gap-1">
                                <span className="font-semibold text-xs truncate" title={eventInfo.event.title}>{eventInfo.event.title}</span>
                                {isGroup && (
                                    <span className="text-[9px] font-medium bg-white/20 px-1 rounded shrink-0 mt-0.5">
                                        {eventInfo.event.extendedProps.patient_count || 0}/{eventInfo.event.extendedProps.max_participants || 1}
                                    </span>
                                )}
                            </div>
                            <div className="text-[10px] opacity-80 truncate">{eventInfo.timeText}</div>
                        </div>
                    );
                }}
            />
        </div>
    );
}
