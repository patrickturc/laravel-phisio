import { usePage } from '@inertiajs/react';
import {
    Info,
    AlertTriangle,
    AlertOctagon,
    CheckCircle2,
    X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface Announcement {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'danger' | 'success';
}

export function SystemAnnouncementBanner() {
    const { announcements } = usePage<any>().props as {
        announcements?: Announcement[];
    };
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    useEffect(() => {
        if (!announcements || announcements.length === 0) return;

        try {
            const dismissed = announcements
                .filter(
                    (a) =>
                        localStorage.getItem(
                            `dismissed_announcement_${a.id}`,
                        ) === 'true',
                )
                .map((a) => a.id);
            setDismissedIds(dismissed);
        } catch {
            // Safe fallback if localStorage is unavailable
        }
    }, [announcements]);

    if (!announcements || announcements.length === 0) {
        return null;
    }

    const activeAnnouncements = announcements.filter(
        (a) => !dismissedIds.includes(a.id),
    );

    if (activeAnnouncements.length === 0) {
        return null;
    }

    const handleDismiss = (id: string) => {
        try {
            localStorage.setItem(`dismissed_announcement_${id}`, 'true');
        } catch {
            // Ignore storage errors
        }
        setDismissedIds((prev) => [...prev, id]);
    };

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'warning':
                return {
                    bg: 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200',
                    icon: AlertTriangle,
                    iconColor: 'text-amber-600 dark:text-amber-400',
                };
            case 'danger':
                return {
                    bg: 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200',
                    icon: AlertOctagon,
                    iconColor: 'text-rose-600 dark:text-rose-400',
                };
            case 'success':
                return {
                    bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
                    icon: CheckCircle2,
                    iconColor: 'text-emerald-600 dark:text-emerald-400',
                };
            case 'info':
            default:
                return {
                    bg: 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200',
                    icon: Info,
                    iconColor: 'text-blue-600 dark:text-blue-400',
                };
        }
    };

    return (
        <div className="flex w-full flex-col gap-1.5">
            {activeAnnouncements.map((announcement) => {
                const style = getTypeStyles(announcement.type);
                const IconComponent = style.icon;

                return (
                    <div
                        key={announcement.id}
                        className={`flex items-center justify-between rounded-md border px-4 py-2.5 text-xs shadow-xs sm:text-sm ${style.bg} transition-all duration-200`}
                    >
                        <div className="mr-2 flex flex-1 items-center gap-2.5">
                            <IconComponent
                                className={`h-4 w-4 shrink-0 ${style.iconColor}`}
                            />
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                <span className="font-semibold">
                                    {announcement.title}:
                                </span>
                                <span>{announcement.message}</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleDismiss(announcement.id)}
                            className="shrink-0 rounded p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                            aria-label="Dispensar aviso"
                        >
                            <X className="h-3.5 w-3.5 opacity-70 hover:opacity-100" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
