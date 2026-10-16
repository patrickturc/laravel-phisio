import type { MouseEvent, ReactNode } from 'react';
import { openPatientDetails, patientDetailsHref } from '@/lib/patient-details';

/**
 * A link to a patient that opens their details in a modal over the current
 * screen. Ctrl/Cmd-click still opens it in a new tab.
 */
export function PatientLink({
    patientId,
    tab,
    className,
    title,
    children,
}: {
    patientId: string;
    tab?: string;
    className?: string;
    title?: string;
    children: ReactNode;
}) {
    function handleClick(event: MouseEvent<HTMLAnchorElement>) {
        if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.button !== 0
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        openPatientDetails(patientId, tab);
    }

    return (
        <a
            href={patientDetailsHref(patientId, tab)}
            onClick={handleClick}
            className={className}
            title={title}
        >
            {children}
        </a>
    );
}
